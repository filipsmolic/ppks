from fastapi import FastAPI

from contextlib import asynccontextmanager
from backend.auth.routes import router as auth_router
from backend.rooms.routes import router as room_router
from backend.websocket import router as ws_router
from backend.db import init_db
from fastapi.middleware.cors import CORSMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield
    await app.state.pool.close()

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200"],  # Allow your Angular app's domain
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods (GET, POST, etc.)
    allow_headers=["*"],  # Allows all headers
)

app.include_router(auth_router, prefix="/auth", tags=["Auth"])
app.include_router(room_router, prefix="/rooms", tags=["Rooms"])
app.include_router(ws_router)
