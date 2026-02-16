"""WebSocket endpoint: subscribe to wishlist room, receive real-time events."""
import asyncio
import json
import logging
import time
from uuid import UUID

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_token
from app.core.websocket import manager
from app.db.session import async_session_maker
from app.models.user import User
from app.models.wishlist import Wishlist
from app.models.share import Share
from app.models.public_link import PublicLink

logger = logging.getLogger(__name__)

router = APIRouter(tags=["websocket"])

# In-memory rate limit: IP -> (count, window_start)
_ws_connect_count: dict[str, tuple[int, float]] = {}
_ws_rate_window_sec = 60
_ws_rate_max = 20


def _check_ws_rate_limit(client_host: str | None) -> bool:
    if not client_host:
        return True
    now = time.monotonic()
    if client_host not in _ws_connect_count:
        _ws_connect_count[client_host] = (1, now)
        return True
    count, start = _ws_connect_count[client_host]
    if now - start > _ws_rate_window_sec:
        _ws_connect_count[client_host] = (1, now)
        return True
    if count >= _ws_rate_max:
        return False
    _ws_connect_count[client_host] = (count + 1, start)
    return True


async def get_user_from_token(access_token: str) -> User | None:
    payload = decode_token(access_token)
    if not payload or payload.get("type") != "access":
        return None
    sub = payload.get("sub")
    if not sub:
        return None
    try:
        user_id = UUID(sub)
    except ValueError:
        return None
    async with async_session_maker() as db:
        result = await db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()


async def check_wishlist_access(db: AsyncSession, wishlist_id: UUID, user_id: UUID) -> bool:
    result = await db.execute(select(Wishlist).where(Wishlist.id == wishlist_id))
    wishlist = result.scalar_one_or_none()
    if not wishlist:
        return False
    if str(wishlist.owner_id) == str(user_id):
        return True
    share_result = await db.execute(
        select(Share).where(Share.wishlist_id == wishlist_id, Share.user_id == user_id)
    )
    return share_result.scalar_one_or_none() is not None


async def resolve_public_token(db: AsyncSession, token: str) -> UUID | None:
    from datetime import datetime, timezone

    result = await db.execute(select(PublicLink).where(PublicLink.token == token))
    link = result.scalar_one_or_none()
    if not link:
        return None
    if link.expires_at and link.expires_at < datetime.now(timezone.utc):
        return None
    if link.max_views is not None and link.view_count >= link.max_views:
        return None
    return link.wishlist_id


