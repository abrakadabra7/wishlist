"""Add price to items and item_contributions for group chip-in.

Revision ID: 002
Revises: 001
Create Date: 2025-02-14

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "wishlist_items",
        sa.Column("price", sa.Numeric(12, 2), nullable=True),
    )
    op.create_table(
        "item_contributions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("item_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["item_id"], ["wishlist_items.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_item_contributions_item_id"), "item_contributions", ["item_id"], unique=False)
    op.create_index(op.f("ix_item_contributions_user_id"), "item_contributions", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_item_contributions_user_id"), table_name="item_contributions")
    op.drop_index(op.f("ix_item_contributions_item_id"), table_name="item_contributions")
    op.drop_table("item_contributions")
    op.drop_column("wishlist_items", "price")
