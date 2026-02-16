"""Public link access (no auth for read; auth + token for reserve/contribute)."""
from uuid import UUID
from typing import Annotated

from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.api.deps import get_public_link_wishlist, get_current_user, get_current_user_optional
from app.core.exceptions import ReservationConflictError
from app.core.websocket import manager
from app.models.item_contribution import ItemContribution
from app.models.notification import Notification
from app.models.user import User
from app.models.wishlist_item import WishlistItem
from app.models.wishlist_suggestion import WishlistSuggestion
from app.schemas.wishlist import WishlistResponse
from app.schemas.wishlist_suggestion import SuggestionCreate, SuggestionResponse
from app.schemas.item import (
    ItemResponse,
    item_response_for_viewer,
    AddContributionRequest,
    ReservationUpdate,
)
from app.services.item_service import record_contribution, reserve_item

router = APIRouter(prefix="/public", tags=["public"])


@router.get("/wishlists", response_model=dict)
async def get_wishlist_by_token(
    token: str = Query(..., alias="token"),
    db: AsyncSession = Depends(get_db),
):
    """Return wishlist and items for a valid public link token. Increments view_count. Owner never sees who reserved (hide_reservation_identity=True)."""
    wishlist, link = await get_public_link_wishlist(token, db)
    link.view_count += 1
    await db.flush()

    result = await db.execute(
        select(WishlistItem).where(WishlistItem.wishlist_id == wishlist.id).order_by(WishlistItem.position)
    )
    items = list(result.scalars().all())
    item_ids = [i.id for i in items]
    totals_by_status = await _contributed_totals_by_status(db, item_ids) if item_ids else {}
    return {
        "wishlist": WishlistResponse.model_validate(wishlist),
        "items": [
            item_response_for_viewer(
                i,
                hide_reservation_identity=True,
                contributed_total=totals_by_status.get(i.id, (0, 0, 0))[0],
                contributed_pledged=totals_by_status.get(i.id, (0, 0, 0))[1],
                contributed_paid=totals_by_status.get(i.id, (0, 0, 0))[2],
            )
            for i in items
        ],
    }


