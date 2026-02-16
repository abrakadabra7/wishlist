"""Wishlist item model with reservation and contribution support."""
from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal
from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDMixin


class WishlistItem(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "wishlist_items"

    wishlist_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("wishlists.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(512), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    link_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    image_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    position: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    price: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    currency: Mapped[str | None] = mapped_column(String(3), nullable=True)  # ISO 4217 e.g. USD, RUB, EUR

    # Reservation: who reserved to buy / purchased
    reservation_status: Mapped[str] = mapped_column(
        String(32), default="available", nullable=False
    )  # available | reserved | purchased
    reserved_by_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    reserved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    reservation_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Contribution: who added this item (if not owner)
    contributed_by_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    wishlist: Mapped["Wishlist"] = relationship(
        "Wishlist",
        back_populates="items",
        foreign_keys=[wishlist_id],
    )
    reserved_by_user: Mapped["User | None"] = relationship(
        "User",
        back_populates="reserved_items",
        foreign_keys=[reserved_by_id],
    )
    contributed_by_user: Mapped["User | None"] = relationship(
        "User",
        back_populates="contributed_items",
        foreign_keys=[contributed_by_id],
    )
    money_contributions: Mapped[list["ItemContribution"]] = relationship(
        "ItemContribution",
        back_populates="item",
        cascade="all, delete-orphan",
        foreign_keys="ItemContribution.item_id",
    )
