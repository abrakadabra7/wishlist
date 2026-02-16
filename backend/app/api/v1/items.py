"""Wishlist items CRUD + reservation + money contributions."""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_wishlist_with_access
from app.core.exceptions import ReservationConflictError
from app.core.websocket import manager
from app.db.session import get_db
from app.models.item_contribution import ItemContribution
from app.models.notification import Notification
from app.models.share import Share
from app.models.user import User
from app.models.wishlist import Wishlist
from app.models.wishlist_item import WishlistItem
from app.schemas.item import (
    ItemCreate,
    ItemUpdate,
    ItemResponse,
    item_response_for_viewer,
    AddContributionRequest,
    ItemContributionsResponse,
    ContributionEntry,
)
from app.services.item_service import record_contribution, reserve_item

router = APIRouter(tags=["items"])


async def _get_wishlist_and_item(
    wishlist_id: str,
    item_id: str,
    db: AsyncSession,
    user: User,
    require_edit: bool,
):
    wishlist, share_role = await get_wishlist_with_access(
        wishlist_id, db, user=user, require_edit=require_edit
    )
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
    return wishlist, item, share_role


def _contribution_totals_from_rows(rows: list) -> tuple[float, float, float]:
    total = pledged = paid = 0.0
    for r in rows:
        amt = float(r.amount)
        total += amt
        if getattr(r, "status", None) == "paid":
            paid += amt
        else:
            pledged += amt
    return (round(total, 2), round(pledged, 2), round(paid, 2))


async def _get_contributed_totals(db: AsyncSession, item_ids: list[UUID]) -> dict[UUID, float]:
    if not item_ids:
        return {}
    result = await db.execute(
        select(ItemContribution.item_id, func.coalesce(func.sum(ItemContribution.amount), 0).label("total"))
        .where(ItemContribution.item_id.in_(item_ids))
        .group_by(ItemContribution.item_id)
    )
    return {row.item_id: float(row.total) for row in result.all()}


async def _get_contributed_totals_by_status(
    db: AsyncSession, item_ids: list[UUID]
) -> dict[UUID, tuple[float, float, float]]:
    """Return (total, pledged, paid) per item_id."""
    if not item_ids:
        return {}
    result = await db.execute(
        select(ItemContribution)
        .where(ItemContribution.item_id.in_(item_ids))
        .order_by(ItemContribution.item_id, ItemContribution.created_at)
    )
    rows = list(result.scalars().all())
    by_item: dict[UUID, list] = {}
    for r in rows:
        by_item.setdefault(r.item_id, []).append(r)
    return {
        iid: _contribution_totals_from_rows(by_item.get(iid, []))
        for iid in item_ids
    }


