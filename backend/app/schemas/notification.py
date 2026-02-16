"""Notification schemas."""
from uuid import UUID
from datetime import datetime

from pydantic import BaseModel


class NotificationResponse(BaseModel):
    id: UUID
    user_id: UUID
    kind: str
    title: str
    body: str
    payload: dict | None = None
    read_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}
