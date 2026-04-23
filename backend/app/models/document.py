import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    title: Mapped[str] = mapped_column(String, nullable=False)
    file_path: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[str] = mapped_column(String, default="unread")  # unread | reading | done
    ingestion_status: Mapped[str] = mapped_column(String, default="pending")  # pending | processing | completed | failed
    progress: Mapped[float] = mapped_column(Float, default=0.0)
    total_pages: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    highlights: Mapped[list["Highlight"]] = relationship(  # noqa: F821
        "Highlight", back_populates="document", cascade="all, delete-orphan"
    )
    chunks: Mapped[list["DocumentChunk"]] = relationship(  # noqa: F821
        "DocumentChunk", back_populates="document", cascade="all, delete-orphan"
    )
    tag_links: Mapped[list["DocumentTagLink"]] = relationship(  # noqa: F821
        "DocumentTagLink", back_populates="document", cascade="all, delete-orphan"
    )
