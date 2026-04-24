import logging
import re
import uuid

import fitz  # PyMuPDF
import tiktoken

from app.database import AsyncSessionLocal
from app.models.chunk import DocumentChunk
from app.models.document import Document
from app.services import storage

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
        mat = fitz.Matrix(0.37, 0.37)  # ~180px wide from A4 @ 72dpi
        pix = page.get_pixmap(matrix=mat, colorspace=fitz.csRGB)
        thumb_bytes = pix.tobytes("jpeg")
        pdf.close()
        key = f"{doc_id}_thumb.jpg"
        storage.upload_thumbnail(key, thumb_bytes)
        return key
    except Exception:
        logger.warning("Ingestion: thumbnail generation failed for document %s", doc_id)
        return None


async def run_ingestion(document_id: str) -> None:
    doc_uuid = uuid.UUID(document_id)
    async with AsyncSessionLocal() as db:
        try:
            doc = await db.get(Document, doc_uuid)
            if not doc:
                logger.warning("Ingestion: document %s not found", document_id)
                return

            try:
                pdf_bytes = storage.download_pdf(doc.file_path)
            except Exception:
                logger.error("Ingestion: PDF not found in storage for key %s", doc.file_path)
                return

            pdf = fitz.open(stream=pdf_bytes, filetype="pdf")
            total_pages = len(pdf)

            # Generate thumbnail from first page
            thumb_key = _generate_thumbnail(pdf_bytes, doc_uuid)
            if thumb_key:
                doc.thumb_path = thumb_key

            # Extract text per page
            pages_text: list[tuple[int, str]] = []
            for page_num in range(total_pages):
                page = pdf[page_num]
                raw = page.get_text()
                cleaned = _clean_text(raw)
                if cleaned:
                    pages_text.append((page_num + 1, cleaned))

            pdf.close()

            if not pages_text:
                logger.warning("Ingestion: no text layer found in document %s (scanned PDF?)", document_id)
                doc.total_pages = total_pages
                await db.commit()
                return

            # Delete existing chunks (idempotent)
            from sqlalchemy import delete
            await db.execute(delete(DocumentChunk).where(DocumentChunk.document_id == doc_uuid))

            # Build chunks across pages, tracking page source
            chunk_index = 0
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
                    chunk_index += 1

            doc.total_pages = total_pages
            await db.commit()
            logger.info("Ingestion: document %s processed — %d chunks, %d pages", document_id, chunk_index, total_pages)

        except Exception:
            logger.exception("Ingestion failed for document %s", document_id)
