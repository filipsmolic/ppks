from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from .connection_manager import ConnectionManager
from .db import init_db, get_pool

router = APIRouter()
manager = ConnectionManager()


@router.websocket("/ws/{room_code}")
async def websocket_endpoint(websocket: WebSocket, room_code: str):
    await manager.connect(room_code, websocket)
    pool = get_pool()

    try:
        while True:
            data = await websocket.receive_json()
            event_type = data.get("type")

            if event_type == "vote":
                question_id = data.get("question_id")
                user_id = data.get("user_id")
                estimate = data.get("estimate")
                vote_count = 0

                async with pool.acquire() as conn:
                    try:
                        await conn.execute(
                            """
                            INSERT INTO votes (question_id, user_id, estimate)
                            VALUES ($1, $2, $3)
                            """,
                            int(question_id), int(user_id), int(estimate)
                        )

                        vote_count_row = await conn.fetchrow(
                            """
                            SELECT COUNT(*) AS vote_count 
                            FROM votes
                            WHERE question_id = $1
                            """,
                            question_id
                        )

                        vote_count = vote_count_row['vote_count'] if vote_count_row else 0
                    except Exception as e:
                        print("Vote insert error:", e)

                await manager.broadcast(room_code, {
                    "type": "vote_update",
                    "question_id": question_id,
                    "user_id": user_id,
                    "vote_count": vote_count
                })

            elif event_type == "join":
                user_id = data.get("user_id")
                await manager.broadcast(room_code, {
                    "type": "user_joined",
                    "user_id": user_id,
                    "count": len(manager.active_connections[room_code])
                })

            elif event_type == "leave":
                user_id = data.get("user_id")
                manager.disconnect(room_code, websocket)
                await manager.broadcast(room_code, {
                    "type": "user_left",
                    "user_id": user_id,
                    "count": len(manager.active_connections.get(room_code, []))
                })
                return

            elif event_type == "new_question":
                title = data.get("title")
                text = data.get("text")

                async with pool.acquire() as conn:
                    try:
                        result = await conn.fetchrow(
                            """
                            INSERT INTO questions (room_id, question_title, question_text)
                            VALUES (
                                (SELECT room_id FROM rooms WHERE room_code = $1),
                                $2, $3
                            )
                            RETURNING question_id, question_title, question_text
                            """,
                            room_code, title, text
                        )

                        if result:
                            new_question = dict(result)
                            await manager.broadcast(room_code, {
                                "type": "new_question",
                                "question": new_question
                            })
                    except Exception as e:
                        print("Error while inserting new question:", e)

            elif event_type == "close_vote":
                question_id = data.get("question_id")

                async with pool.acquire() as conn:
                    try:
                        votes = await conn.fetch(
                            """
                            SELECT estimate
                            FROM votes
                            WHERE question_id = $1
                            """,
                            question_id
                        )

                        if not votes:
                            raise HTTPException(
                                status_code=404, detail="No votes found for this question.")

                        estimates = sorted([vote['estimate']
                                           for vote in votes])
                        num_votes = len(estimates)
                        if num_votes % 2 == 1:
                            median = estimates[num_votes // 2]
                        else:
                            median = (
                                estimates[num_votes // 2 - 1] + estimates[num_votes // 2]) / 2

                        await conn.execute(
                            """
                            UPDATE questions
                            SET estimate = $1, is_estimated = 1
                            WHERE question_id = $2
                            """,
                            median, question_id
                        )

                    except Exception as e:
                        print("Error closing vote:", e)

                await manager.broadcast(room_code, {
                    "type": "vote_closed",
                    "question_id": question_id,
                    "estimate": median
                })

            elif event_type == "leave":
                user_id = data.get("user_id")
                manager.disconnect(room_code, websocket)
                await manager.broadcast(room_code, {
                    "type": "user_left",
                    "user_id": user_id,
                    "count": len(manager.active_connections.get(room_code, []))
                })
                return

            elif event_type == "delete_question":
                question_id = data.get("question_id")
                user_id = data.get("user_id")
                async with pool.acquire() as conn:
                    q = await conn.fetchrow("""
                        SELECT q.question_id, r.created_by, r.room_code
                        FROM questions q
                        JOIN rooms r ON q.room_id = r.room_id
                        WHERE q.question_id = $1
                    """, question_id)
                    if not q:
                        await websocket.send_json({"type": "error", "message": "Question not found."})
                        continue
                    if str(q["created_by"]) != str(user_id):
                        await websocket.send_json({"type": "error", "message": "Only the room creator can delete questions."})
                        continue
                    await conn.execute("DELETE FROM questions WHERE question_id = $1", question_id)
                await manager.broadcast(room_code, {
                    "type": "question_deleted",
                    "question_id": question_id
                })

    except WebSocketDisconnect:
        manager.disconnect(room_code, websocket)
