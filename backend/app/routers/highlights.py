import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.highlight import HighlightCreate, HighlightOut, HighlightPatch, HighlightTagsAdd
from app.services import highlight_service

router = APIRouter(prefix="/highlights", tags=["highlights"])


@router.post("", response_model=HighlightOut, status_code=201)
async def create_highlight(
    body: HighlightCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    h = await highlight_service.create_highlight(db, body, current_user.id)
    # Enqueue embed task
    from app.main import arq_pool
    if arq_pool:
        await arq_pool.enqueue_job("embed_highlight", str(h.id))
    return h


@router.get("", response_model=list[HighlightOut])
async def list_highlights(
    document_id: uuid.UUID | None = Query(None),
    q: str | None = Query(None),
    tag: str | None = Query(None),
    tag_id: uuid.UUID | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await highlight_service.list_highlights(db, document_id, q, tag, tag_id, current_user.id)


@router.get("/{highlight_id}", response_model=HighlightOut)
async def get_highlight(
    highlight_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await highlight_service.get_highlight(db, highlight_id, current_user.id)


@router.patch("/{highlight_id}", response_model=HighlightOut)
async def patch_highlight(
    highlight_id: uuid.UUID,
    body: HighlightPatch,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await highlight_service.patch_highlight(db, highlight_id, body, current_user.id)


@router.delete("/{highlight_id}", status_code=204)
async def delete_highlight(
    highlight_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    h = await highlight_service.get_highlight(db, highlight_id, current_user.id)
    from app.services.cf_vectorize import delete_vectors
    await delete_vectors([f"highlight-{highlight_id}"])
    await highlight_service.delete_highlight(db, highlight_id)


@router.post("/{highlight_id}/tags", response_model=HighlightOut)
async def add_tags(
    highlight_id: uuid.UUID,
    body: HighlightTagsAdd,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await highlight_service.add_tags(db, highlight_id, body.tag_ids)


@router.delete("/{highlight_id}/tags/{tag_id}", status_code=204)
async def remove_tag(
    highlight_id: uuid.UUID,
    tag_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await highlight_service.remove_tag(db, highlight_id, tag_id)
