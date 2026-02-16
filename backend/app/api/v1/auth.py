"""Auth endpoints: register, login, refresh."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.schemas.auth import LoginRequest, RegisterRequest, RefreshRequest, Token
from app.schemas.user import UserResponse
from app.services.auth_service import (
    register_user,
    authenticate_user,
    create_tokens_for_user,
    refresh_access_token,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=Token)
async def register(
    body: RegisterRequest,
    db: AsyncSession = Depends(get_db),
):
    try:
        user = await register_user(
            db,
            email=body.email,
            password=body.password,
            display_name=body.display_name,
        )
    except ValueError as e:
        msg = str(e)
        if "72 bytes" in msg or "72 character" in msg.lower():
            msg = "Password must be 8–72 characters."
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)
    access, refresh = create_tokens_for_user(user)
    return Token(access_token=access, refresh_token=refresh)


@router.post("/login", response_model=Token)
async def login(
    body: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    user = await authenticate_user(db, body.email, body.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    access, refresh = create_tokens_for_user(user)
    return Token(access_token=access, refresh_token=refresh)


@router.post("/refresh", response_model=dict)
async def refresh(
    body: RefreshRequest,
    db: AsyncSession = Depends(get_db),
):
    access = await refresh_access_token(db, body.refresh_token)
    if not access:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )
    return {"access_token": access, "token_type": "bearer"}
