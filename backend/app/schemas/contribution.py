"""Contribution schemas."""
from uuid import UUID
from datetime import datetime

from pydantic import BaseModel


class ContributionResponse(BaseModel):
    id: UUID
    wishlist_id: UUID
    user_id: UUID
    item_id: UUID | None = None
    kind: str
    created_at: datetime

    model_config = {"from_attributes": True}
