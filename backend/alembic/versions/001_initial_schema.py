"""Initial schema: users, wishlists, wishlist_items, shares, public_links, contributions.

Revision ID: 001
Revises:
Create Date: 2025-02-14

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("display_name", sa.String(255), nullable=True),
        sa.Column("avatar_url", sa.String(512), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)

    op.create_table(
        "wishlists",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("is_public", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_wishlists_owner_id"), "wishlists", ["owner_id"], unique=False)

    op.create_table(
        "wishlist_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("wishlist_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("title", sa.String(512), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("link_url", sa.String(2048), nullable=True),
        sa.Column("image_url", sa.String(2048), nullable=True),
        sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("reservation_status", sa.String(32), nullable=False, server_default="available"),
        sa.Column("reserved_by_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("reserved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("reservation_message", sa.Text(), nullable=True),
        sa.Column("contributed_by_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["wishlist_id"], ["wishlists.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["reserved_by_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["contributed_by_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_wishlist_items_wishlist_id"), "wishlist_items", ["wishlist_id"], unique=False)
    op.create_index(op.f("ix_wishlist_items_reserved_by_id"), "wishlist_items", ["reserved_by_id"], unique=False)
    op.create_index(op.f("ix_wishlist_items_contributed_by_id"), "wishlist_items", ["contributed_by_id"], unique=False)

    op.create_table(
        "shares",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("wishlist_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("role", sa.String(32), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["wishlist_id"], ["wishlists.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("wishlist_id", "user_id", name="uq_share_wishlist_user"),
    )
    op.create_index(op.f("ix_shares_wishlist_id"), "shares", ["wishlist_id"], unique=False)
    op.create_index(op.f("ix_shares_user_id"), "shares", ["user_id"], unique=False)

    op.create_table(
        "public_links",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("wishlist_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("token", sa.String(64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("max_views", sa.Integer(), nullable=True),
        sa.Column("view_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["wishlist_id"], ["wishlists.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_public_links_token"), "public_links", ["token"], unique=True)
    op.create_index(op.f("ix_public_links_wishlist_id"), "public_links", ["wishlist_id"], unique=False)

    op.create_table(
        "contributions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("wishlist_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("item_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("kind", sa.String(32), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["wishlist_id"], ["wishlists.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["item_id"], ["wishlist_items.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_contributions_wishlist_id"), "contributions", ["wishlist_id"], unique=False)
    op.create_index(op.f("ix_contributions_user_id"), "contributions", ["user_id"], unique=False)
    op.create_index(op.f("ix_contributions_item_id"), "contributions", ["item_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_contributions_item_id"), table_name="contributions")
    op.drop_index(op.f("ix_contributions_user_id"), table_name="contributions")
    op.drop_index(op.f("ix_contributions_wishlist_id"), table_name="contributions")
    op.drop_table("contributions")
    op.drop_index(op.f("ix_public_links_wishlist_id"), table_name="public_links")
    op.drop_index(op.f("ix_public_links_token"), table_name="public_links")
    op.drop_table("public_links")
    op.drop_index(op.f("ix_shares_user_id"), table_name="shares")
    op.drop_index(op.f("ix_shares_wishlist_id"), table_name="shares")
    op.drop_table("shares")
    op.drop_index(op.f("ix_wishlist_items_contributed_by_id"), table_name="wishlist_items")
    op.drop_index(op.f("ix_wishlist_items_reserved_by_id"), table_name="wishlist_items")
    op.drop_index(op.f("ix_wishlist_items_wishlist_id"), table_name="wishlist_items")
    op.drop_table("wishlist_items")
    op.drop_index(op.f("ix_wishlists_owner_id"), table_name="wishlists")
    op.drop_table("wishlists")
    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.drop_table("users")
