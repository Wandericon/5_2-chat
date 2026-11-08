from datetime import datetime

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def now():
    return datetime.now().strftime("%H:%M:%S")


class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, WebSocket] = {}

    async def connect(self, username: str, websocket: WebSocket) -> bool:
        await websocket.accept()
        if username in self.active_connections:
            await websocket.send_json({
                "type": "system",
                "text": f"Имя «{username}» уже занято",
                "timestamp": now(),
            })
            await websocket.close(code=1008)
            return False
        self.active_connections[username] = websocket
        return True

    def disconnect(self, username: str):
        self.active_connections.pop(username, None)

    async def broadcast(self, message: dict):
        for name, ws in list(self.active_connections.items()):
            try:
                await ws.send_json(message)
            except Exception:
                self.active_connections.pop(name, None)


manager = ConnectionManager()


@app.websocket("/ws/{username}")
async def websocket_endpoint(websocket: WebSocket, username: str):
    username = username.strip()
    if not username:
        await websocket.close(code=1008)
        return

    if not await manager.connect(username, websocket):
        return

    await manager.broadcast({
        "type": "system",
        "text": f"Пользователь {username} вошел в чат",
        "timestamp": now(),
    })

    try:
        while True:
            data = await websocket.receive_json()
            text = str(data.get("text", "")).strip()
            if not text:
                continue
            await manager.broadcast({
                "type": "user",
                "username": username,
                "text": text,
                "timestamp": now(),
            })
    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"Ошибка у {username}: {e}")
    finally:
        manager.disconnect(username)
        await manager.broadcast({
            "type": "system",
            "text": f"Пользователь {username} вышел из чата",
            "timestamp": now(),
        })
