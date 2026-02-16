"""Contribution model: audit log for item_added, item_reserved, item_purchased."""
from __future__ import annotations

import uuid
from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDMixin


class Contribution(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "contributions"

    wishlist_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("wishlists.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    item_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("wishlist_items.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    kind: Mapped[str] = mapped_column(String(32), nullable=False)
    # item_added | item_reserved | item_purchased

    wishlist: Mapped["Wishlist"] = relationship(
        "Wishlist",
        back_populates="contributions",
        foreign_keys=[wishlist_id],
    )
    user: Mapped["User"] = relationship(
        "User",
        back_populates="contributions",
        foreign_keys=[user_id],
    )