@router.get("/wishlists/{wishlist_id}/items", response_model=list[ItemResponse])
async def list_items(
    wishlist_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    wishlist, _ = await get_wishlist_with_access(wishlist_id, db, user=current_user)
    result = await db.execute(
        select(WishlistItem).where(WishlistItem.wishlist_id == wishlist.id).order_by(WishlistItem.position)
    )
    items = list(result.scalars().all())
    totals_by_status = await _get_contributed_totals_by_status(db, [i.id for i in items])
    hide = str(wishlist.owner_id) == str(current_user.id)
    return [
        item_response_for_viewer(
            i,
            hide_reservation_identity=hide,
            contributed_total=totals_by_status.get(i.id, (0, 0, 0))[0],
            contributed_pledged=totals_by_status.get(i.id, (0, 0, 0))[1],
            contributed_paid=totals_by_status.get(i.id, (0, 0, 0))[2],
        )
        for i in items
    ]


@router.post(
    "/wishlists/{wishlist_id}/items",
    response_model=ItemResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_item(
    wishlist_id: str,
    body: ItemCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    wishlist, share_role = await get_wishlist_with_access(
        wishlist_id, db, user=current_user, require_edit=True
    )
    is_owner = str(wishlist.owner_id) == str(current_user.id)
    item = WishlistItem(
        wishlist_id=wishlist.id,
        title=body.title,
        description=body.description,
        link_url=body.link_url,
        image_url=body.image_url,
        price=float(body.price) if body.price is not None else None,
        currency=body.currency if body.currency else None,
        position=body.position,
        contributed_by_id=current_user.id if not is_owner else None,
    )
    db.add(item)
    await db.flush()
    await record_contribution(
        db,
        wishlist_id=wishlist.id,
        user_id=current_user.id,
        kind="item_added",
        item_id=item.id,
    )
    await db.refresh(item)
    await db.commit()
    hide = str(wishlist.owner_id) == str(current_user.id)
    item_payload = item_response_for_viewer(
        item, hide_reservation_identity=hide, contributed_total=0, contributed_pledged=0, contributed_paid=0
    )
    room = manager.room_key(str(wishlist.id), None)
    if room:
        await manager.broadcast_to_room(room, "item_added", {"item": item_payload})
    return item_payload


@router.get("/wishlists/{wishlist_id}/items/{item_id}", response_model=ItemResponse)
async def get_item(
    wishlist_id: str,
    item_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    wishlist, item, _ = await _get_wishlist_and_item(
        wishlist_id, item_id, db, current_user, require_edit=False
    )
    totals_by_status = await _get_contributed_totals_by_status(db, [item.id])
    t, p, pa = totals_by_status.get(item.id, (0, 0, 0))
    hide = str(wishlist.owner_id) == str(current_user.id)
    return item_response_for_viewer(
        item,
        hide_reservation_identity=hide,
        contributed_total=t,
        contributed_pledged=p,
        contributed_paid=pa,
    )


@router.patch("/wishlists/{wishlist_id}/items/{item_id}", response_model=ItemResponse)
async def update_item(
    wishlist_id: str,
    item_id: str,
    body: ItemUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    wishlist, item, _ = await _get_wishlist_and_item(
        wishlist_id, item_id, db, current_user, require_edit=True
    )
    if body.reservation_status is not None:
        try:
            await reserve_item(
                db,
                item,
                user_id=current_user.id,
                status=body.reservation_status,
                message=body.reservation_message,
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
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "code": "reservation_conflict",
                    "message": e.message,
                    "current_item": ItemResponse.model_validate(current_item).model_dump(mode="json")
                    if current_item
                    else None,
                },
            ) from e
        if body.reservation_status == "reserved":
            await record_contribution(
                db, wishlist.id, current_user.id, "item_reserved", item.id
            )
        elif body.reservation_status == "purchased":
            await record_contribution(
                db, wishlist.id, current_user.id, "item_purchased", item.id
            )
    if body.title is not None:
        item.title = body.title
    if body.description is not None:
        item.description = body.description
    if body.link_url is not None:
        item.link_url = body.link_url
    if body.image_url is not None:
        item.image_url = body.image_url
    if body.price is not None:
        item.price = float(body.price)
    if body.currency is not None:
        item.currency = body.currency
    if body.position is not None:
        item.position = body.position
    await db.flush()
    await db.refresh(item)
    await db.commit()
    totals_by_status = await _get_contributed_totals_by_status(db, [item.id])
    t, p, pa = totals_by_status.get(item.id, (0, 0, 0))
    hide = str(wishlist.owner_id) == str(current_user.id)
    item_payload = item_response_for_viewer(
        item,
        hide_reservation_identity=hide,
        contributed_total=t,
        contributed_pledged=p,
        contributed_paid=pa,
    )
    room = manager.room_key(str(wishlist.id), None)
    if room:
        await manager.broadcast_to_room(room, "item_updated", {"item": item_payload})
    return item_payload


@router.delete("/wishlists/{wishlist_id}/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_item(
    wishlist_id: str,
    item_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    wishlist, item, _ = await _get_wishlist_and_item(
        wishlist_id, item_id, db, current_user, require_edit=True
    )
    item_title = (item.title or "Item")[:80]
    list_title = (wishlist.title or "Wishlist")[:80]
    item_currency = item.currency or ""

    # Load contributions before delete (cascade will remove them)
    contribs_result = await db.execute(
        select(ItemContribution.user_id, ItemContribution.amount, ItemContribution.status).where(
            ItemContribution.item_id == item.id
        )
    )
    contribs = list(contribs_result.all())
    # Per-user: total paid, has any pledged
    user_paid: dict[UUID, float] = {}
    user_pledged_only: set[UUID] = set()
    for c in contribs:
        uid = c.user_id
        if str(uid) == str(current_user.id):
            continue
        amt = float(c.amount)
        if getattr(c, "status", None) == "paid":
            user_paid[uid] = user_paid.get(uid, 0) + amt
        else:
            user_pledged_only.add(uid)
    contributor_ids = set(user_paid.keys()) | user_pledged_only

    # Notify contributors who paid (refund)
    for uid, total_paid in user_paid.items():
        if total_paid <= 0:
            continue
        db.add(
            Notification(
                user_id=uid,
                kind="refund_paid",
                title="Refund",
                body=f'You were refunded {total_paid:.2f} {item_currency or ""}. The item was removed from the list.',
                payload={
                    "amount": round(total_paid, 2),
                    "currency": item_currency or "",
                    "item_title": item_title,
                    "list_title": list_title,
                },
            )
        )
    # Notify contributors who only pledged
    for uid in user_pledged_only:
        if uid in user_paid:
            continue
        db.add(
            Notification(
                user_id=uid,
                kind="item_removed_pledged",
                title="Item removed",
                body=f'"{item_title}" was removed from "{list_title}". Your pledged amount is cancelled.',
                payload={"item_title": item_title, "list_title": list_title},
            )
        )
    # Notify shared users (viewers/editors) who are not contributors
    shares_result = await db.execute(select(Share.user_id).where(Share.wishlist_id == wishlist.id))
    for row in shares_result.all():
        uid = row.user_id
        if str(uid) == str(current_user.id) or uid in contributor_ids:
            continue
        db.add(
            Notification(
                user_id=uid,
                kind="item_removed",
                title="Item removed",
                body=f'"{item_title}" was removed from "{list_title}".',
                payload={"item_title": item_title, "list_title": list_title},
            )
        )

    await db.flush()
    item_id_str = str(item.id)
    await db.delete(item)
    await db.flush()
    await db.commit()
    room = manager.room_key(str(wishlist.id), None)
    if room:
        await manager.broadcast_to_room(room, "item_removed", {"item_id": item_id_str})
    return None


@router.get(
    "/wishlists/{wishlist_id}/items/{item_id}/contributions",
    response_model=ItemContributionsResponse,
)
async def get_item_contributions(
    wishlist_id: str,
    item_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return totals by status and list of contributions with display_name (no anonymity)."""
    wishlist, item, _ = await _get_wishlist_and_item(
        wishlist_id, item_id, db, current_user, require_edit=False
    )
    result = await db.execute(
        select(ItemContribution, User)
        .join(User, ItemContribution.user_id == User.id)
        .where(ItemContribution.item_id == item.id)
        .order_by(ItemContribution.created_at)
    )
    rows = list(result.all())
    total = pledged = paid = 0.0
    contributions_list = []
    for r, u in rows:
        amt = float(r.amount)
        total += amt
        if getattr(r, "status", None) == "paid":
            paid += amt
        else:
            pledged += amt
        display_name = (u.display_name or u.email or "").strip() or u.email
        contributions_list.append(
            ContributionEntry(
                amount=amt,
                status=getattr(r, "status", "pledged"),
                display_name=display_name,
                is_me=(str(r.user_id) == str(current_user.id)),
            )
        )
    return ItemContributionsResponse(
        total=round(total, 2),
        total_pledged=round(pledged, 2),
        total_paid=round(paid, 2),
        contributions=contributions_list,
    )


@router.post(
    "/wishlists/{wishlist_id}/items/{item_id}/contributions",
    response_model=ItemResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_item_contribution(
    wishlist_id: str,
    item_id: str,
    body: AddContributionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add my money contribution (chip-in). Only non-owner can contribute. Realtime broadcast."""
    wishlist, item, _ = await _get_wishlist_and_item(
        wishlist_id, item_id, db, current_user, require_edit=False
    )
    if str(wishlist.owner_id) == str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Owner cannot add money contribution to their own list",
        )
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
    totals_by_status = await _get_contributed_totals_by_status(db, [item.id])
    t, p, pa = totals_by_status.get(item.id, (0, 0, 0))
    hide = str(wishlist.owner_id) == str(current_user.id)
    item_payload = item_response_for_viewer(
        item,
        hide_reservation_identity=hide,
        contributed_total=t,
        contributed_pledged=p,
        contributed_paid=pa,
    )
    room = manager.room_key(str(wishlist.id), None)
    if room:
        await manager.broadcast_to_room(room, "item_updated", {"item": item_payload})
    return item_payload
