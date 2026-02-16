"""Wishlist CRUD endpoints."""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_wishlist_with_access
from app.core.websocket import manager
from app.db.session import get_db
from app.models.user import User
from app.models.wishlist import Wishlist
from app.models.wishlist_item import WishlistItem
from app.models.share import Share
from app.models.item_contribution import ItemContribution
from app.models.notification import Notification
from app.models.wishlist_suggestion import WishlistSuggestion
from app.schemas.wishlist import (
    WishlistCreate,
    WishlistUpdate,
    WishlistResponse,
    WishlistWithProgress,
    ReorderWishlistsRequest,
    DeleteImpactResponse,
)
from app.schemas.wishlist_suggestion import SuggestionResponse

router = APIRouter(prefix="/wishlists", tags=["wishlists"])


@router.get("", response_model=list[WishlistWithProgress])
async def list_wishlists(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Owned: order by sort_order, due_date (nulls last), created_at
    owned = await db.execute(
        select(Wishlist)
        .where(Wishlist.owner_id == current_user.id)
        .order_by(
            Wishlist.sort_order.asc(),
            Wishlist.due_date.asc().nulls_last(),
            Wishlist.created_at.asc(),
        )
    )
    owned_list = list(owned.scalars().all())
    # Shared with me
    shared = await db.execute(
        select(Wishlist)
        .join(Share, Share.wishlist_id == Wishlist.id)
        .where(Share.user_id == current_user.id)
        .order_by(Wishlist.title)
    )
    shared_list = list(shared.scalars().unique().all())
    all_lists = owned_list + shared_list
    if not all_lists:
        return []

    # Count items and purchased per wishlist
    ids = [w.id for w in all_lists]
    counts = await db.execute(
        select(
            WishlistItem.wishlist_id,
            func.count().label("items_count"),
            func.sum(case((WishlistItem.reservation_status == "purchased", 1), else_=0)).label("purchased_count"),
        )
        .where(WishlistItem.wishlist_id.in_(ids))
        .group_by(WishlistItem.wishlist_id)
    )
    count_map = {row.wishlist_id: (int(row.items_count), int(row.purchased_count or 0)) for row in counts.all()}

    result = []
    for w in all_lists:
        items_count, purchased_count = count_map.get(w.id, (0, 0))
        result.append(
            WishlistWithProgress(
                **WishlistResponse.model_validate(w).model_dump(),
                items_count=items_count,
                purchased_count=purchased_count,
            )
        )
    return result


@router.post("", response_model=WishlistResponse, status_code=status.HTTP_201_CREATED)
async def create_wishlist(
    body: WishlistCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    w = Wishlist(
        owner_id=current_user.id,
        title=body.title,
        description=body.description,
        is_public=body.is_public,
        sort_order=body.sort_order,
        due_date=body.due_date,
    )
    db.add(w)
    await db.flush()
    await db.refresh(w)
    return w


@router.patch("/reorder", response_model=list[WishlistWithProgress])
async def reorder_wishlists(
    body: ReorderWishlistsRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update sort_order for owned wishlists. Only owned lists are reordered."""
    for item in body.order:
        wishlist, _ = await get_wishlist_with_access(str(item.id), db, user=current_user)
        if str(wishlist.owner_id) != str(current_user.id):
            continue
        wishlist.sort_order = item.sort_order
    await db.flush()
    return await list_wishlists(db=db, current_user=current_user)


@router.get("/{wishlist_id}/delete-impact", response_model=DeleteImpactResponse)
async def get_wishlist_delete_impact(
    wishlist_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return counts of affected users (shared + contributors) for delete confirmation. Owner only."""
    wishlist, _ = await get_wishlist_with_access(wishlist_id, db, user=current_user)
    if str(wishlist.owner_id) != str(current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only owner can view delete impact")
    shared_count = await db.execute(select(Share).where(Share.wishlist_id == wishlist.id))
    shared_with_count = len(shared_count.scalars().all())
    items = await db.execute(select(WishlistItem).where(WishlistItem.wishlist_id == wishlist.id))
    item_list = list(items.scalars().all())
    item_ids = [i.id for i in item_list]
    contributor_ids = set()
    for i in item_list:
        if i.reserved_by_id and str(i.reserved_by_id) != str(current_user.id):
            contributor_ids.add(i.reserved_by_id)
        if i.contributed_by_id and str(i.contributed_by_id) != str(current_user.id):
            contributor_ids.add(i.contributed_by_id)
    if item_ids:
        contribs = await db.execute(
            select(ItemContribution.user_id).where(
                ItemContribution.item_id.in_(item_ids),
                ItemContribution.user_id != current_user.id,
            )
        )
        for row in contribs.all():
            contributor_ids.add(row.user_id)
    contributors_count = len(contributor_ids)
    return DeleteImpactResponse(shared_with_count=shared_with_count, contributors_count=contributors_count)


@router.get("/{wishlist_id}/suggestions", response_model=list[SuggestionResponse])
async def list_wishlist_suggestions(
    wishlist_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List pending suggestions for this wishlist. Owner only."""
    wishlist, _ = await get_wishlist_with_access(wishlist_id, db, user=current_user)
    if str(wishlist.owner_id) != str(current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only owner can list suggestions")
    result = await db.execute(
        select(WishlistSuggestion)
        .where(
            WishlistSuggestion.wishlist_id == wishlist.id,
            WishlistSuggestion.status == "pending",
        )
        .order_by(WishlistSuggestion.created_at.desc())
    )
    return list(result.scalars().all())


@router.post("/{wishlist_id}/suggestions/{suggestion_id}/accept", status_code=status.HTTP_204_NO_CONTENT)
async def accept_wishlist_suggestion(
    wishlist_id: str,
    suggestion_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create item from suggestion and notify suggester. Owner only."""
    from uuid import UUID
    from sqlalchemy import func

    wishlist, _ = await get_wishlist_with_access(wishlist_id, db, user=current_user)
    if str(wishlist.owner_id) != str(current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only owner can accept")
    try:
        sid = UUID(suggestion_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Suggestion not found")
    result = await db.execute(
        select(WishlistSuggestion).where(
            WishlistSuggestion.id == sid,
            WishlistSuggestion.wishlist_id == wishlist.id,
            WishlistSuggestion.status == "pending",
        )
    )
    suggestion = result.scalar_one_or_none()
    if not suggestion:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Suggestion not found")
    max_pos_result = await db.execute(
        select(func.coalesce(func.max(WishlistItem.position), -1)).where(WishlistItem.wishlist_id == wishlist.id)
    )
    max_row = max_pos_result.first()
    position = int(max_row[0] if max_row is not None else -1) + 1
    item = WishlistItem(
        wishlist_id=wishlist.id,
        title=suggestion.title,
        link_url=suggestion.link_url,
        description=suggestion.message,
        position=position,
        contributed_by_id=suggestion.suggested_by_id,
    )
    db.add(item)
    suggestion.status = "accepted"
    await db.flush()
    if suggestion.suggested_by_id:
        notif = Notification(
            user_id=suggestion.suggested_by_id,
            kind="suggestion_accepted",
            title="Your suggestion was added",
            body=f'"{suggestion.title}" was added to the wishlist.',
        )
        db.add(notif)
    await db.flush()
    room = manager.room_key(str(wishlist.id), None)
    if room:
        await manager.broadcast_to_room(room, "suggestion_removed", {"suggestion_id": str(suggestion.id)})
    return None


@router.post("/{wishlist_id}/suggestions/{suggestion_id}/reject", status_code=status.HTTP_204_NO_CONTENT)
async def reject_wishlist_suggestion(
    wishlist_id: str,
    suggestion_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Reject suggestion. Owner only."""
    from uuid import UUID

    wishlist, _ = await get_wishlist_with_access(wishlist_id, db, user=current_user)
    if str(wishlist.owner_id) != str(current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only owner can reject")
    try:
        sid = UUID(suggestion_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Suggestion not found")
    result = await db.execute(
        select(WishlistSuggestion).where(
            WishlistSuggestion.id == sid,
            WishlistSuggestion.wishlist_id == wishlist.id,
            WishlistSuggestion.status == "pending",
        )
    )
    suggestion = result.scalar_one_or_none()
    if not suggestion:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Suggestion not found")
    suggestion.status = "rejected"
    await db.flush()
    room = manager.room_key(str(wishlist.id), None)
    if room:
        await manager.broadcast_to_room(room, "suggestion_removed", {"suggestion_id": str(suggestion.id)})
    return None


@router.get("/{wishlist_id}", response_model=WishlistResponse)
async def get_wishlist(
    wishlist_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    wishlist, _ = await get_wishlist_with_access(wishlist_id, db, user=current_user)
    return wishlist


@router.patch("/{wishlist_id}", response_model=WishlistResponse)
async def update_wishlist(
    wishlist_id: str,
    body: WishlistUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    wishlist, _ = await get_wishlist_with_access(
        wishlist_id, db, user=current_user, require_edit=True
    )
    if body.title is not None:
        wishlist.title = body.title
    if body.description is not None:
        wishlist.description = body.description
    if body.is_public is not None:
        wishlist.is_public = body.is_public
    if body.sort_order is not None:
        wishlist.sort_order = body.sort_order
    if body.due_date is not None:
        wishlist.due_date = body.due_date
    await db.flush()
    await db.refresh(wishlist)
    return wishlist


@router.delete("/{wishlist_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_wishlist(
    wishlist_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    wishlist, _ = await get_wishlist_with_access(wishlist_id, db, user=current_user)
    if str(wishlist.owner_id) != str(current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only owner can delete")
    title_saved = wishlist.title
    affected_user_ids = set()
    shares = await db.execute(select(Share).where(Share.wishlist_id == wishlist.id))
    for s in shares.scalars().all():
        if str(s.user_id) != str(current_user.id):
            affected_user_ids.add(s.user_id)
    items = await db.execute(select(WishlistItem).where(WishlistItem.wishlist_id == wishlist.id))
    item_list = list(items.scalars().all())
    item_ids = [i.id for i in item_list]
    for i in item_list:
        if i.reserved_by_id and str(i.reserved_by_id) != str(current_user.id):
            affected_user_ids.add(i.reserved_by_id)
        if i.contributed_by_id and str(i.contributed_by_id) != str(current_user.id):
            affected_user_ids.add(i.contributed_by_id)
    
    # Load contributions before delete (cascade will remove them)
    # Per-user: total paid per currency, has any pledged
    user_paid_by_currency: dict[UUID, dict[str, float]] = {}  # {user_id: {currency: total_amount}}
    user_pledged_only: set[UUID] = set()
    if item_ids:
        contribs_result = await db.execute(
            select(ItemContribution.user_id, ItemContribution.amount, ItemContribution.status, WishlistItem.currency).join(
                WishlistItem, ItemContribution.item_id == WishlistItem.id
            ).where(
                ItemContribution.item_id.in_(item_ids),
                ItemContribution.user_id != current_user.id,
            )
        )
        contribs = list(contribs_result.all())
        for c in contribs:
            uid = c.user_id
            if str(uid) == str(current_user.id):
                continue
            amt = float(c.amount)
            currency = (c.currency or "").strip()
            if getattr(c, "status", None) == "paid":
                if uid not in user_paid_by_currency:
                    user_paid_by_currency[uid] = {}
                user_paid_by_currency[uid][currency] = user_paid_by_currency[uid].get(currency, 0) + amt
            else:
                user_pledged_only.add(uid)
        # Also add contributors to affected_user_ids for wishlist_deleted notification
        contribs_user_ids = await db.execute(
            select(ItemContribution.user_id).where(
                ItemContribution.item_id.in_(item_ids),
                ItemContribution.user_id != current_user.id,
            )
        )
        for row in contribs_user_ids.all():
            affected_user_ids.add(row.user_id)
    
    # Notify contributors who paid (refund) - per currency
    for uid, currency_totals in user_paid_by_currency.items():
        for currency, total_paid in currency_totals.items():
            if total_paid <= 0:
                continue
            db.add(
                Notification(
                    user_id=uid,
                    kind="refund_paid",
                    title="Refund",
                    body=f'You were refunded {total_paid:.2f} {currency or ""}. The wishlist was deleted by the owner.',
                    payload={
                        "amount": round(total_paid, 2),
                        "currency": currency or "",
                        "list_title": title_saved,
                    },
                )
            )
    
    # Notify contributors who only pledged, shared users, and others
    for uid in affected_user_ids:
        # Skip if already notified about refund
        if uid in user_paid_by_currency:
            continue
        n = Notification(
            user_id=uid,
            kind="wishlist_deleted",
            title="Wishlist deleted",
            body=f'"{title_saved}" was deleted by the owner. You no longer have access to it.',
            payload={"list_title": title_saved},
        )
        db.add(n)
    await db.flush()
    await db.delete(wishlist)
    await db.flush()
    return None
