# websocket.py
import json
import logging
from typing import Dict, List
from fastapi import WebSocket, APIRouter, WebSocketDisconnect

logger = logging.getLogger("app.api.websocket")
router = APIRouter()

class ConnectionManager:
    """Manages active WebSocket connections for streaming real-time analysis progress."""

    def __init__(self):
        # Maps analysis_id -> list of active websockets
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, analysis_id: int):
        """Accepts a connection and registers it to the analysis_id channel."""
        await websocket.accept()
        if analysis_id not in self.active_connections:
            self.active_connections[analysis_id] = []
        self.active_connections[analysis_id].append(websocket)
        logger.info(f"WebSocket client connected to analysis {analysis_id}. Total active: {len(self.active_connections[analysis_id])}")

    def disconnect(self, websocket: WebSocket, analysis_id: int):
        """Unregisters a closed connection."""
        if analysis_id in self.active_connections:
            if websocket in self.active_connections[analysis_id]:
                self.active_connections[analysis_id].remove(websocket)
            if not self.active_connections[analysis_id]:
                del self.active_connections[analysis_id]
        logger.info(f"WebSocket client disconnected from analysis {analysis_id}.")

    async def broadcast(self, analysis_id: int, message: dict):
        """Sends a JSON message to all clients listening to a specific analysis_id."""
        if analysis_id in self.active_connections:
            dead_sockets = []
            for connection in self.active_connections[analysis_id]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logger.warning(f"Error broadcasting to socket on analysis {analysis_id}: {e}")
                    dead_sockets.append(connection)
            
            # Clean up dead sockets
            for ws in dead_sockets:
                self.disconnect(ws, analysis_id)

# Global connection manager singleton
manager = ConnectionManager()

@router.websocket("/ws/analysis/{analysis_id}")
async def websocket_endpoint(websocket: WebSocket, analysis_id: int):
    """WebSocket route that subscribes to real-time logs for a specific scan ID."""
    await manager.connect(websocket, analysis_id)
    try:
        # Keep connection open, ignore incoming client messages for now (uni-directional stream)
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, analysis_id)
    except Exception as e:
        logger.error(f"WebSocket exception on analysis {analysis_id}: {e}")
        manager.disconnect(websocket, analysis_id)
