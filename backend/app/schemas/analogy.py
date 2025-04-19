from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class AnalogyCreate(BaseModel):
    topic: str
    explanation: str

class AnalogyResponse(BaseModel):
    id: str
    topic: str
    explanation: str
    created_at: datetime
    user_id: str 