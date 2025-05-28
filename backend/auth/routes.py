from fastapi import FastAPI, HTTPException, APIRouter
import asyncpg
from fastapi import FastAPI, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from datetime import datetime, timedelta
from backend.db import get_pool
from backend.auth.utils import *
from backend.auth.models import *

router = APIRouter()


@router.post("/token")
async def login(form_data: OAuth2PasswordRequestForm = Depends(), pool: asyncpg.pool.Pool = Depends(get_pool)):
    async with pool.acquire() as conn:
        user = await conn.fetchrow("SELECT * FROM users WHERE username = $1", form_data.username)
        if not user or not verify_password(form_data.password, user["password_hash"]):
            raise HTTPException(status_code=400, detail="Invalid credentials")

        token = create_access_token(data={"sub": str(user["user_id"])})
        return {"access_token": token, "token_type": "bearer", "user_id": user["user_id"]}


@router.post("/register")
async def register_user(payload: RegisterUserRequest, pool: asyncpg.pool.Pool = Depends(get_pool)):
    username = payload.username
    password = payload.password

    hashed_pw = hash_password(password)

    async with pool.acquire() as conn:
        existing = await conn.fetchval("SELECT 1 FROM users WHERE username = $1", username)
        if existing:
            raise HTTPException(
                status_code=400, detail="Username already taken")

        await conn.execute("""
            INSERT INTO users (username, password_hash)
            VALUES ($1, $2)
        """, username, hashed_pw)

    return {"message": "User registered successfully"}
