"""Add wishlist_suggestions table.

Revision ID: 005
Revises: 004
Create Date: 2025-02-14

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "005"
down_revision: Union[str, None] = "004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "wishlist_suggestions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("wishlist_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("suggested_by_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("title", sa.String(512), nullable=False),
        sa.Column("link_url", sa.String(2048), nullable=True),
        sa.Column("message", sa.Text(), nullable=True),
        sa.Column("status", sa.String(32), nullable=False, server_default="pending"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["wishlist_id"], ["wishlists.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["suggested_by_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_wishlist_suggestions_wishlist_id", "wishlist_suggestions", ["wishlist_id"], unique=False)
    op.create_index("ix_wishlist_suggestions_suggested_by_id", "wishlist_suggestions", ["suggested_by_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_wishlist_suggestions_suggested_by_id", table_name="wishlist_suggestions")
    op.drop_index("ix_wishlist_suggestions_wishlist_id", table_name="wishlist_suggestions")
    op.drop_table("wishlist_suggestions")
