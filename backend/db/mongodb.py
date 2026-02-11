"""
MongoDB client - thin wrapper for connection management only
"""

import logging

import pymongo
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError

from backend.config import settings

logger = logging.getLogger(__name__)


class MongoDBClient:
    _instance: "MongoDBClient | None" = None

    @classmethod
    def get_instance(cls) -> "MongoDBClient":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def __init__(self):
        connection_string = settings.MONGODB_URL
        db_name = settings.MONGODB_NAME

        self.client = pymongo.MongoClient(
            connection_string,
            maxPoolSize=10,
            minPoolSize=1,
            maxIdleTimeMS=30000,
            serverSelectionTimeoutMS=5000,
            connectTimeoutMS=5000,
            retryWrites=True,
        )

        try:
            self.client.admin.command("ping")
            logger.info("Successfully connected to MongoDB")
        except (ConnectionFailure, ServerSelectionTimeoutError) as e:
            logger.error(f"Failed to connect to MongoDB: {e}")
            raise

        self.db = self.client[db_name]

    def get_collection(self, collection_name: str) -> pymongo.collection.Collection:
        """Get a collection by name"""
        return self.db[collection_name]

    def close(self):
        """Close the MongoDB connection"""
        if self.client:
            self.client.close()
            logger.info("MongoDB connection closed")
