"""add thumb_path to documents

Revision ID: 0007
Revises: 0006
Create Date: 2026-04-24
"""
from typing import Union

import sqlalchemy as sa
from alembic import op

revision: str = "0007"
down_revision: Union[str, None] = "0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("documents", sa.Column("thumb_path", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("documents", "thumb_path")
