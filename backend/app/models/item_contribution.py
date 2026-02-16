"""Money contribution to an item (group chip-in)."""
from __future__ import annotations

import uuid
from decimal import Decimal
from sqlalchemy import ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDMixin


class ItemContribution(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "item_contributions"

    item_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("wishlist_items.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="pledged")  # pledged | paid

    item: Mapped["WishlistItem"] = relationship(
        "WishlistItem",
        back_populates="money_contributions",
        foreign_keys=[item_id],
    )
    user: Mapped["User"] = relationship(
        "User",
        back_populates="item_contributions",
        foreign_keys=[user_id],
    )
