"""Wishlist share endpoints."""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_wishlist_with_access
from app.db.session import get_db
from app.models.user import User
from app.models.wishlist import Wishlist
from app.models.share import Share
from app.schemas.share import ShareCreate, ShareResponse

router = APIRouter(tags=["shares"])


@router.get("/wishlists/{wishlist_id}/shares", response_model=list[ShareResponse])
async def list_shares(
    wishlist_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    wishlist, _ = await get_wishlist_with_access(wishlist_id, db, user=current_user)
    if str(wishlist.owner_id) != str(current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only owner can list shares")
    result = await db.execute(select(Share).where(Share.wishlist_id == wishlist.id))
    return list(result.scalars().all())


@router.post(
    "/wishlists/{wishlist_id}/shares",
    response_model=ShareResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_share(
    wishlist_id: str,
    body: ShareCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.models.user import User as UserModel

    wishlist, _ = await get_wishlist_with_access(wishlist_id, db, user=current_user)
    if str(wishlist.owner_id) != str(current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only owner can share")
    user_result = await db.execute(select(UserModel).where(UserModel.email == body.email))
    share_user = user_result.scalar_one_or_none()
    if not share_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found with this email")
    if str(share_user.id) == str(current_user.id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot share with yourself")
    existing = await db.execute(
        select(Share).where(Share.wishlist_id == wishlist.id, Share.user_id == share_user.id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Already shared with this user")
    share = Share(wishlist_id=wishlist.id, user_id=share_user.id, role=body.role)
    db.add(share)
    await db.flush()
    await db.refresh(share)
    return share


@router.delete(
    "/wishlists/{wishlist_id}/shares/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_share(
    wishlist_id: str,
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    wishlist, _ = await get_wishlist_with_access(wishlist_id, db, user=current_user)
    if str(wishlist.owner_id) != str(current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only owner can remove share")
    try:
        uid = UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invalid user id")
    result = await db.execute(
        select(Share).where(
            Share.wishlist_id == wishlist.id,
            Share.user_id == uid,
        )
    )
    share = result.scalar_one_or_none()
    if not share:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Share not found")
    await db.delete(share)
    await db.flush()
    return None
