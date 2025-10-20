"""
Repository for assistant database operations
"""

from typing import List, Optional, Dict, Any
from bson import ObjectId
from datetime import datetime
from backend.db.mongodb import MongoDBClient
from backend.models.assistant import AssistantModel
import logging

logger = logging.getLogger(__name__)


class AssistantRepository:
    """Repository for assistant CRUD operations"""

    def __init__(self):
        self.mongodb = MongoDBClient.get_instance()
        self.collection_name = "assistants"

    def create(self, assistant_data: Dict[str, Any]) -> str:
        """Create a new assistant"""
        assistant_data["created_at"] = datetime.utcnow()
        assistant_data["updated_at"] = datetime.utcnow()

        result = self.mongodb.persist_docs(
            docs=[assistant_data], collection_name=self.collection_name
        )

        logger.info(f"Created assistant with ID: {result[0]}")
        return str(result[0])

    def get_by_id(self, assistant_id: str) -> Optional[Dict[str, Any]]:
        """Get assistant by ID"""
        try:
            assistants = self.mongodb.get_docs(
                filter={"_id": ObjectId(assistant_id)},
                collection_name=self.collection_name,
            )

            if assistants:
                assistant = assistants[0]
                assistant["_id"] = str(assistant["_id"])
                return assistant

            return None

        except Exception as e:
            logger.error(f"Error getting assistant {assistant_id}: {str(e)}")
            return None

    def get_all(
        self, filter_query: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """Get all assistants with optional filter"""
        try:
            if filter_query:
                assistants = self.mongodb.get_docs(
                    filter=filter_query, collection_name=self.collection_name
                )
            else:
                assistants = self.mongodb.get_all_documents(
                    collection_name=self.collection_name
                )

            # Convert ObjectId to string
            for assistant in assistants:
                assistant["_id"] = str(assistant["_id"])

            return assistants

        except Exception as e:
            logger.error(f"Error getting assistants: {str(e)}")
            return []

    def update(self, assistant_id: str, update_data: Dict[str, Any]) -> bool:
        """Update an assistant"""
        try:
            update_data["updated_at"] = datetime.utcnow()

            result = self.mongodb.update_document(
                doc_id=assistant_id,
                update_data=update_data,
                collection_name=self.collection_name,
            )

            if result:
                logger.info(f"Updated assistant {assistant_id}")

            return result

        except Exception as e:
            logger.error(f"Error updating assistant {assistant_id}: {str(e)}")
            return False

    def delete(self, assistant_id: str) -> bool:
        """Delete an assistant"""
        try:
            result = self.mongodb.delete_documents(
                filter_query={"_id": ObjectId(assistant_id)},
                collection_name=self.collection_name,
            )

            if result > 0:
                logger.info(f"Deleted assistant {assistant_id}")
                return True

            return False

        except Exception as e:
            logger.error(f"Error deleting assistant {assistant_id}: {str(e)}")
            return False

    def get_by_type(self, assistant_type: str) -> List[Dict[str, Any]]:
        """Get assistants by type"""
        return self.get_all(filter_query={"type": assistant_type})
