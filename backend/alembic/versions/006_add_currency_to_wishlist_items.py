"""Add currency to wishlist_items.

Revision ID: 006
Revises: 005
Create Date: 2026-02-15

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "006"
down_revision: Union[str, None] = "005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "wishlist_items",
        sa.Column("currency", sa.String(3), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("wishlist_items", "currency")
