import uuid
from datetime import datetime, timezone
from pathlib import Path

from fastapi import HTTPException, UploadFile
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.document import Document
from app.models.document_tag import DocumentTag, DocumentTagLink
from app.schemas.document import ProgressUpdate
from app.services import storage


async def get_user_document_count(db: AsyncSession, user_id: uuid.UUID) -> int:
    result = await db.execute(
        select(func.count()).where(Document.user_id == user_id)
    )
    return result.scalar_one()


async def create_document(db: AsyncSession, file: UploadFile, user_id: uuid.UUID) -> Document:
    content = await file.read()
    title = Path(file.filename or "untitled").stem

    existing = await db.execute(
        select(Document.id).where(Document.user_id == user_id, Document.title == title)
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(status_code=409, detail=f"「{title}」已存在")

    key = storage.upload_pdf(content, file.filename or "upload.pdf")

    doc = Document(title=title, file_path=key, user_id=user_id, ingestion_status="pending")
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    doc.document_tags = []
    return doc


async def _load_document(db: AsyncSession, doc_id: uuid.UUID, user_id: uuid.UUID | None = None) -> Document:
    stmt = (
        select(Document)
        .options(selectinload(Document.tag_links).selectinload(DocumentTagLink.tag))
        .where(Document.id == doc_id)
    )
    if user_id is not None:
        stmt = stmt.where(Document.user_id == user_id)

    result = await db.execute(stmt)
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return _attach_tags(doc)


def _attach_tags(doc: Document) -> Document:
    doc.document_tags = [link.tag for link in doc.tag_links]
    return doc


async def list_documents(
    db: AsyncSession,
    user_id: uuid.UUID,
    document_tag_id: uuid.UUID | None = None,
) -> list[Document]:
    stmt = (
        select(Document)
        .options(selectinload(Document.tag_links).selectinload(DocumentTagLink.tag))
        .where(Document.user_id == user_id)
    )

    if document_tag_id:
        tag = await db.get(DocumentTag, document_tag_id)
        if not tag:
            raise HTTPException(status_code=404, detail="Document tag not found")
        stmt = stmt.join(Document.tag_links).where(DocumentTagLink.tag_id == document_tag_id)

    result = await db.execute(stmt.order_by(Document.updated_at.desc()))
    docs = list(result.scalars().unique().all())
    for doc in docs:
        _attach_tags(doc)
    return docs


async def get_document(db: AsyncSession, doc_id: uuid.UUID, user_id: uuid.UUID | None = None) -> Document:
    return await _load_document(db, doc_id, user_id)


async def update_progress(
    db: AsyncSession, doc_id: uuid.UUID, body: ProgressUpdate, user_id: uuid.UUID | None = None
) -> Document:
    doc = await get_document(db, doc_id, user_id)

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
    return await _load_document(db, doc_id, user_id)


async def add_document_tag(
    db: AsyncSession, doc_id: uuid.UUID, tag_id: uuid.UUID, user_id: uuid.UUID | None = None
) -> Document:
    doc = await get_document(db, doc_id, user_id)
    tag = await db.get(DocumentTag, tag_id)
    if not tag:
        raise HTTPException(status_code=404, detail="Document tag not found")

    existing = await db.execute(
        select(DocumentTagLink).where(
            DocumentTagLink.document_id == doc_id,
            DocumentTagLink.tag_id == tag_id,
        )
    )
    link = existing.scalar_one_or_none()
    if not link:
        db.add(DocumentTagLink(document_id=doc_id, tag_id=tag_id))

    doc.updated_at = datetime.now(timezone.utc)
    await db.commit()
    return await _load_document(db, doc_id, user_id)


async def remove_document_tag(
    db: AsyncSession, doc_id: uuid.UUID, tag_id: uuid.UUID, user_id: uuid.UUID | None = None
) -> None:
    doc = await get_document(db, doc_id, user_id)

    result = await db.execute(
        select(DocumentTagLink).where(
            DocumentTagLink.document_id == doc_id,
            DocumentTagLink.tag_id == tag_id,
        )
    )
    link = result.scalar_one_or_none()
    if not link:
        raise HTTPException(status_code=404, detail="Document tag link not found")

    doc.updated_at = datetime.now(timezone.utc)
    await db.delete(link)
    await db.commit()
