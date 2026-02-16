"""Share model: wishlist shared with another user."""
from __future__ import annotations

import uuid
from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDMixin


class Share(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "shares"
    __table_args__ = (UniqueConstraint("wishlist_id", "user_id", name="uq_share_wishlist_user"),)

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
    role: Mapped[str] = mapped_column(String(32), nullable=False)  # viewer | editor

    wishlist: Mapped["Wishlist"] = relationship(
        "Wishlist",
        back_populates="shares",
        foreign_keys=[wishlist_id],
    )
    user: Mapped["User"] = relationship(
        "User",
        back_populates="shares",
        foreign_keys=[user_id],
    )
