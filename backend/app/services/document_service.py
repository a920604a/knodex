import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import Document
from app.schemas.document import ProgressUpdate
from app.services import storage


async def save_pdf(file: UploadFile) -> tuple[str, str]:
    content = await file.read()
    key = storage.upload_pdf(content, file.filename or "upload.pdf")
    title = Path(file.filename or "untitled").stem
    return key, title


async def create_document(db: AsyncSession, file: UploadFile) -> Document:
    key, title = await save_pdf(file)
    doc = Document(title=title, file_path=key)
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    return doc


async def list_documents(db: AsyncSession) -> list[Document]:
    result = await db.execute(select(Document).order_by(Document.created_at.desc()))
    return list(result.scalars().all())


async def get_document(db: AsyncSession, doc_id: uuid.UUID) -> Document:
    result = await db.execute(select(Document).where(Document.id == doc_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


async def update_progress(db: AsyncSession, doc_id: uuid.UUID, body: ProgressUpdate) -> Document:
    doc = await get_document(db, doc_id)

    if body.status == "done":
        doc.progress = 1.0
        doc.status = "done"
    else:
        if body.page is not None:
            if doc.total_pages and body.page > doc.total_pages:
                raise HTTPException(status_code=400, detail="page exceeds total_pages")
            if doc.total_pages:
                doc.progress = body.page / doc.total_pages
        if body.status is not None:
            doc.status = body.status

    await db.commit()
    await db.refresh(doc)
    return doc
