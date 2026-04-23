import uuid

from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class DocumentTag(Base):
    __tablename__ = "document_tags"
    __table_args__ = (UniqueConstraint("name", "parent_id", name="uq_document_tag_name_parent"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String, nullable=False)
    parent_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("document_tags.id", ondelete="RESTRICT"), nullable=True
    )

    children: Mapped[list["DocumentTag"]] = relationship("DocumentTag", back_populates="parent")
    parent: Mapped["DocumentTag | None"] = relationship(
        "DocumentTag", back_populates="children", remote_side="DocumentTag.id"
    )
    document_links: Mapped[list["DocumentTagLink"]] = relationship(
        "DocumentTagLink", back_populates="tag", cascade="all, delete-orphan"
    )


class DocumentTagLink(Base):
    __tablename__ = "document_tag_links"

    document_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("documents.id", ondelete="CASCADE"), primary_key=True
    )
    tag_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("document_tags.id", ondelete="CASCADE"), primary_key=True
    )

    document: Mapped["Document"] = relationship("Document", back_populates="tag_links")  # noqa: F821
    tag: Mapped["DocumentTag"] = relationship("DocumentTag", back_populates="document_links")
