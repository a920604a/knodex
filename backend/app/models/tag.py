import uuid

from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Tag(Base):
    __tablename__ = "tags"
    __table_args__ = (UniqueConstraint("name", "parent_id", name="uq_tag_name_parent"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String, nullable=False)
    parent_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tags.id", ondelete="RESTRICT"), nullable=True
    )

    children: Mapped[list["Tag"]] = relationship("Tag", back_populates="parent")
    parent: Mapped["Tag | None"] = relationship("Tag", back_populates="children", remote_side="Tag.id")
    highlight_links: Mapped[list["HighlightTag"]] = relationship(  # noqa: F821
        "HighlightTag", back_populates="tag", cascade="all, delete-orphan"
    )


class HighlightTag(Base):
    __tablename__ = "highlight_tags"

    highlight_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("highlights.id", ondelete="CASCADE"), primary_key=True
    )
    tag_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True
    )

    highlight: Mapped["Highlight"] = relationship("Highlight", back_populates="tag_links")  # noqa: F821
    tag: Mapped["Tag"] = relationship("Tag", back_populates="highlight_links")
