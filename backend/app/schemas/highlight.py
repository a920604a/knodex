import uuid
from datetime import datetime

from pydantic import BaseModel

from app.schemas.tag import TagOut


class HighlightCreate(BaseModel):
    document_id: uuid.UUID
    text: str
    note: str | None = None
    page: int
    start_offset: int
    end_offset: int


class HighlightPatch(BaseModel):
    note: str | None = None


class HighlightTagsAdd(BaseModel):
    tag_ids: list[uuid.UUID]


class HighlightOut(BaseModel):
    id: uuid.UUID
    document_id: uuid.UUID
    text: str
    note: str | None
    page: int
    start_offset: int
    end_offset: int
    embed_status: str = "pending"
    created_at: datetime
    tags: list[TagOut] = []

    model_config = {"from_attributes": True}
