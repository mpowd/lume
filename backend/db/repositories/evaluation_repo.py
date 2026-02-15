"""
Repository for evaluation database operations.
"""

import logging
import math

from bson import ObjectId

from backend.db.mongodb import MongoDBClient

logger = logging.getLogger(__name__)

DATASETS_COLLECTION = "evaluation_datasets"
EVALUATIONS_COLLECTION = "evaluations"


class EvaluationRepository:
    """Repository for evaluation CRUD operations."""

    def __init__(self, db: MongoDBClient):
        self.db = db

    # ── Dataset operations ────────────────────────────────

    def find_dataset_by_name(self, name: str) -> dict | None:
        collection = self.db.get_collection(DATASETS_COLLECTION)
        doc = collection.find_one({"name": name})
        return self._serialize(doc) if doc else None

    def find_dataset_by_id(self, dataset_id: str) -> dict | None:
        collection = self.db.get_collection(DATASETS_COLLECTION)
        doc = collection.find_one({"_id": ObjectId(dataset_id)})
        return self._serialize(doc) if doc else None

    def find_all_datasets(self) -> list[dict]:
        collection = self.db.get_collection(DATASETS_COLLECTION)
        return [self._serialize(doc) for doc in collection.find({})]

    def insert_dataset(self, data: dict) -> str:
        """Insert a dataset, return the inserted ID as string."""
        collection = self.db.get_collection(DATASETS_COLLECTION)
        result = collection.insert_one(data)
        return str(result.inserted_id)

    def update_dataset(self, dataset_id: str, update_data: dict) -> dict | None:
        collection = self.db.get_collection(DATASETS_COLLECTION)
        result = collection.find_one_and_update(
            {"_id": ObjectId(dataset_id)},
            {"$set": update_data},
            return_document=True,
        )
        return self._serialize(result) if result else None

    def delete_dataset(self, dataset_id: str) -> bool:
        collection = self.db.get_collection(DATASETS_COLLECTION)
        result = collection.delete_one({"_id": ObjectId(dataset_id)})
        return result.deleted_count > 0

    # ── Evaluation result operations ──────────────────────

    def insert_evaluation(self, data: dict) -> str:
        """Insert an evaluation result, return the inserted ID as string."""
        collection = self.db.get_collection(EVALUATIONS_COLLECTION)
        result = collection.insert_one(data)
        return str(result.inserted_id)

    def find_evaluation_by_id(self, evaluation_id: str) -> dict | None:
        collection = self.db.get_collection(EVALUATIONS_COLLECTION)
        doc = collection.find_one({"_id": ObjectId(evaluation_id)})
        if not doc:
            return None
        return self._sanitize_metrics(self._serialize(doc))

    def find_all_evaluations(self) -> list[dict]:
        collection = self.db.get_collection(EVALUATIONS_COLLECTION)
        docs = list(collection.find({}))
        return [self._sanitize_metrics(self._serialize(doc)) for doc in docs]

    def find_evaluations_by_dataset(self, dataset_name: str) -> list[dict]:
        collection = self.db.get_collection(EVALUATIONS_COLLECTION)
        docs = list(collection.find({"dataset_name": dataset_name}))
        return [self._sanitize_metrics(self._serialize(doc)) for doc in docs]

    # ── Source document access (for RAGAS generation) ─────

    def get_collection_documents(self, collection_name: str) -> list[dict]:
        """Get all documents from a source collection (for test generation)."""
        collection = self.db.get_collection(collection_name)
        return list(collection.find({}))

    # ── Private helpers ───────────────────────────────────

    @staticmethod
    def _serialize(doc: dict) -> dict:
        """Convert MongoDB _id to string."""
        if doc and "_id" in doc:
            doc["_id"] = str(doc["_id"])
        return doc

    @staticmethod
    def _sanitize_metrics(doc: dict) -> dict:
        """
        Replace NaN/Inf with None in metric values.

        Applied once here instead of in every route handler.
        Handles both flat metrics dicts and nested evaluation structures.
        """
        if not doc:
            return doc

        def clean_value(v):
            if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
                return None
            return v

        def clean_dict(d: dict) -> dict:
            for key, value in d.items():
                if isinstance(value, float):
                    d[key] = clean_value(value)
                elif isinstance(value, dict):
                    clean_dict(value)
                elif isinstance(value, list):
                    for item in value:
                        if isinstance(item, dict):
                            clean_dict(item)
            return d

        # Handle the flat format (evaluate-assistant)
        if "metrics" in doc and isinstance(doc["metrics"], dict):
            clean_dict(doc["metrics"])
        if "detailed_results" in doc and isinstance(doc["detailed_results"], list):
            for detail in doc["detailed_results"]:
                if isinstance(detail, dict):
                    clean_dict(detail)

        return doc
