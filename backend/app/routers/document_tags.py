import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.document_tag import DocumentTagCreate, DocumentTagOut, DocumentTagTree
from app.services import document_tag_service

router = APIRouter(prefix="/document-tags", tags=["document-tags"])


@router.post("", response_model=DocumentTagOut, status_code=201)
async def create_tag(body: DocumentTagCreate, db: AsyncSession = Depends(get_db)):
    return await document_tag_service.create_tag(db, body)


@router.get("/tree", response_model=list[DocumentTagTree])
async def get_tag_tree(db: AsyncSession = Depends(get_db)):
    return await document_tag_service.get_tag_tree(db)


@router.get("", response_model=list[DocumentTagOut])
async def list_tags(db: AsyncSession = Depends(get_db)):
    return await document_tag_service.list_tags(db)


@router.delete("/{tag_id}", status_code=204)
async def delete_tag(
    tag_id: uuid.UUID,
    cascade: bool = Query(False),
    db: AsyncSession = Depends(get_db),
):
    await document_tag_service.delete_tag(db, tag_id, cascade)
