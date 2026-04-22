import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.tag import TagCreate, TagOut, TagTree
from app.services import tag_service

router = APIRouter(prefix="/tags", tags=["tags"])


@router.post("", response_model=TagOut, status_code=201)
async def create_tag(body: TagCreate, db: AsyncSession = Depends(get_db)):
    return await tag_service.create_tag(db, body)


@router.get("/tree", response_model=list[TagTree])
async def get_tag_tree(db: AsyncSession = Depends(get_db)):
    return await tag_service.get_tag_tree(db)


@router.get("", response_model=list[TagOut])
async def list_tags(db: AsyncSession = Depends(get_db)):
    return await tag_service.list_tags(db)


@router.delete("/{tag_id}", status_code=204)
async def delete_tag(
    tag_id: uuid.UUID,
    cascade: bool = Query(False),
    db: AsyncSession = Depends(get_db),
):
    await tag_service.delete_tag(db, tag_id, cascade)