async def _get_public_item(
    token: str,
    item_id: str,
    db: AsyncSession,
):
    from app.models.wishlist import Wishlist

    wishlist, _ = await get_public_link_wishlist(token, db)
    try:
        iid = UUID(item_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
    result = await db.execute(
        select(WishlistItem).where(
            WishlistItem.id == iid,
            WishlistItem.wishlist_id == wishlist.id,
        )
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
    return item, wishlist


async def _contributed_totals_by_status(db: AsyncSession, item_ids: list[UUID]) -> dict:
    """Return (total, pledged, paid) per item_id."""
    if not item_ids:
        return {}
    result = await db.execute(
        select(ItemContribution).where(ItemContribution.item_id.in_(item_ids))
    )
    rows = list(result.scalars().all())
    by_item: dict = {}
    for r in rows:
        by_item.setdefault(r.item_id, []).append(r)
    out = {}
    for iid in item_ids:
        lst = by_item.get(iid, [])
        total = pledged = paid = 0.0
        for r in lst:
            amt = float(r.amount)
            total += amt
            if getattr(r, "status", None) == "paid":
                paid += amt
            else:
                pledged += amt
        out[iid] = (round(total, 2), round(pledged, 2), round(paid, 2))
    return out


@router.patch("/wishlists/items/{item_id}", response_model=ItemResponse)
async def update_item_by_public_token(
    item_id: str,
    body: ReservationUpdate,
    token: str = Query(..., alias="token"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Reserve or mark purchased when opened via public link (auth + valid token). Realtime broadcast."""
    item, wishlist = await _get_public_item(token, item_id, db)
    if str(wishlist.owner_id) == str(current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Use your list directly to edit")
    reservation_status = body.reservation_status
    reservation_message = body.reservation_message
    if reservation_status is not None:
        try:
            await reserve_item(
                db,
                item,
                user_id=current_user.id,
                status=reservation_status,
                message=reservation_message,
            )
        except ReservationConflictError as e:
            await db.rollback()
            result = await db.execute(
                select(WishlistItem).where(
                    WishlistItem.id == item.id,
                    WishlistItem.wishlist_id == wishlist.id,
                )
            )
            current_item = result.scalar_one_or_none()
            tot = await _contributed_totals_by_status(db, [current_item.id]) if current_item else {}
            t, p, pa = tot.get(current_item.id, (0, 0, 0)) if current_item else (0, 0, 0)
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "code": "reservation_conflict",
                    "message": e.message,
                    "current_item": item_response_for_viewer(
                        current_item,
                        hide_reservation_identity=True,
                        contributed_total=t,
                        contributed_pledged=p,
                        contributed_paid=pa,
                    )
                    if current_item
                    else None,
                },
            ) from e
        if reservation_status == "reserved":
            await record_contribution(db, wishlist.id, current_user.id, "item_reserved", item.id)
        elif reservation_status == "purchased":
            await record_contribution(db, wishlist.id, current_user.id, "item_purchased", item.id)
    await db.refresh(item)
    await db.commit()
    totals_by_status = await _contributed_totals_by_status(db, [item.id])
    t, p, pa = totals_by_status.get(item.id, (0, 0, 0))
    item_payload = item_response_for_viewer(
        item,
        hide_reservation_identity=True,
        contributed_total=t,
        contributed_pledged=p,
        contributed_paid=pa,
    )
    room = manager.room_key(str(wishlist.id), None)
    if room:
        await manager.broadcast_to_room(room, "item_updated", {"item": item_payload})
    return item_payload


@router.post("/wishlists/suggestions", response_model=SuggestionResponse, status_code=status.HTTP_201_CREATED)
async def create_suggestion_by_public_token(
    body: SuggestionCreate,
    token: str = Query(..., alias="token"),
    db: AsyncSession = Depends(get_db),
    current_user: Annotated[User | None, Depends(get_current_user_optional)] = None,
):
    """Suggest an item to the wishlist owner (e.g. when list is full). Anonymous if not logged in. Owner gets notification."""
    wishlist, _ = await get_public_link_wishlist(token, db)
    suggestion = WishlistSuggestion(
        wishlist_id=wishlist.id,
        suggested_by_id=current_user.id if current_user else None,
        title=body.title.strip(),
        link_url=body.link_url.strip() if body.link_url else None,
        message=body.message.strip() if body.message else None,
        status="pending",
    )
    db.add(suggestion)
    await db.flush()
    n = Notification(
        user_id=wishlist.owner_id,
        kind="wishlist_suggestion",
        title="New suggestion for your wishlist",
        body=f'Someone suggested adding "{body.title[:50]}{"…" if len(body.title) > 50 else ""}" to your list "{wishlist.title}". Open the list to accept or reject.',
        payload={"list_title": (wishlist.title or "")[:80]},
    )
    db.add(n)
    await db.flush()
    await db.refresh(suggestion)
    room = manager.room_key(str(wishlist.id), None)
    if room:
        await manager.broadcast_to_room(
            room,
            "suggestion_added",
            {"suggestion": SuggestionResponse.model_validate(suggestion).model_dump(mode="json")},
        )
    return suggestion


@router.post("/wishlists/items/{item_id}/contributions", response_model=ItemResponse, status_code=status.HTTP_201_CREATED)
async def add_contribution_by_public_token(
    item_id: str,
    body: AddContributionRequest,
    token: str = Query(..., alias="token"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Chip in when opened via public link (auth + valid token). Realtime broadcast."""
    item, wishlist = await _get_public_item(token, item_id, db)
    if str(wishlist.owner_id) == str(current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Owner cannot add contribution")
    contrib = ItemContribution(
        item_id=item.id,
        user_id=current_user.id,
        amount=body.amount,
        status=body.status,
    )
    db.add(contrib)
    await db.flush()
    await db.commit()
    await db.refresh(item)
    totals_by_status = await _contributed_totals_by_status(db, [item.id])
    t, p, pa = totals_by_status.get(item.id, (0, 0, 0))
    item_payload = item_response_for_viewer(
        item,
        hide_reservation_identity=True,
        contributed_total=t,
        contributed_pledged=p,
        contributed_paid=pa,
    )
    room = manager.room_key(str(wishlist.id), None)
    if room:
        await manager.broadcast_to_room(room, "item_updated", {"item": item_payload})
    return item_payload