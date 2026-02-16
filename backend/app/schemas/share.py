"""Share schemas."""
from uuid import UUID
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class ShareCreate(BaseModel):
    email: EmailStr
    role: str = Field(..., pattern="^(viewer|editor)$")


class ShareResponse(BaseModel):
    id: UUID
    wishlist_id: UUID
    user_id: UUID
    role: str
    created_at: datetime

    model_config = {"from_attributes": True}
