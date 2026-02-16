"""Public link model for unauthenticated list access."""
from __future__ import annotations

import uuid
from datetime import datetime
from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDMixin


class PublicLink(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "public_links"

    wishlist_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("wishlists.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    token: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    expires_at: Mapped[datetime | None] = mapped_column(nullable=True)
    max_views: Mapped[int | None] = mapped_column(Integer, nullable=True)
    view_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    wishlist: Mapped["Wishlist"] = relationship(
        "Wishlist",
        back_populates="public_links",
        foreign_keys=[wishlist_id],
    )
