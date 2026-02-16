"""Wishlist schemas."""
from uuid import UUID
from datetime import date, datetime

from pydantic import BaseModel, Field


class WishlistBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    is_public: bool = False
    due_date: date | None = None


class WishlistCreate(WishlistBase):
    sort_order: int = 0


class WishlistUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    is_public: bool | None = None
    sort_order: int | None = None
    due_date: date | None = None


class WishlistResponse(WishlistBase):
    id: UUID
    owner_id: UUID
    sort_order: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class WishlistWithProgress(WishlistResponse):
    """List view: includes item counts for progress bar."""
    items_count: int = 0
    purchased_count: int = 0


class WishlistOrderItem(BaseModel):
    id: UUID
    sort_order: int


class ReorderWishlistsRequest(BaseModel):
    order: list[WishlistOrderItem] = Field(..., description="List of id and sort_order")


class DeleteImpactResponse(BaseModel):
    """Who is affected when deleting this wishlist (for confirmation)."""
    shared_with_count: int = 0
    contributors_count: int = 0
