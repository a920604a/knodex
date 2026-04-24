import logging
import re
import time
import uuid

import fitz  # PyMuPDF
import tiktoken

from app.database import AsyncSessionLocal
from app.models.chunk import DocumentChunk
from app.models.document import Document
from app.models.highlight import Highlight
from app.services import storage
from app.services.cf_ai import embed
from app.services.cf_vectorize import upsert

logger = logging.getLogger(__name__)

CHUNK_SIZE = 500
CHUNK_OVERLAP = 100
ENCODING = tiktoken.get_encoding("cl100k_base")


def _clean_text(text: str) -> str:
    text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _chunk_tokens(tokens: list[int]) -> list[list[int]]:
    chunks = []
    start = 0
    while start < len(tokens):
        end = min(start + CHUNK_SIZE, len(tokens))
        chunks.append(tokens[start:end])
        if end == len(tokens):
            break
        start += CHUNK_SIZE - CHUNK_OVERLAP
    return chunks


def _generate_thumbnail(pdf_bytes: bytes, doc_id: uuid.UUID) -> str | None:
    try:
        t0 = time.monotonic()
        pdf = fitz.open(stream=pdf_bytes, filetype="pdf")
        page = pdf[0]
        mat = fitz.Matrix(0.37, 0.37)
        pix = page.get_pixmap(matrix=mat, colorspace=fitz.csRGB)
        thumb_bytes = pix.tobytes("jpeg")
        pdf.close()
        key = f"{doc_id}_thumb.jpg"
        storage.upload_thumbnail(key, thumb_bytes)
        logger.info("[thumb] %s generated in %.2fs (%d bytes)", doc_id, time.monotonic() - t0, len(thumb_bytes))
        return key
    except Exception:
        logger.warning("[thumb] %s generation failed", doc_id, exc_info=True)
        return None


async def ingest_document(ctx: dict, document_id: str) -> None:
    doc_uuid = uuid.UUID(document_id)
    job_start = time.monotonic()

    async with AsyncSessionLocal() as db:
        doc = await db.get(Document, doc_uuid)
        if not doc:
            logger.warning("[ingest] %s — document not found", document_id)
            return

        title = doc.title
        file_path = doc.file_path
        user_id = doc.user_id
        logger.info("[ingest] %s START title=%r", document_id, title)

        doc.ingestion_status = "processing"
        await db.commit()

        try:
            # ── Phase 1: Download ────────────────────────────────────────────
            t0 = time.monotonic()
            pdf_bytes = storage.download_pdf(file_path)
            logger.info("[ingest] %s download=%.2fs size=%d bytes", document_id, time.monotonic() - t0, len(pdf_bytes))

            # ── Phase 2: Thumbnail ───────────────────────────────────────────
            thumb_key = _generate_thumbnail(pdf_bytes, doc_uuid)
            if thumb_key:
                doc = await db.get(Document, doc_uuid)
                doc.thumb_path = thumb_key
                await db.commit()
                logger.info("[ingest] %s thumb_path saved", document_id)

            # ── Phase 3: Text extraction ─────────────────────────────────────
            t0 = time.monotonic()
            pdf = fitz.open(stream=pdf_bytes, filetype="pdf")
            total_pages = len(pdf)

            pages_text: list[tuple[int, str]] = []
            for page_num in range(total_pages):
                page = pdf[page_num]
                raw = page.get_text()
                cleaned = _clean_text(raw)
                if cleaned:
                    pages_text.append((page_num + 1, cleaned))
            pdf.close()
            logger.info("[ingest] %s text_extract=%.2fs pages=%d text_pages=%d",
                        document_id, time.monotonic() - t0, total_pages, len(pages_text))

            if not pages_text:
                logger.warning("[ingest] %s no text layer (scanned PDF?)", document_id)
                doc = await db.get(Document, doc_uuid)
                doc.total_pages = total_pages
                doc.ingestion_status = "completed"
                await db.commit()
                logger.info("[ingest] %s DONE (no text) total=%.2fs", document_id, time.monotonic() - job_start)
                return

            # ── Phase 4: Chunking ────────────────────────────────────────────
            t0 = time.monotonic()
            from sqlalchemy import delete
            await db.execute(delete(DocumentChunk).where(DocumentChunk.document_id == doc_uuid))

            chunk_index = 0
            vector_points = []
            embed_errors = 0

            for page_num, text in pages_text:
                tokens = ENCODING.encode(text)
                token_groups = _chunk_tokens(tokens)
                for token_group in token_groups:
                    content = ENCODING.decode(token_group)
                    db.add(DocumentChunk(
                        document_id=doc_uuid,
                        content=content,
                        chunk_index=chunk_index,
                        page=page_num,
                    ))

                    # ── Phase 5: Embedding ───────────────────────────────────
                    try:
                        vector = await embed(content)
                        vector_points.append({
                            "id": f"chunk-{document_id}-{chunk_index}",
                            "values": vector,
                            "metadata": {
                                "user_id": str(user_id) if user_id else "",
                                "document_id": document_id,
                                "source_type": "chunk",
                                "page": page_num,
                                "chunk_index": chunk_index,
                                "content": content[:500],
                            },
                        })
                    except Exception:
                        embed_errors += 1
                        logger.warning("[ingest] %s embed failed chunk=%d", document_id, chunk_index, exc_info=True)

                    chunk_index += 1

                    if len(vector_points) >= 20:
                        await upsert(vector_points)
                        logger.debug("[ingest] %s vectorize upsert batch chunks=%d", document_id, len(vector_points))
                        vector_points = []

            if vector_points:
                await upsert(vector_points)

            logger.info("[ingest] %s chunks=%d embed_errors=%d chunk_phase=%.2fs",
                        document_id, chunk_index, embed_errors, time.monotonic() - t0)

            # ── Finalize ─────────────────────────────────────────────────────
            doc = await db.get(Document, doc_uuid)
            doc.total_pages = total_pages
            doc.ingestion_status = "completed"
            await db.commit()

            logger.info("[ingest] %s DONE title=%r chunks=%d pages=%d total=%.2fs",
                        document_id, title, chunk_index, total_pages, time.monotonic() - job_start)

        except Exception:
            logger.exception("[ingest] %s FAILED after %.2fs", document_id, time.monotonic() - job_start)
            doc = await db.get(Document, doc_uuid)
            doc.ingestion_status = "failed"
            await db.commit()
            raise


async def embed_highlight(ctx: dict, highlight_id: str) -> None:
    h_uuid = uuid.UUID(highlight_id)
    t_start = time.monotonic()

    async with AsyncSessionLocal() as db:
        h = await db.get(Highlight, h_uuid)
        if not h:
            logger.warning("[embed_highlight] %s — not found", highlight_id)
            return

        doc = await db.get(Document, h.document_id)
        logger.info("[embed_highlight] %s START text=%r", highlight_id, h.text[:60])

        try:
            vector = await embed(h.text)
            await upsert([{
                "id": f"highlight-{highlight_id}",
                "values": vector,
                "metadata": {
                    "user_id": str(doc.user_id) if doc and doc.user_id else "",
                    "document_id": str(h.document_id),
                    "source_type": "highlight",
                    "page": h.page,
                    "highlight_id": highlight_id,
                    "content": h.text[:500],
                },
            }])

            h.embed_status = "done"
            await db.commit()
            logger.info("[embed_highlight] %s DONE in %.2fs", highlight_id, time.monotonic() - t_start)

        except Exception:
            logger.exception("[embed_highlight] %s FAILED after %.2fs", highlight_id, time.monotonic() - t_start)
            h.embed_status = "failed"
            await db.commit()
            raise
