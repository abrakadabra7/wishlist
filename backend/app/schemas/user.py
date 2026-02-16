"""User schemas."""
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class UserBase(BaseModel):
    email: EmailStr
    display_name: str | None = None


class UserCreate(UserBase):
    password: str = Field(..., min_length=8, max_length=72, description="8-72 characters (bcrypt limit)")


class UserUpdate(BaseModel):
    display_name: str | None = None
    avatar_url: str | None = None


class UserResponse(UserBase):
    id: UUID
    avatar_url: str | None = None

    model_config = {"from_attributes": True, "extra": "ignore"}
