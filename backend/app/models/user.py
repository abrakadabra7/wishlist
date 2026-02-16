"""User model."""
from __future__ import annotations

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDMixin


class User(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    display_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String(512), nullable=True)

    wishlists: Mapped[list["Wishlist"]] = relationship(
        "Wishlist",
        back_populates="owner",
        foreign_keys="Wishlist.owner_id",
        cascade="all, delete-orphan",
    )
    shares: Mapped[list["Share"]] = relationship(
        "Share",
        back_populates="user",
        foreign_keys="Share.user_id",
        cascade="all, delete-orphan",
    )
    reserved_items: Mapped[list["WishlistItem"]] = relationship(
        "WishlistItem",
        back_populates="reserved_by_user",
        foreign_keys="WishlistItem.reserved_by_id",
    )
    contributed_items: Mapped[list["WishlistItem"]] = relationship(
        "WishlistItem",
        back_populates="contributed_by_user",
        foreign_keys="WishlistItem.contributed_by_id",
    )
    contributions: Mapped[list["Contribution"]] = relationship(
        "Contribution",
        back_populates="user",
        foreign_keys="Contribution.user_id",
        cascade="all, delete-orphan",
    )
    item_contributions: Mapped[list["ItemContribution"]] = relationship(
        "ItemContribution",
        back_populates="user",
        foreign_keys="ItemContribution.user_id",
        cascade="all, delete-orphan",
    )
    notifications: Mapped[list["Notification"]] = relationship(
        "Notification",
        back_populates="user",
        foreign_keys="Notification.user_id",
        cascade="all, delete-orphan",
    )
    wishlist_suggestions: Mapped[list["WishlistSuggestion"]] = relationship(
        "WishlistSuggestion",
        back_populates="suggested_by",
        foreign_keys="WishlistSuggestion.suggested_by_id",
    )
