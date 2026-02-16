"""Application configuration from environment."""
from functools import lru_cache
from typing import List

from pydantic import ValidationInfo, field_validator, computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # App
    app_name: str = "Wishlist API"
    debug: bool = False

    # Database (async for app; sync for Alembic - set DATABASE_URL_SYNC or it's derived from database_url)
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/wishlist"
    database_url_sync: str | None = None  # If None, derived from database_url

    @field_validator("database_url_sync", mode="after")
    @classmethod
    def derive_sync_url(cls, v: str | None, info: ValidationInfo):
        if v is not None and v != "":
            return v
        url = info.data.get("database_url") or ""
        if url.startswith("postgresql+asyncpg://"):
            return url.replace("postgresql+asyncpg://", "postgresql://", 1)
        if url.startswith("postgresql://"):
            return url
        return "postgresql://postgres:postgres@localhost:5432/wishlist"

    # JWT
    jwt_secret_key: str = "change-me-in-production-use-long-random-string"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7

    # CORS: .env'de string (virgülle ayrılmış) - List[str] pydantic-settings tarafından JSON parse edildiği için str kullanıyoruz
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"

    @computed_field
    @property
    def cors_origins_list(self) -> List[str]:
        s = (self.cors_origins or "").strip()
        if not s:
            return ["http://localhost:3000", "http://127.0.0.1:3000"]
        return [x.strip() for x in s.split(",") if x.strip()]

    # Public link token
    public_link_token_length: int = 32


@lru_cache
def get_settings() -> Settings:
    return Settings()
