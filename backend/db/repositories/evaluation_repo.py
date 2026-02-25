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
METRICS_COLLECTION = "evaluation_metrics"


class EvaluationRepository:
    """Repository for evaluation CRUD operations."""

    def __init__(self, db: MongoDBClient):
        self.db = db

    # ── Metric definition operations ──────────────────────

    def find_all_metrics(self) -> list[dict]:
        collection = self.db.get_collection(METRICS_COLLECTION)
        return [self._serialize(doc) for doc in collection.find({})]

    def find_metric_by_id(self, metric_id: str) -> dict | None:
        collection = self.db.get_collection(METRICS_COLLECTION)
        doc = collection.find_one({"_id": ObjectId(metric_id)})
        return self._serialize(doc) if doc else None

    def find_metric_by_name(self, name: str) -> dict | None:
        collection = self.db.get_collection(METRICS_COLLECTION)
        doc = collection.find_one({"name": name})
        return self._serialize(doc) if doc else None

    def find_metrics_by_ids(self, metric_ids: list[str]) -> list[dict]:
        collection = self.db.get_collection(METRICS_COLLECTION)
        object_ids = [ObjectId(mid) for mid in metric_ids]
        docs = list(collection.find({"_id": {"$in": object_ids}}))
        return [self._serialize(doc) for doc in docs]

    def insert_metric(self, data: dict) -> str:
        collection = self.db.get_collection(METRICS_COLLECTION)
        result = collection.insert_one(data)
        return str(result.inserted_id)

    def upsert_builtin_metric(self, metric: dict, now: str) -> None:
        """
        Atomically insert-or-update a built-in metric keyed on its name.

        Uses MongoDB's update_one with upsert=True so that concurrent calls
        (e.g. multiple Uvicorn workers all starting at the same time) will
        never produce duplicate documents — the first write wins the upsert
        and subsequent ones simply update the existing document.

        `created_at` is set only on insert ($setOnInsert) so it is never
        overwritten on subsequent restarts.
        """
        collection = self.db.get_collection(METRICS_COLLECTION)
        collection.update_one(
            {"name": metric["name"]},
            {
                "$set": {**metric, "updated_at": now},
                "$setOnInsert": {"created_at": now},
            },
            upsert=True,
        )

    def update_metric(self, metric_id: str, update_data: dict) -> dict | None:
        collection = self.db.get_collection(METRICS_COLLECTION)
        result = collection.find_one_and_update(
            {"_id": ObjectId(metric_id)},
            {"$set": update_data},
            return_document=True,
        )
        return self._serialize(result) if result else None

    def delete_metric(self, metric_id: str) -> bool:
        collection = self.db.get_collection(METRICS_COLLECTION)
        result = collection.delete_one({"_id": ObjectId(metric_id)})
        return result.deleted_count > 0

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
        collection = self.db.get_collection(EVALUATIONS_COLLECTION)
        result = collection.insert_one(data)
        return str(result.inserted_id)

    def find_evaluation_by_id(self, evaluation_id: str) -> dict | None:
        collection = self.db.get_collection(EVALUATIONS_COLLECTION)
        doc = collection.find_one({"_id": ObjectId(evaluation_id)})
        return self._sanitize_floats(self._serialize(doc)) if doc else None

    def find_all_evaluations(self) -> list[dict]:
        collection = self.db.get_collection(EVALUATIONS_COLLECTION)
        docs = list(collection.find({}))
        return [self._sanitize_floats(self._serialize(doc)) for doc in docs]

    def find_evaluations_by_assistant(self, assistant_id: str) -> list[dict]:
        collection = self.db.get_collection(EVALUATIONS_COLLECTION)
        docs = list(collection.find({"assistant_id": assistant_id}))
        return [self._sanitize_floats(self._serialize(doc)) for doc in docs]

    # ── Source document access (for dataset generation) ───

    def get_collection_documents(self, collection_name: str) -> list[dict]:
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
    def _sanitize_floats(doc: dict) -> dict:
        """Replace NaN/Inf float values with None throughout a document."""
        if not doc:
            return doc

        def clean(obj):
            if isinstance(obj, float) and (math.isnan(obj) or math.isinf(obj)):
                return None
            if isinstance(obj, dict):
                return {k: clean(v) for k, v in obj.items()}
            if isinstance(obj, list):
                return [clean(item) for item in obj]
            return obj

        return clean(doc)
