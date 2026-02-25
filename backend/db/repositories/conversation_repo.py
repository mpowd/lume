"""
Repository for conversation history (memory) storage in MongoDB.
"""

import logging
from datetime import UTC, datetime

from backend.db.mongodb import MongoDBClient

logger = logging.getLogger(__name__)


class ConversationRepository:
    """Stores and retrieves chat message history per assistant session."""

    def __init__(self, db: MongoDBClient):
        self.collection = db.get_collection("conversation_history")
        # Index for fast lookups by session
        self.collection.create_index([("session_id", 1)])

    def get_messages(self, session_id: str) -> list[dict]:
        """Return all messages for a session, oldest first."""
        doc = self.collection.find_one({"session_id": session_id})
        return doc["messages"] if doc else []

    def append_messages(self, session_id: str, messages: list[dict]) -> None:
        """Append new messages to the session history."""
        now = datetime.now(UTC)
        self.collection.update_one(
            {"session_id": session_id},
            {
                "$push": {"messages": {"$each": messages}},
                "$set": {"updated_at": now},
                "$setOnInsert": {"created_at": now},
            },
            upsert=True,
        )

    def clear(self, session_id: str) -> None:
        """Wipe all history for a session."""
        self.collection.delete_one({"session_id": session_id})

    def list_sessions(self, assistant_id: str) -> list[str]:
        """List all session IDs for an assistant."""
        prefix = f"{assistant_id}:"
        docs = self.collection.find(
            {"session_id": {"$regex": f"^{prefix}"}},
            {"session_id": 1},
        )
        return [doc["session_id"] for doc in docs]
