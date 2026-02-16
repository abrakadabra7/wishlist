"""Shared API dependencies: DB session, auth, wishlist access."""
from uuid import UUID
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.models.user import User
from app.models.wishlist import Wishlist
from app.models.share import Share
from app.models.public_link import PublicLink
from app.core.security import decode_token

security = HTTPBearer(auto_error=False)
async def get_current_user_optional(
    db: Annotated[AsyncSession, Depends(get_db)],
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security)],
) -> User | None:
    if not credentials:
        return None
    payload = decode_token(credentials.credentials)
    if not payload or payload.get("type") != "access":
        return None
    sub = payload.get("sub")
    if not sub:
        return None
    try:
        user_id = UUID(sub)
    except ValueError:
        return None
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    return user


async def get_current_user(
    user: Annotated[User | None, Depends(get_current_user_optional)],
) -> User:
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def require_owner_or_editor(wishlist: Wishlist, user: User, share_role: str | None) -> None:
    if str(wishlist.owner_id) == str(user.id):
        return
    if share_role == "editor":
        return
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Not allowed to modify this wishlist",
    )


def require_owner_or_share(wishlist: Wishlist, user: User, share_role: str | None) -> None:
    if str(wishlist.owner_id) == str(user.id):
        return
    if share_role in ("viewer", "editor"):
        return
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Not allowed to access this wishlist",
    )


async def get_wishlist_with_access(
    wishlist_id: str,
    db: AsyncSession,
    user: User,
    require_edit: bool = False,
) -> tuple[Wishlist, str | None]:
    """Load wishlist and return (wishlist, share_role or None). Raises 404/403."""
    from uuid import UUID

    try:
        uid = UUID(wishlist_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Wishlist not found")
    result = await db.execute(
        select(Wishlist).where(Wishlist.id == uid)
    )
    wishlist = result.scalar_one_or_none()
    if not wishlist:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Wishlist not found")
    if str(wishlist.owner_id) == str(user.id):
        return wishlist, None
    share_result = await db.execute(
        select(Share).where(Share.wishlist_id == uid, Share.user_id == user.id)
    )
    share = share_result.scalar_one_or_none()
    if not share:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to access this wishlist")
    if require_edit and share.role != "editor":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Editor role required")
    return wishlist, share.role


async def get_public_link_wishlist(
    token: str,
    db: AsyncSession,
) -> tuple[Wishlist, PublicLink]:
    """Resolve public token to wishlist. Raises 404/403 if invalid or expired."""
    result = await db.execute(
        select(PublicLink).where(PublicLink.token == token).options(
            selectinload(PublicLink.wishlist)
        )
    )
    link = result.scalar_one_or_none()
    if not link:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invalid or expired link")
    from datetime import datetime, timezone
    if link.expires_at and link.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Link expired")
    if link.max_views is not None and link.view_count >= link.max_views:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Link view limit reached")
    wishlist = link.wishlist
    if not wishlist:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Wishlist not found")
    return wishlist, link
