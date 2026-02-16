"""Auth service: register, login, token refresh."""
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from app.models.user import User


async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
    result = await db.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()


def _password_to_72_bytes(password: str) -> str:
    """Bcrypt 72 byte limit; truncate by bytes so hash never fails."""
    b = password.encode("utf-8")
    if len(b) <= 72:
        return password
    return b[:72].decode("utf-8", errors="ignore") or password[:72]


async def register_user(
    db: AsyncSession,
    email: str,
    password: str,
    display_name: str | None = None,
) -> User:
    existing = await get_user_by_email(db, email)
    if existing:
        raise ValueError("Email already registered")
    password_safe = _password_to_72_bytes(password)
    user = User(
        email=email,
        password_hash=get_password_hash(password_safe),
        display_name=display_name,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)
    return user


async def authenticate_user(db: AsyncSession, email: str, password: str) -> User | None:
    user = await get_user_by_email(db, email)
    if not user or not verify_password(password, user.password_hash):
        return None
    return user


def create_tokens_for_user(user: User) -> tuple[str, str]:
    access = create_access_token(subject=str(user.id))
    refresh = create_refresh_token(subject=str(user.id))
    return access, refresh


async def get_user_by_id(db: AsyncSession, user_id: UUID) -> User | None:
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def refresh_access_token(db: AsyncSession, refresh_token: str) -> str | None:
    payload = decode_token(refresh_token)
    if not payload or payload.get("type") != "refresh":
        return None
    sub = payload.get("sub")
    if not sub:
        return None
    try:
        uid = UUID(sub)
    except ValueError:
        return None
    user = await get_user_by_id(db, uid)
    if not user:
        return None
    return create_access_token(subject=str(user.id))
