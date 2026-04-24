import uuid
from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.auth import require_admin
from app.models.document import Document
from app.models.query_log import QueryLog
from app.models.user import User

router = APIRouter(prefix="/admin", tags=["admin"])


class UserStats(BaseModel):
    id: object
    email: str
    role: str
    pdf_limit: int
    daily_query_limit: int
    pdf_count: int
    today_query_count: int
    created_at: object

    model_config = {"from_attributes": True}


class UserLimitUpdate(BaseModel):
    pdf_limit: int | None = None
    daily_query_limit: int | None = None


class SystemStats(BaseModel):
    total_users: int
    total_documents: int
    today_total_queries: int
    worker_queue_depth: int


@router.get("/users", response_model=list[UserStats])
async def list_users(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    today_start = datetime.combine(date.today(), datetime.min.time()).replace(tzinfo=timezone.utc)

    users_result = await db.execute(select(User).order_by(User.created_at.desc()))
    users = users_result.scalars().all()

    doc_counts_result = await db.execute(
        select(Document.user_id, func.count().label("cnt"))
        .group_by(Document.user_id)
    )
    doc_counts = {str(row.user_id): row.cnt for row in doc_counts_result}

    query_counts_result = await db.execute(
        select(QueryLog.user_id, func.count().label("cnt"))
        .where(QueryLog.created_at >= today_start)
        .group_by(QueryLog.user_id)
    )
    query_counts = {str(row.user_id): row.cnt for row in query_counts_result}

    return [
        UserStats(
            id=u.id,
            email=u.email,
            role=u.role,
            pdf_limit=u.pdf_limit,
            daily_query_limit=u.daily_query_limit,
            pdf_count=doc_counts.get(str(u.id), 0),
            today_query_count=query_counts.get(str(u.id), 0),
            created_at=u.created_at,
        )
        for u in users
    ]


@router.patch("/users/{user_id}", response_model=UserStats)
async def update_user_limits(
    user_id: uuid.UUID,
    body: UserLimitUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if body.pdf_limit is not None:
        user.pdf_limit = body.pdf_limit
    if body.daily_query_limit is not None:
        user.daily_query_limit = body.daily_query_limit

    await db.commit()
    await db.refresh(user)

    today_start = datetime.combine(date.today(), datetime.min.time()).replace(tzinfo=timezone.utc)
    pdf_count_r = await db.execute(
        select(func.count()).where(Document.user_id == user_id)
    )
    query_count_r = await db.execute(
        select(func.count())
        .where(QueryLog.user_id == user_id)
        .where(QueryLog.created_at >= today_start)
    )

    return UserStats(
        id=user.id,
        email=user.email,
        role=user.role,
        pdf_limit=user.pdf_limit,
        daily_query_limit=user.daily_query_limit,
        pdf_count=pdf_count_r.scalar_one(),
        today_query_count=query_count_r.scalar_one(),
        created_at=user.created_at,
    )


@router.get("/stats", response_model=SystemStats)
async def system_stats(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    today_start = datetime.combine(date.today(), datetime.min.time()).replace(tzinfo=timezone.utc)

    total_users = (await db.execute(select(func.count()).select_from(User))).scalar_one()
    total_docs = (await db.execute(select(func.count()).select_from(Document))).scalar_one()
    today_queries = (
        await db.execute(
            select(func.count()).where(QueryLog.created_at >= today_start)
        )
    ).scalar_one()

    # Get queue depth from Redis
    queue_depth = 0
    try:
        from app.main import arq_pool
        if arq_pool:
            queue_depth = await arq_pool.zcard("arq:queue")
    except Exception:
        pass

    return SystemStats(
        total_users=total_users,
        total_documents=total_docs,
        today_total_queries=today_queries,
        worker_queue_depth=queue_depth,
    )
