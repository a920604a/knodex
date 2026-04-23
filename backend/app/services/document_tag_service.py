import uuid

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document_tag import DocumentTag
from app.schemas.document_tag import DocumentTagCreate, DocumentTagTree

DEFAULT_DOCUMENT_TAGS = (
    "技術",
    "產品",
    "設計",
    "商業",
    "研究",
    "教學",
    "案例",
    "未分類",
    "AI",
    "Data",
    "自動化",
)


async def ensure_default_tags(db: AsyncSession) -> None:
    result = await db.execute(
        select(DocumentTag.name).where(
            DocumentTag.name.in_(DEFAULT_DOCUMENT_TAGS),
            DocumentTag.parent_id.is_(None),
        )
    )
    existing = {row[0] for row in result.all()}
    missing = [name for name in DEFAULT_DOCUMENT_TAGS if name not in existing]
    if missing:
        db.add_all(DocumentTag(name=name) for name in missing)
        await db.commit()


async def create_tag(db: AsyncSession, body: DocumentTagCreate) -> DocumentTag:
    if body.parent_id:
        parent = await db.get(DocumentTag, body.parent_id)
        if not parent:
            raise HTTPException(status_code=404, detail="Parent document tag not found")

    tag = DocumentTag(name=body.name, parent_id=body.parent_id)
    db.add(tag)
    try:
        await db.commit()
        await db.refresh(tag)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="Document tag name already exists under this parent")
    return tag


async def list_tags(db: AsyncSession) -> list[DocumentTag]:
    result = await db.execute(select(DocumentTag).order_by(DocumentTag.name))
    return list(result.scalars().all())


async def get_tag_tree(db: AsyncSession) -> list[DocumentTagTree]:
    result = await db.execute(select(DocumentTag))
    all_tags = list(result.scalars().all())

    by_id: dict[uuid.UUID, DocumentTagTree] = {}
    for tag in all_tags:
        by_id[tag.id] = DocumentTagTree(id=tag.id, name=tag.name, parent_id=tag.parent_id)

    roots: list[DocumentTagTree] = []
    for node in by_id.values():
        if node.parent_id and node.parent_id in by_id:
            by_id[node.parent_id].children.append(node)
        else:
            roots.append(node)

    return roots


async def get_tag_or_404(db: AsyncSession, tag_id: uuid.UUID) -> DocumentTag:
    tag = await db.get(DocumentTag, tag_id)
    if not tag:
        raise HTTPException(status_code=404, detail="Document tag not found")
    return tag


async def delete_tag(db: AsyncSession, tag_id: uuid.UUID, cascade: bool) -> None:
    tag = await get_tag_or_404(db, tag_id)

    children = await db.execute(select(DocumentTag).where(DocumentTag.parent_id == tag_id))
    child_list = list(children.scalars().all())
    if child_list and not cascade:
        raise HTTPException(
            status_code=409,
            detail="Document tag has children. Use ?cascade=true to delete recursively.",
        )

    if cascade:
        await _delete_recursive(db, tag_id)
    else:
        await db.delete(tag)
        await db.commit()


async def _delete_recursive(db: AsyncSession, tag_id: uuid.UUID) -> None:
    children = await db.execute(select(DocumentTag).where(DocumentTag.parent_id == tag_id))
    for child in children.scalars().all():
        await _delete_recursive(db, child.id)

    tag = await db.get(DocumentTag, tag_id)
    if tag:
        await db.delete(tag)

    await db.commit()
