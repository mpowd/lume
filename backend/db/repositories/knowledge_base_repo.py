"""
Repository for knowledge base database operations.
"""

import logging
from datetime import UTC, datetime

from qdrant_client import QdrantClient

from backend.db.mongodb import MongoDBClient

logger = logging.getLogger(__name__)

CONFIGURATIONS_COLLECTION = "configurations"


class KnowledgeBaseRepository:
    """Repository for knowledge base CRUD operations."""

    def __init__(self, db: MongoDBClient, qdrant: QdrantClient):
        self.db = db
        self.qdrant = qdrant

    # ── Collection config CRUD ────────────────────────────

    def get_collection_config(self, collection_name: str) -> dict | None:
        """Get the configuration document for a collection."""
        configs = self._find_configs(collection_name)
        if not configs:
            return None
        if len(configs) > 1:
            logger.warning(
                f"Multiple configs found for '{collection_name}', using first"
            )
        config = configs[0]
        config["_id"] = str(config["_id"])
        return config

    def list_collection_names(self) -> list[str]:
        """List all collection names from Qdrant."""
        response = self.qdrant.get_collections()
        return sorted(c.name for c in response.collections)

    def insert_collection_config(self, config: dict) -> dict:
        """Insert a new collection configuration document."""
        now = datetime.now(UTC).isoformat()
        config["created_at"] = now
        config["updated_at"] = now

        collection = self.db.get_collection(CONFIGURATIONS_COLLECTION)
        result = collection.insert_one(config)
        config["_id"] = str(result.inserted_id)
        return config

    def update_collection_config(self, collection_name: str, update_data: dict) -> bool:
        """Update a collection's configuration document."""
        configs = self._find_configs(collection_name)
        if not configs:
            return False

        update_data["updated_at"] = datetime.now(UTC).isoformat()
        doc_id = configs[0]["_id"]

        collection = self.db.get_collection(CONFIGURATIONS_COLLECTION)
        result = collection.update_one(
            {"_id": doc_id},
            {"$set": update_data},
        )
        return result.modified_count > 0

    def delete_collection_config(self, collection_name: str) -> bool:
        """Delete a collection's configuration document."""
        collection = self.db.get_collection(CONFIGURATIONS_COLLECTION)
        result = collection.delete_many({"collection_name": collection_name})
        return result.deleted_count > 0

    # ── Source document operations ────────────────────────

    def get_documents(
        self,
        collection_name: str,
        filter_query: dict | None = None,
        projection: dict | None = None,
    ) -> list[dict]:
        """Get documents from a collection's MongoDB document store."""
        query = filter_query or {}
        collection = self.db.get_collection(collection_name)

        if projection:
            return list(collection.find(query, projection))
        return list(collection.find(query))

    def get_document_urls(self, collection_name: str) -> set[str]:
        """Get all URLs in a collection for deduplication."""
        docs = self.get_documents(
            collection_name, filter_query={}, projection={"url": 1}
        )
        return {doc.get("url") for doc in docs if doc.get("url")}

    def get_documents_by_source_category(
        self, collection_name: str, source_category: str
    ) -> list[dict]:
        """Get documents filtered by source category (website/file)."""
        return self.get_documents(
            collection_name,
            filter_query={"source_category": source_category},
            projection={"url": 1, "hash": 1, "source_category": 1},
        )

    def insert_documents(self, collection_name: str, documents: list[dict]) -> None:
        """Insert documents into a collection's document store."""
        if not documents:
            return
        collection = self.db.get_collection(collection_name)
        collection.insert_many(documents)
        logger.info(f"Inserted {len(documents)} documents into '{collection_name}'")

    def delete_documents_by_urls(self, collection_name: str, urls: list[str]) -> int:
        """Delete documents matching the given URLs."""
        collection = self.db.get_collection(collection_name)
        total_deleted = 0
        for url in urls:
            result = collection.delete_many({"url": url})
            total_deleted += result.deleted_count
        return total_deleted

    def drop_document_collection(self, collection_name: str) -> None:
        """Drop an entire MongoDB document collection."""
        self.db.get_collection(collection_name).drop()
        logger.info(f"Dropped MongoDB collection: {collection_name}")

    # ── Private helpers ───────────────────────────────────

    def _find_configs(self, collection_name: str) -> list[dict]:
        """Find all configuration docs for a collection name."""
        collection = self.db.get_collection(CONFIGURATIONS_COLLECTION)
        return list(collection.find({"collection_name": collection_name}))
