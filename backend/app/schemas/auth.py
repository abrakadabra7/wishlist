"""Auth schemas."""
from pydantic import BaseModel, EmailStr, Field, field_validator


def _truncate_to_72_bytes(s: str) -> str:
    """Bcrypt limit: 72 bytes. Truncate so hash never fails."""
    b = s.encode("utf-8")
    if len(b) <= 72:
        return s
    return b[:72].decode("utf-8", errors="ignore") or s[:72]


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128, description="8+ characters (stored up to 72 bytes)")
    display_name: str | None = None

    @field_validator("password")
    @classmethod
    def password_72_bytes(cls, v: str) -> str:
        return _truncate_to_72_bytes(v)


class TokenPayload(BaseModel):
    sub: str
    type: str
    exp: int


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str
