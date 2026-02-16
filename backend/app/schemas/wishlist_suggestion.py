"""Wishlist suggestion schemas."""
from uuid import UUID
from datetime import datetime

from pydantic import BaseModel, Field


class SuggestionCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=512)
    link_url: str | None = Field(None, max_length=2048)
    message: str | None = Field(None, max_length=2000)


class SuggestionResponse(BaseModel):
    id: UUID
    wishlist_id: UUID
    suggested_by_id: UUID | None
    title: str
    link_url: str | None
    message: str | None
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}
