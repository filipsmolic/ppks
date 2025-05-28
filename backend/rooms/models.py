from pydantic import BaseModel
from datetime import datetime


class QuestionOut(BaseModel):
    question_id: int
    question_title: str
    question_text: str
    estimate: int | None
    is_estimated: bool
    created_at: datetime
    vote_count: int
    voted: bool | None


class RoomOut(BaseModel):
    room_id: int
    room_code: str
    status: int
    created_at: datetime
    created_by: int
