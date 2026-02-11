"""
Repository for assistant database operations
"""

import logging
from datetime import UTC, datetime

from bson import ObjectId

from backend.db.mongodb import MongoDBClient
from backend.schemas.assistant import AssistantResponse

logger = logging.getLogger(__name__)


class AssistantRepository:
    """Repository for assistant CRUD operations"""

    def __init__(self, db: MongoDBClient):
        self.collection = db.get_collection("assistants")

    def _to_response(self, doc: dict) -> AssistantResponse:
        """MongoDB doc → API schema mapping"""
        return AssistantResponse(
            id=str(doc["_id"]),
            name=doc["name"],
            description=doc.get("description", ""),
            type=doc["type"],
            config=doc["config"],
            created_by=doc["created_by"],
            created_at=doc["created_at"],
            updated_at=doc["updated_at"],
            is_active=doc.get("is_active", True),
        )

    def insert(self, data: dict) -> AssistantResponse:
        """Create a new assistant and return it"""
        now = datetime.now(UTC)
        data["created_at"] = now
        data["updated_at"] = now
        data.setdefault("created_by", "system")

        result = self.collection.insert_one(data)
        data["_id"] = result.inserted_id
        return self._to_response(data)

    def find_by_id(self, assistant_id: str) -> AssistantResponse | None:
        """Get assistant by ID"""
        doc = self.collection.find_one({"_id": ObjectId(assistant_id)})
        return self._to_response(doc) if doc else None

    def find_all(
        self,
        assistant_type: str | None = None,
        is_active: bool | None = None,
    ) -> list[AssistantResponse]:
        """Get all assistants with optional filters"""
        query = {}
        if assistant_type:
            query["type"] = assistant_type
        if is_active is not None:
            query["is_active"] = is_active

        docs = self.collection.find(query)
        return [self._to_response(doc) for doc in docs]

    def update(self, assistant_id: str, update_data: dict) -> AssistantResponse | None:
        """Update an assistant, return updated version or None if not found"""
        update_data["updated_at"] = datetime.now(UTC)

        result = self.collection.find_one_and_update(
            {"_id": ObjectId(assistant_id)},
            {"$set": update_data},
            return_document=True,  # Return the updated doc
        )
        return self._to_response(result) if result else None

    def delete(self, assistant_id: str) -> bool:
        """Delete an assistant"""
        result = self.collection.delete_one({"_id": ObjectId(assistant_id)})
        return result.deleted_count > 0
