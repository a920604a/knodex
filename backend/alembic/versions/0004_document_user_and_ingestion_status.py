"""document user_id and ingestion_status

Revision ID: 0004
Revises: 0003
Create Date: 2026-04-23

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision: str = "0004"
down_revision: Union[str, None] = "0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "documents",
        sa.Column(
            "user_id",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.add_column(
        "documents",
        sa.Column("ingestion_status", sa.String(), nullable=False, server_default="pending"),
    )
    op.create_index("ix_documents_user_id", "documents", ["user_id"])

    op.add_column(
        "highlights",
        sa.Column("embed_status", sa.String(), nullable=False, server_default="pending"),
    )


def downgrade() -> None:
    op.drop_column("highlights", "embed_status")
    op.drop_index("ix_documents_user_id", table_name="documents")
    op.drop_column("documents", "ingestion_status")
    op.drop_column("documents", "user_id")
