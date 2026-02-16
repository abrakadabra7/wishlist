"""Item service: reservation and contribution logging."""
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ReservationConflictError
from app.models.wishlist_item import WishlistItem
from app.models.contribution import Contribution


async def record_contribution(
    db: AsyncSession,
    wishlist_id: UUID,
    user_id: UUID,
    kind: str,
    item_id: UUID | None = None,
) -> None:
    c = Contribution(
        wishlist_id=wishlist_id,
        user_id=user_id,
        item_id=item_id,
        kind=kind,
    )
    db.add(c)
    await db.flush()


async def reserve_item(
    db: AsyncSession,
    item: WishlistItem,
    user_id: UUID,
    status: str,
    message: str | None = None,
) -> WishlistItem:
    """Set reservation (reserved or purchased). Raises ReservationConflictError on concurrent reserve."""
    if status == "available":
        item.reservation_status = "available"
        item.reserved_by_id = None
        item.reserved_at = None
        item.reservation_message = None
    else:
        if status == "reserved":
            if item.reservation_status == "reserved" and str(item.reserved_by_id) != str(user_id):
                raise ReservationConflictError(
                    "This item was just reserved by someone else. Please refresh."
                )
            if item.reservation_status == "purchased":
                raise ReservationConflictError("This item is already marked as purchased.")
        item.reservation_status = status
        item.reserved_by_id = user_id
        item.reserved_at = datetime.now(timezone.utc)
        item.reservation_message = message
    await db.flush()
    await db.refresh(item)
    return item
