"""Wishlist item schemas (reservation + contribution)."""
from uuid import UUID
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field


class ItemBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=512)
    description: str | None = None
    link_url: str | None = Field(None, max_length=2048)
    image_url: str | None = Field(None, max_length=2048)
    price: Decimal | float | None = Field(None, ge=0)
    currency: str | None = Field(None, max_length=3)  # ISO 4217 e.g. USD, RUB, EUR


class ItemCreate(ItemBase):
    position: int = 0


class ItemUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=512)
    description: str | None = None
    link_url: str | None = Field(None, max_length=2048)
    image_url: str | None = Field(None, max_length=2048)
    price: Decimal | float | None = Field(None, ge=0)
    currency: str | None = Field(None, max_length=3)
    position: int | None = None
    reservation_status: str | None = Field(None, pattern="^(reserved|purchased|available)$")
    reservation_message: str | None = None


class ReservationUpdate(BaseModel):
    """Reserve or mark purchased (subset for convenience)."""
    reservation_status: str = Field(..., pattern="^(reserved|purchased|available)$")
    reservation_message: str | None = None


class AddContributionRequest(BaseModel):
    """Add money contribution to an item (group chip-in). status: pledged = promise, paid = after fake payment."""
    amount: float = Field(..., gt=0)
    status: str = Field(default="pledged", pattern="^(pledged|paid)$")


class ContributionEntry(BaseModel):
    """Single contribution entry with identity (no anonymity)."""
    amount: float
    status: str  # pledged | paid
    display_name: str | None = None  # user display_name or email
    is_me: bool = False


class ItemContributionsResponse(BaseModel):
    """Totals by status and per-entry list with names."""
    total: float  # pledged + paid
    total_pledged: float = 0
    total_paid: float = 0
    contributions: list[ContributionEntry] | None = None


class ItemResponse(ItemBase):
    id: UUID
    wishlist_id: UUID
    position: int
    reservation_status: str
    reserved_by_id: UUID | None = None
    reserved_at: datetime | None = None
    reservation_message: str | None = None
    contributed_by_id: UUID | None = None
    contributed_total: float | None = None
    contributed_pledged: float | None = None
    contributed_paid: float | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


def item_response_for_viewer(
    item,
    *,
    hide_reservation_identity: bool = False,
    contributed_total: float | None = None,
    contributed_pledged: float | None = None,
    contributed_paid: float | None = None,
):
    """Build ItemResponse dict; when hide_reservation_identity=True (owner or public), do not expose who reserved."""
    data = ItemResponse.model_validate(item).model_dump(mode="json")
    if hide_reservation_identity:
        data["reserved_by_id"] = None
        data["reserved_at"] = None
        data["reservation_message"] = None
    if contributed_total is not None:
        data["contributed_total"] = round(contributed_total, 2)
    if contributed_pledged is not None:
        data["contributed_pledged"] = round(contributed_pledged, 2)
    if contributed_paid is not None:
        data["contributed_paid"] = round(contributed_paid, 2)
    return data
