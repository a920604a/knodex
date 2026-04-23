import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel

from app.schemas.document_tag import DocumentTagOut


class DocumentOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID | None = None
    title: str
    file_path: str
    status: str
    ingestion_status: str = "pending"
    progress: float
    total_pages: int | None
    created_at: datetime
    updated_at: datetime
    document_tags: list[DocumentTagOut] = []

    model_config = {"from_attributes": True}


class DocumentListItem(BaseModel):
    id: uuid.UUID
    title: str
    status: str
    ingestion_status: str = "pending"
    progress: float
    total_pages: int | None
    created_at: datetime
    updated_at: datetime
    document_tags: list[DocumentTagOut] = []

    model_config = {"from_attributes": True}


class ProgressUpdate(BaseModel):
    page: int | None = None
    status: Literal["unread", "reading", "done"] | None = None
