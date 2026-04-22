import uuid

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.tag import Tag
from app.schemas.tag import TagCreate, TagTree


async def create_tag(db: AsyncSession, body: TagCreate) -> Tag:
    if body.parent_id:
        parent = await db.get(Tag, body.parent_id)
        if not parent:
            raise HTTPException(status_code=404, detail="Parent tag not found")

    tag = Tag(name=body.name, parent_id=body.parent_id)
    db.add(tag)
    try:
        await db.commit()
        await db.refresh(tag)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="Tag name already exists under this parent")
    return tag


async def list_tags(db: AsyncSession) -> list[Tag]:
    result = await db.execute(select(Tag).order_by(Tag.name))
    return list(result.scalars().all())


async def get_tag_tree(db: AsyncSession) -> list[TagTree]:
    result = await db.execute(select(Tag))
    all_tags = list(result.scalars().all())

    by_id: dict[uuid.UUID, TagTree] = {}
    for t in all_tags:
        by_id[t.id] = TagTree(id=t.id, name=t.name, parent_id=t.parent_id)

    roots: list[TagTree] = []
    for node in by_id.values():
        if node.parent_id and node.parent_id in by_id:
            by_id[node.parent_id].children.append(node)
        else:
            roots.append(node)

    return roots


async def delete_tag(db: AsyncSession, tag_id: uuid.UUID, cascade: bool) -> None:
    tag = await db.get(Tag, tag_id)
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")

    children = await db.execute(select(Tag).where(Tag.parent_id == tag_id))
    child_list = list(children.scalars().all())

    if child_list and not cascade:
        raise HTTPException(
            status_code=409,
            detail="Tag has children. Use ?cascade=true to delete recursively.",
        )

    if cascade:
        await _delete_recursive(db, tag_id)
    else:
        await db.delete(tag)
        await db.commit()


async def _delete_recursive(db: AsyncSession, tag_id: uuid.UUID) -> None:
    children = await db.execute(select(Tag).where(Tag.parent_id == tag_id))
    for child in children.scalars().all():
        await _delete_recursive(db, child.id)

    tag = await db.get(Tag, tag_id)
    if tag:
        await db.delete(tag)

    await db.commit()