async def _heartbeat_loop(websocket: WebSocket, interval: float = 25.0) -> None:
    """Send ping periodically to keep connection alive and detect dead clients."""
    try:
        while True:
            await asyncio.sleep(interval)
            await websocket.send_json({"event": "ping", "ts": time.time()})
    except Exception:
        pass


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    access_token: str | None = Query(None, alias="access_token"),
    public_token: str | None = Query(None, alias="public_token"),
):
    """Connect with ?access_token=... or ?public_token=... or send auth/subscribe in first message."""
    client_host = websocket.client.host if websocket.client else None
    if not _check_ws_rate_limit(client_host):
        await websocket.close(code=4429)
        return
    room: str | None = None
    heartbeat_task: asyncio.Task | None = None
    try:
        if public_token:
            async with async_session_maker() as db:
                wid = await resolve_public_token(db, public_token)
                if not wid:
                    await websocket.close(code=4001)
                    return
                room = manager.room_key(str(wid), None)
                if room:
                    await manager.connect(websocket, wishlist_id=str(wid), public_token=None)
            if room:
                await manager.send_personal(websocket, "subscribed", {"wishlist_id": str(wid), "public": True})
                heartbeat_task = asyncio.create_task(_heartbeat_loop(websocket))
        elif access_token:
            user = await get_user_from_token(access_token)
            if not user:
                await websocket.close(code=4001)
                return
            # Need subscribe message with wishlist_id
            await websocket.accept()
            raw = await websocket.receive_text()
            data = json.loads(raw)
            event = data.get("event")
            if event == "subscribe":
                wid_str = data.get("wishlist_id")
                if not wid_str:
                    await manager.send_personal(websocket, "error", {"code": "invalid", "message": "wishlist_id required"})
                    await websocket.close()
                    return
                try:
                    wid = UUID(wid_str)
                except ValueError:
                    await manager.send_personal(websocket, "error", {"code": "invalid", "message": "Invalid wishlist_id"})
                    await websocket.close()
                    return
                async with async_session_maker() as db:
                    if not await check_wishlist_access(db, wid, user.id):
                        await manager.send_personal(websocket, "error", {"code": "forbidden", "message": "No access"})
                        await websocket.close()
                        return
                room = manager.room_key(wid_str, None)
                if room:
                    await manager.add_to_room(websocket, room)
                    await manager.send_personal(websocket, "subscribed", {"wishlist_id": wid_str})
                    heartbeat_task = asyncio.create_task(_heartbeat_loop(websocket))
            else:
                await manager.send_personal(websocket, "error", {"code": "invalid", "message": "Expected subscribe"})
                await websocket.close()
                return
        else:
            await websocket.accept()
            raw = await websocket.receive_text()
            data = json.loads(raw)
            event = data.get("event")
            if event == "auth":
                token = data.get("access_token")
                if not token:
                    await manager.send_personal(websocket, "error", {"code": "invalid", "message": "access_token required"})
                    await websocket.close()
                    return
                user = await get_user_from_token(token)
                if not user:
                    await manager.send_personal(websocket, "error", {"code": "unauthorized", "message": "Invalid token"})
                    await websocket.close()
                    return
                await manager.send_personal(websocket, "authenticated", {"user_id": str(user.id)})
                # Wait for subscribe
                raw2 = await websocket.receive_text()
                data2 = json.loads(raw2)
                if data2.get("event") != "subscribe":
                    await manager.send_personal(websocket, "error", {"code": "invalid", "message": "Expected subscribe"})
                    await websocket.close()
                    return
                wid_str = data2.get("wishlist_id")
                if not wid_str:
                    await manager.send_personal(websocket, "error", {"code": "invalid", "message": "wishlist_id required"})
                    await websocket.close()
                    return
                try:
                    wid = UUID(wid_str)
                except ValueError:
                    await manager.send_personal(websocket, "error", {"code": "invalid", "message": "Invalid wishlist_id"})
                    await websocket.close()
                    return
                async with async_session_maker() as db:
                    if not await check_wishlist_access(db, wid, user.id):
                        await manager.send_personal(websocket, "error", {"code": "forbidden", "message": "No access"})
                        await websocket.close()
                        return
                room = manager.room_key(wid_str, None)
                if room:
                    await manager.add_to_room(websocket, room)
                    await manager.send_personal(websocket, "subscribed", {"wishlist_id": wid_str})
                    heartbeat_task = asyncio.create_task(_heartbeat_loop(websocket))
            elif event == "subscribe_public":
                pt = data.get("public_token")
                if not pt:
                    await manager.send_personal(websocket, "error", {"code": "invalid", "message": "public_token required"})
                    await websocket.close()
                    return
                async with async_session_maker() as db:
                    wid = await resolve_public_token(db, pt)
                if not wid:
                    await manager.send_personal(websocket, "error", {"code": "forbidden", "message": "Invalid or expired link"})
                    await websocket.close()
                    return
                room = manager.room_key(str(wid), None)
                if room:
                    await manager.add_to_room(websocket, room)
                    await manager.send_personal(websocket, "subscribed", {"wishlist_id": str(wid), "public": True})
                    heartbeat_task = asyncio.create_task(_heartbeat_loop(websocket))
            else:
                await manager.send_personal(websocket, "error", {"code": "invalid", "message": "Expected auth or subscribe_public"})
                await websocket.close()
                return

        if not room:
            await websocket.close(code=4001)
            return

        # Message loop (pong and unsubscribe)
        while True:
            raw = await websocket.receive_text()
            try:
                data = json.loads(raw)
                event = data.get("event")
                if event == "unsubscribe":
                    break
                if event == "pong":
                    continue
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        pass
    finally:
        if heartbeat_task and not heartbeat_task.done():
            heartbeat_task.cancel()
            try:
                await heartbeat_task
            except asyncio.CancelledError:
                pass
        if room:
            await manager.disconnect(websocket, room)
