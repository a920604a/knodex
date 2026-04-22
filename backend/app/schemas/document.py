import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class DocumentOut(BaseModel):
    id: uuid.UUID
    title: str
    file_path: str
    status: str
    progress: float
    total_pages: int | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class DocumentListItem(BaseModel):
    id: uuid.UUID
    title: str
    status: str
    progress: float
    total_pages: int | None
    created_at: datetime

    model_config = {"from_attributes": True}


class ProgressUpdate(BaseModel):
    page: int | None = None
    status: Literal["unread", "reading", "done"] | None = None
