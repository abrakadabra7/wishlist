"""Suggestion from a visitor (e.g. via public link) for the owner to add an item."""
from __future__ import annotations

import uuid
from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDMixin


class WishlistSuggestion(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "wishlist_suggestions"

    wishlist_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("wishlists.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    suggested_by_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(512), nullable=False)
    link_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    message: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="pending", nullable=False)  # pending | accepted | rejected

    wishlist: Mapped["Wishlist"] = relationship(
        "Wishlist",
        back_populates="suggestions",
        foreign_keys=[wishlist_id],
    )
    suggested_by: Mapped["User | None"] = relationship(
        "User",
        back_populates="wishlist_suggestions",
        foreign_keys=[suggested_by_id],
    )
