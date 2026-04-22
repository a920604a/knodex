from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.document import Document
from app.models.highlight import Highlight
from app.models.tag import HighlightTag
from app.schemas.document import DocumentListItem
from app.schemas.highlight import HighlightOut

router = APIRouter(prefix="/search", tags=["search"])


@router.get("")
async def search(q: str = Query(..., min_length=1), db: AsyncSession = Depends(get_db)):
    pattern = f"%{q}%"

    doc_result = await db.execute(
        select(Document).where(Document.title.ilike(pattern))
    )
    documents = [DocumentListItem.model_validate(d) for d in doc_result.scalars().all()]

    hl_result = await db.execute(
        select(Highlight)
        .options(selectinload(Highlight.tag_links).selectinload(HighlightTag.tag))
        .where(Highlight.text.ilike(pattern) | Highlight.note.ilike(pattern))
    )
    highlights_raw = list(hl_result.scalars().unique().all())
    for h in highlights_raw:
        h.tags = [link.tag for link in h.tag_links]
    highlights = [HighlightOut.model_validate(h) for h in highlights_raw]

    return {"documents": documents, "highlights": highlights}
