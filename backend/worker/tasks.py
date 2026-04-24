import logging
import re
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
        pdf = fitz.open(stream=pdf_bytes, filetype="pdf")
        page = pdf[0]
        mat = fitz.Matrix(0.37, 0.37)
        pix = page.get_pixmap(matrix=mat, colorspace=fitz.csRGB)
        thumb_bytes = pix.tobytes("jpeg")
        pdf.close()
        key = f"{doc_id}_thumb.jpg"
        storage.upload_thumbnail(key, thumb_bytes)
        return key
    except Exception:
        logger.warning("ingest_document: thumbnail generation failed for %s", doc_id)
        return None


async def ingest_document(ctx: dict, document_id: str) -> None:
    doc_uuid = uuid.UUID(document_id)

    async with AsyncSessionLocal() as db:
        doc = await db.get(Document, doc_uuid)
        if not doc:
            logger.warning("ingest_document: document %s not found", document_id)
            return

        doc.ingestion_status = "processing"
        await db.commit()

        try:
            pdf_bytes = storage.download_pdf(doc.file_path)

            thumb_key = _generate_thumbnail(pdf_bytes, doc_uuid)
            if thumb_key:
                doc.thumb_path = thumb_key

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

            if not pages_text:
                logger.warning("ingest_document: no text layer in %s", document_id)
                doc.total_pages = total_pages
                doc.ingestion_status = "completed"
                await db.commit()
                return

            from sqlalchemy import delete
            await db.execute(delete(DocumentChunk).where(DocumentChunk.document_id == doc_uuid))

            chunk_index = 0
            vector_points = []

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

                    vector = await embed(content)
                    vector_points.append({
                        "id": f"chunk-{document_id}-{chunk_index}",
                        "values": vector,
                        "metadata": {
                            "user_id": str(doc.user_id) if doc.user_id else "",
                            "document_id": document_id,
                            "source_type": "chunk",
                            "page": page_num,
                            "chunk_index": chunk_index,
                            "content": content[:500],
                        },
                    })
                    chunk_index += 1

                    # Batch upsert every 20 chunks
                    if len(vector_points) >= 20:
                        await upsert(vector_points)
                        vector_points = []

            if vector_points:
                await upsert(vector_points)

            doc.total_pages = total_pages
            doc.ingestion_status = "completed"
            await db.commit()
            logger.info("ingest_document: %s done — %d chunks, %d pages", document_id, chunk_index, total_pages)

        except Exception:
            logger.exception("ingest_document: failed for %s", document_id)
            doc.ingestion_status = "failed"
            await db.commit()
            raise  # ARQ will retry


async def embed_highlight(ctx: dict, highlight_id: str) -> None:
    h_uuid = uuid.UUID(highlight_id)

    async with AsyncSessionLocal() as db:
        h = await db.get(Highlight, h_uuid)
        if not h:
            logger.warning("embed_highlight: highlight %s not found", highlight_id)
            return

        doc = await db.get(Document, h.document_id)

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
            logger.info("embed_highlight: %s done", highlight_id)

        except Exception:
            logger.exception("embed_highlight: failed for %s", highlight_id)
            h.embed_status = "failed"
            await db.commit()
            raise  # ARQ will retry
