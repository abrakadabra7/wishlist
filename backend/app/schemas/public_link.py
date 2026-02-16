"""Public link schemas."""
from uuid import UUID
from datetime import datetime

from pydantic import BaseModel, Field


class PublicLinkCreate(BaseModel):
    expires_at: datetime | None = None
    max_views: int | None = Field(None, ge=1)


class PublicLinkResponse(BaseModel):
    id: UUID
    wishlist_id: UUID
    token: str
    expires_at: datetime | None = None
    max_views: int | None = None
    view_count: int
    created_at: datetime

    model_config = {"from_attributes": True}
