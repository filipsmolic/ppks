from typing import List
from fastapi import APIRouter, Depends, HTTPException
from backend.rooms.models import *
from backend.auth.utils import *
from backend.rooms.utils import generate_room_code
from backend.db import get_pool
import asyncpg

router = APIRouter()


@router.post("/create")
async def create_room(pool: asyncpg.Pool = Depends(get_pool), user=Depends(get_current_user)):
    room_code = generate_room_code()

    async with pool.acquire() as conn:
        try:
            row = await conn.fetchrow("""
                INSERT INTO rooms (room_code, created_by)
                VALUES ($1, $2)
                RETURNING room_id, room_code
            """, room_code, user["user_id"])
            return {"room_id": row["room_id"], "room_code": row["room_code"]}
        except asyncpg.UniqueViolationError:
            raise HTTPException(
                status_code=400, detail="Room code already exists. Try again.")


@router.get("/{room_code}")
async def get_room_by_code(room_code: str, pool: asyncpg.Pool = Depends(get_pool)):
    async with pool.acquire() as conn:
        room = await conn.fetchrow("SELECT room_id, room_code, created_by, status FROM rooms WHERE room_code = $1", room_code)
        if not room:
            raise HTTPException(status_code=404, detail="Room not found")
        return dict(room)


@router.get("/{room_code}/questions", response_model=List[QuestionOut])
async def get_questions_by_room_code(
    room_code: str,
    pool: asyncpg.pool.Pool = Depends(get_pool),
    user=Depends(get_current_user)
):
    async with pool.acquire() as conn:
        room = await conn.fetchrow("SELECT room_id FROM rooms WHERE room_code = $1", room_code)
        if not room:
            raise HTTPException(status_code=404, detail="Room not found")

        questions = await conn.fetch("""
            SELECT 
                q.question_id,
                q.question_title,
                q.question_text,
                q.estimate,
                q.is_estimated,
                q.created_at,
                COUNT(v.vote_id) AS vote_count
            FROM questions q
            LEFT JOIN votes v ON q.question_id = v.question_id
            WHERE q.room_id = $1
            GROUP BY q.question_id
            ORDER BY q.created_at DESC
        """, room["room_id"])

        if not questions:
            raise HTTPException(
                status_code=404, detail="No questions found for this room.")

        question_ids = [q["question_id"] for q in questions]

        user_votes = await conn.fetch(
            """
                SELECT question_id
                FROM votes
                WHERE user_id = $1 AND question_id = ANY($2)
            """,
            user["user_id"],
            [qid for qid in question_ids]
        )
        voted_ids = {v["question_id"] for v in user_votes}

        results = []
        for q in questions:
            q_dict = dict(q)
            q_dict["voted"] = q["question_id"] in voted_ids
            results.append(q_dict)

        return results


@router.get("/users/{user_id}")
async def get_user_by_id(user_id: str):
    pool = get_pool()

    async with pool.acquire() as conn:
        user = await conn.fetchrow(
            """
            SELECT user_id, username
            FROM users
            WHERE user_id = $1
            """,
            int(user_id)
        )

        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        return {
            "user_id": user["user_id"],
            "user_name": user["username"]
        }


@router.get("/created/myrooms", response_model=List[RoomOut])
async def get_user_created_rooms(user=Depends(get_current_user)):
    pool = get_pool()

    async with pool.acquire() as conn:
        rooms = await conn.fetch("""
            SELECT *
            FROM rooms
            WHERE created_by = $1
            ORDER BY created_at DESC
        """, user["user_id"])

        return [dict(room) for room in rooms]


@router.put("/deactivate/{room_id}")
async def deactivate_room(
    room_id: str,
    user=Depends(get_current_user)
):
    pool = get_pool()

    async with pool.acquire() as conn:
        room = await conn.fetchrow("""
            SELECT room_id FROM rooms
            WHERE room_id = $1 AND created_by = $2
        """, int(room_id), user["user_id"])

        if not room:
            raise HTTPException(
                status_code=404, detail="Room not found or not authorized to deactivate.")

        await conn.execute("UPDATE rooms SET status = 1 WHERE room_id = $1", int(room_id))

    return {"detail": "Room deactivated successfully."}


@router.put("/activate/{room_id}")
async def activate_room(
    room_id: str,
    pool: asyncpg.pool.Pool = Depends(get_pool),
    user=Depends(get_current_user)
):
    async with pool.acquire() as conn:
        room = await conn.fetchrow("""
            SELECT room_id FROM rooms
            WHERE room_id = $1 AND created_by = $2
        """, int(room_id), user["user_id"])

        if not room:
            raise HTTPException(
                status_code=404, detail="Room not found or not authorized to activate.")

        await conn.execute("UPDATE rooms SET status = 0 WHERE room_id = $1", int(room_id))

    return {"detail": "Room activated successfully."}
