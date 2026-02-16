"""Fetch product metadata from URL (for autocomplete by link)."""
from fastapi import APIRouter, Depends, Query

from app.api.deps import get_current_user
from app.models.user import User
from app.services.link_metadata import fetch_link_metadata

router = APIRouter(tags=["metadata"])


@router.get("/metadata")
async def get_link_metadata(
    url: str = Query(..., description="Product page URL"),
    current_user: User = Depends(get_current_user),
):
    """Fetch title, image URL, and price from a product link. Used for autocomplete when adding items."""
    data = await fetch_link_metadata(url)
    return data
