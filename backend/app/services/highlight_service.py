import uuid

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.document import Document
from app.models.highlight import Highlight
from app.models.tag import HighlightTag, Tag
from app.schemas.highlight import HighlightCreate, HighlightPatch


async def _load_highlight(db: AsyncSession, highlight_id: uuid.UUID) -> Highlight:
    result = await db.execute(
        select(Highlight)
        .options(selectinload(Highlight.tag_links).selectinload(HighlightTag.tag))
        .where(Highlight.id == highlight_id)
    )
    h = result.scalar_one_or_none()
    if not h:
        raise HTTPException(status_code=404, detail="Highlight not found")
    return h


def _attach_tags(highlight: Highlight) -> Highlight:
    highlight.tags = [link.tag for link in highlight.tag_links]
    return highlight


async def create_highlight(
    db: AsyncSession, body: HighlightCreate, user_id: uuid.UUID | None = None
) -> Highlight:
    stmt = select(Document).where(Document.id == body.document_id)
    if user_id is not None:
        stmt = stmt.where(Document.user_id == user_id)
    result = await db.execute(stmt)
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    h = Highlight(**body.model_dump())
    db.add(h)
    await db.commit()
    h = await _load_highlight(db, h.id)
    return _attach_tags(h)


async def list_highlights(
    db: AsyncSession,
    document_id: uuid.UUID | None,
    q: str | None,
    tag: str | None,
    tag_id: uuid.UUID | None,
    user_id: uuid.UUID | None = None,
) -> list[Highlight]:
    stmt = (
        select(Highlight)
        .options(selectinload(Highlight.tag_links).selectinload(HighlightTag.tag))
        .join(Highlight.document)
    )

    if user_id is not None:
        stmt = stmt.where(Document.user_id == user_id)

    if document_id:
        stmt = stmt.where(Highlight.document_id == document_id).order_by(
            Highlight.page, Highlight.start_offset
        )
    else:
        stmt = stmt.order_by(Highlight.created_at.desc())

    if q:
        pattern = f"%{q}%"
        stmt = stmt.where(
            Highlight.text.ilike(pattern) | Highlight.note.ilike(pattern)
        )

    if tag:
        stmt = stmt.join(Highlight.tag_links).join(HighlightTag.tag).where(Tag.name == tag)
    elif tag_id:
        stmt = stmt.join(Highlight.tag_links).where(HighlightTag.tag_id == tag_id)

    result = await db.execute(stmt)
    highlights = list(result.scalars().unique().all())
    for h in highlights:
        _attach_tags(h)
    return highlights


async def get_highlight(
    db: AsyncSession, highlight_id: uuid.UUID, user_id: uuid.UUID | None = None
) -> Highlight:
    h = await _load_highlight(db, highlight_id)
    if user_id is not None:
        doc = await db.get(Document, h.document_id)
        if not doc or doc.user_id != user_id:
            raise HTTPException(status_code=404, detail="Highlight not found")
    return _attach_tags(h)


async def patch_highlight(
    db: AsyncSession, highlight_id: uuid.UUID, body: HighlightPatch, user_id: uuid.UUID | None = None
) -> Highlight:
    await get_highlight(db, highlight_id, user_id)
    h = await _load_highlight(db, highlight_id)
    h.note = body.note
    await db.commit()
    h = await _load_highlight(db, highlight_id)
    return _attach_tags(h)


async def delete_highlight(db: AsyncSession, highlight_id: uuid.UUID) -> None:
    h = await db.get(Highlight, highlight_id)
    if not h:
        raise HTTPException(status_code=404, detail="Highlight not found")
    await db.delete(h)
    await db.commit()


async def add_tags(db: AsyncSession, highlight_id: uuid.UUID, tag_ids: list[uuid.UUID]) -> Highlight:
    h = await db.get(Highlight, highlight_id)
    if not h:
        raise HTTPException(status_code=404, detail="Highlight not found")

    existing = await db.execute(
        select(HighlightTag.tag_id).where(HighlightTag.highlight_id == highlight_id)
    )
    existing_ids = {row[0] for row in existing.all()}

    for tid in tag_ids:
        if tid not in existing_ids:
            db.add(HighlightTag(highlight_id=highlight_id, tag_id=tid))

    await db.commit()
    h = await _load_highlight(db, highlight_id)
    return _attach_tags(h)


async def remove_tag(db: AsyncSession, highlight_id: uuid.UUID, tag_id: uuid.UUID) -> None:
    result = await db.execute(
        select(HighlightTag).where(
            HighlightTag.highlight_id == highlight_id,
            HighlightTag.tag_id == tag_id,
        )
    )
    link = result.scalar_one_or_none()
    if not link:
        raise HTTPException(status_code=404, detail="Tag link not found")
    await db.delete(link)
    await db.commit()
