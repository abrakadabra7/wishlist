"""WebSocket connection manager: rooms and broadcast."""
import asyncio
import json
import logging
from typing import Any

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manage WebSocket connections per room (list:<wishlist_id>). Thread-safe room updates."""

    def __init__(self) -> None:
        self._rooms: dict[str, set[WebSocket]] = {}
        self._lock = asyncio.Lock()

    def _room_key(self, wishlist_id: str | None, public_token: str | None) -> str | None:
        if public_token:
            return f"public:{public_token}"
        if wishlist_id:
            return f"list:{wishlist_id}"
        return None

    def room_key(self, wishlist_id: str | None, public_token: str | None) -> str | None:
        return self._room_key(wishlist_id, public_token)

    async def add_to_room(self, websocket: WebSocket, room: str) -> None:
        """Add an already-accepted connection to a room."""
        async with self._lock:
            if room not in self._rooms:
                self._rooms[room] = set()
            self._rooms[room].add(websocket)

    async def connect(
        self,
        websocket: WebSocket,
        wishlist_id: str | None = None,
        public_token: str | None = None,
    ) -> str | None:
        """Accept and add to room. Use when connection is not yet accepted."""
        room = self._room_key(wishlist_id, public_token)
        if not room:
            return None
        await websocket.accept()
        await self.add_to_room(websocket, room)
        return room

    async def disconnect(self, websocket: WebSocket, room: str | None) -> None:
        if not room:
            return
        async with self._lock:
            if room in self._rooms:
                self._rooms[room].discard(websocket)
                if not self._rooms[room]:
                    del self._rooms[room]

    async def send_personal(self, websocket: WebSocket, event: str, payload: dict[str, Any]) -> None:
        try:
            await websocket.send_json({"event": event, **payload})
        except Exception as e:
            logger.warning("WebSocket send_personal failed: %s", e)

    async def broadcast_to_room(
        self,
        room: str,
        event: str,
        payload: dict[str, Any],
        exclude: WebSocket | None = None,
    ) -> None:
        async with self._lock:
            if room not in self._rooms:
                return
            targets = [ws for ws in self._rooms[room] if ws is not exclude]
        if not targets:
            return
        message = json.dumps({"event": event, **payload})

        async def send_one(ws: WebSocket) -> bool:
            try:
                await ws.send_text(message)
                return True
            except Exception as e:
                logger.debug("Broadcast send failed: %s", e)
                return False

        results = await asyncio.gather(*[send_one(ws) for ws in targets], return_exceptions=True)
        dead = {ws for ws, ok in zip(targets, results) if ok is not True}
        if dead:
            async with self._lock:
                if room in self._rooms:
                    for ws in dead:
                        self._rooms[room].discard(ws)
                    if not self._rooms[room]:
                        del self._rooms[room]


# Singleton
manager = ConnectionManager()
