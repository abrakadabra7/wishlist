"""Aggregate all v1 API routers."""
from fastapi import APIRouter

from app.api.v1 import auth, users, wishlists, items, shares, public, public_links, ws, metadata, notifications

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(wishlists.router)
api_router.include_router(items.router)
api_router.include_router(shares.router)
api_router.include_router(public.router)
api_router.include_router(public_links.router)
api_router.include_router(metadata.router)
api_router.include_router(notifications.router)
api_router.include_router(ws.router)
