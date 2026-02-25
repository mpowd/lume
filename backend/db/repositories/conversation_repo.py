"""
Repository for conversation history (memory) storage in MongoDB.
"""

import logging
from datetime import datetime
from zoneinfo import ZoneInfo

from backend.config import settings
from backend.db.mongodb import MongoDBClient


def _now() -> datetime:
    return datetime.now(ZoneInfo(settings.TZ))

logger = logging.getLogger(__name__)


class ConversationRepository:
    """Stores and retrieves chat message history per assistant session."""

    def __init__(self, db: MongoDBClient):
        self.collection = db.get_collection("conversation_history")
        self.collection.create_index([("session_id", 1)])
        self.collection.create_index([("assistant_id", 1), ("updated_at", -1)])

    # ── Single session ────────────────────────────────────────────────────────

    def get_messages(self, session_id: str) -> list[dict]:
        """Return all messages for a session, oldest first."""
        doc = self.collection.find_one({"session_id": session_id})
        return doc["messages"] if doc else []

    def get_session(self, session_id: str) -> dict | None:
        """Return the full session document."""
        return self.collection.find_one({"session_id": session_id})

    def append_messages(self, session_id: str, assistant_id: str, messages: list[dict]) -> None:
        """Append new messages to the session history."""
        now = _now()
        self.collection.update_one(
            {"session_id": session_id},
            {
                "$push": {"messages": {"$each": messages}},
                "$set": {"updated_at": now, "assistant_id": assistant_id},
                "$setOnInsert": {"created_at": now, "title": None},
            },
            upsert=True,
        )

    def set_title(self, session_id: str, title: str) -> None:
        """Set the LLM-generated title for a session."""
        self.collection.update_one(
            {"session_id": session_id},
            {"$set": {"title": title}},
        )

    def clear(self, session_id: str) -> None:
        """Wipe all history for a session."""
        self.collection.delete_one({"session_id": session_id})

    # ── Listing ───────────────────────────────────────────────────────────────

    def list_by_assistant(self, assistant_id: str, limit: int = 50) -> list[dict]:
        """
        Return conversation summaries for an assistant, newest first.
        Returns lightweight dicts — no message bodies.
        """
        docs = self.collection.find(
            {"assistant_id": assistant_id},
            {
                "session_id": 1,
                "title": 1,
                "created_at": 1,
                "updated_at": 1,
                "messages": {"$slice": -1},
            },
            sort=[("updated_at", -1)],
            limit=limit,
        )
        return [
            {
                "session_id": doc["session_id"],
                "title": doc.get("title"),
                "created_at": doc.get("created_at"),
                "updated_at": doc.get("updated_at"),
                "last_message": (doc.get("messages") or [{}])[-1].get("content", ""),
            }
            for doc in docs
        ]
