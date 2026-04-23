from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.auth import get_current_user
from app.models.query_log import QueryLog
from app.models.user import User
from app.services import cf_ai, cf_vectorize

router = APIRouter(prefix="/query", tags=["query"])


class QueryRequest(BaseModel):
    query: str


class SourceItem(BaseModel):
    type: str  # "chunk" | "highlight"
    document_id: str
    page: int
    content: str


class QueryResponse(BaseModel):
    answer: str
    sources: list[SourceItem]


async def _count_today_queries(db: AsyncSession, user_id: object) -> int:
    today_start = datetime.combine(date.today(), datetime.min.time()).replace(tzinfo=timezone.utc)
    result = await db.execute(
        select(func.count())
        .where(QueryLog.user_id == user_id)
        .where(QueryLog.created_at >= today_start)
    )
    return result.scalar_one()


@router.post("", response_model=QueryResponse)
async def rag_query(
    body: QueryRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Rate limit check
    today_count = await _count_today_queries(db, current_user.id)
    if today_count >= current_user.daily_query_limit:
        raise HTTPException(
            status_code=429,
            detail={
                "message": "Daily query limit reached",
                "limit": current_user.daily_query_limit,
                "reset_at": "UTC 00:00",
            },
        )

    # Embed query
    query_vector = await cf_ai.embed(body.query)

    # Search Vectorize (per-user isolation)
    matches = await cf_vectorize.query(
        vector=query_vector,
        filter={"user_id": {"$eq": str(current_user.id)}},
        top_k=5,
    )

    if not matches:
        log = QueryLog(
            user_id=current_user.id,
            query_text=body.query,
            response_summary="No relevant content found.",
            tokens_used=0,
        )
        db.add(log)
        await db.commit()
        return QueryResponse(answer="目前知識庫沒有相關資料。", sources=[])

    # Build context from matches
    sources = []
    context_parts = []
    for m in matches:
        meta = m.get("metadata", {})
        sources.append(SourceItem(
            type=meta.get("source_type", "chunk"),
            document_id=meta.get("document_id", ""),
            page=meta.get("page", 0),
            content=meta.get("content", ""),
        ))
        context_parts.append(f"[{meta.get('source_type', 'chunk')} p.{meta.get('page', '?')}]\n{meta.get('content', '')}")

    context = "\n\n---\n\n".join(context_parts)
    prompt = f"根據以下資料回答問題。\n\n{context}\n\n問題：{body.query}"

    answer, tokens_used = await cf_ai.generate(prompt)

    # Log query
    log = QueryLog(
        user_id=current_user.id,
        query_text=body.query,
        response_summary=answer[:500],
        tokens_used=tokens_used,
    )
    db.add(log)
    await db.commit()

    return QueryResponse(answer=answer, sources=sources)
