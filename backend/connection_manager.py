from typing import Dict, Set
from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, room_code: str, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.setdefault(room_code, set()).add(websocket)

    def disconnect(self, room_code: str, websocket: WebSocket):
        if room_code in self.active_connections:
            self.active_connections[room_code].discard(websocket)

    async def broadcast(self, room_code: str, message: dict):
        for conn in self.active_connections.get(room_code, []):
            await conn.send_json(message)
