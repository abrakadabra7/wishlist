"""Public link management (owner only)."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_wishlist_with_access
from app.db.session import get_db
from app.models.user import User
from app.schemas.public_link import PublicLinkCreate, PublicLinkResponse
from app.services.public_link_service import get_or_create_public_link, revoke_public_link

router = APIRouter(tags=["public-links"])


@router.post(
    "/wishlists/{wishlist_id}/public-link",
    response_model=PublicLinkResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_or_get_public_link(
    wishlist_id: str,
    body: PublicLinkCreate | None = None,  # optional: empty body creates link with defaults
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    wishlist, _ = await get_wishlist_with_access(wishlist_id, db, user=current_user)
    if str(wishlist.owner_id) != str(current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only owner can create public link")
    link = await get_or_create_public_link(
        db,
        wishlist_id=wishlist.id,
        expires_at=body.expires_at if body else None,
        max_views=body.max_views if body else None,
    )
    return link


@router.get("/wishlists/{wishlist_id}/public-link", response_model=PublicLinkResponse | None)
async def get_public_link(
    wishlist_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from sqlalchemy import select
    from app.models.public_link import PublicLink

    wishlist, _ = await get_wishlist_with_access(wishlist_id, db, user=current_user)
    if str(wishlist.owner_id) != str(current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only owner can view public link")
    result = await db.execute(select(PublicLink).where(PublicLink.wishlist_id == wishlist.id))
    link = result.scalar_one_or_none()
    return link


@router.delete("/wishlists/{wishlist_id}/public-link", status_code=status.HTTP_204_NO_CONTENT)
async def delete_public_link(
    wishlist_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    wishlist, _ = await get_wishlist_with_access(wishlist_id, db, user=current_user)
    if str(wishlist.owner_id) != str(current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only owner can revoke public link")
    await revoke_public_link(db, wishlist.id)
    return None