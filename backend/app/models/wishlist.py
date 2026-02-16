"""Wishlist model."""
from __future__ import annotations

import uuid
from datetime import date
from sqlalchemy import Boolean, Date, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDMixin


class Wishlist(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "wishlists"

    owner_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_public: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    owner: Mapped["User"] = relationship(
        "User",
        back_populates="wishlists",
        foreign_keys=[owner_id],
    )
    items: Mapped[list["WishlistItem"]] = relationship(
        "WishlistItem",
        back_populates="wishlist",
        cascade="all, delete-orphan",
        order_by="WishlistItem.position",
    )
    shares: Mapped[list["Share"]] = relationship(
        "Share",
        back_populates="wishlist",
        cascade="all, delete-orphan",
    )
    public_links: Mapped[list["PublicLink"]] = relationship(
        "PublicLink",
        back_populates="wishlist",
        cascade="all, delete-orphan",
    )
    contributions: Mapped[list["Contribution"]] = relationship(
        "Contribution",
        back_populates="wishlist",
        cascade="all, delete-orphan",
    )
    suggestions: Mapped[list["WishlistSuggestion"]] = relationship(
        "WishlistSuggestion",
        back_populates="wishlist",
        cascade="all, delete-orphan",
        foreign_keys="WishlistSuggestion.wishlist_id",
    )
