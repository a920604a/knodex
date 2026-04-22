import uuid
from typing import Optional

from pydantic import BaseModel


class TagCreate(BaseModel):
    name: str
    parent_id: uuid.UUID | None = None


class TagOut(BaseModel):
    id: uuid.UUID
    name: str
    parent_id: uuid.UUID | None

    model_config = {"from_attributes": True}


class TagTree(BaseModel):
    id: uuid.UUID
    name: str
    parent_id: uuid.UUID | None
    children: list["TagTree"] = []

    model_config = {"from_attributes": True}


TagTree.model_rebuild()
