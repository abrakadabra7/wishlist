"""Public link creation and token generation."""
import secrets
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.public_link import PublicLink


def generate_token() -> str:
    length = get_settings().public_link_token_length
    return secrets.token_urlsafe(length)[:length]


async def get_or_create_public_link(
    db: AsyncSession,
    wishlist_id: UUID,
    expires_at=None,
    max_views: int | None = None,
) -> PublicLink:
    result = await db.execute(
        select(PublicLink).where(PublicLink.wishlist_id == wishlist_id)
    )
    existing = result.scalar_one_or_none()
    if existing:
        if expires_at is not None:
            existing.expires_at = expires_at
        if max_views is not None:
            existing.max_views = max_views
        await db.flush()
        await db.refresh(existing)
        return existing
    link = PublicLink(
        wishlist_id=wishlist_id,
        token=generate_token(),
        expires_at=expires_at,
        max_views=max_views,
    )
    db.add(link)
    await db.flush()
    await db.refresh(link)
    return link


async def revoke_public_link(db: AsyncSession, wishlist_id: UUID) -> bool:
    result = await db.execute(select(PublicLink).where(PublicLink.wishlist_id == wishlist_id))
    link = result.scalar_one_or_none()
    if not link:
        return False
    await db.delete(link)
    await db.flush()
    return True
