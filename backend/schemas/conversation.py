"""
Pydantic schemas for conversation API responses.
"""

from datetime import datetime

from pydantic import BaseModel


class ConversationListItem(BaseModel):
    session_id: str
    title: str | None
    created_at: datetime | None
    updated_at: datetime | None
    last_message: str | None

    class Config:
        from_attributes = True


class ConversationMessage(BaseModel):
    role: str
    content: str


class ConversationDetail(BaseModel):
    session_id: str
    title: str | None
    created_at: datetime | None
    updated_at: datetime | None
    messages: list[ConversationMessage]
