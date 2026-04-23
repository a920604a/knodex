import uuid

from pydantic import BaseModel


class DocumentTagCreate(BaseModel):
    name: str
    parent_id: uuid.UUID | None = None


class DocumentTagOut(BaseModel):
    id: uuid.UUID
    name: str
    parent_id: uuid.UUID | None

    model_config = {"from_attributes": True}


class DocumentTagTree(BaseModel):
    id: uuid.UUID
    name: str
    parent_id: uuid.UUID | None
    children: list["DocumentTagTree"] = []

    model_config = {"from_attributes": True}


class DocumentTagAttach(BaseModel):
    tag_id: uuid.UUID


DocumentTagTree.model_rebuild()
