"""
MongoDB client - thin wrapper for connection management only
"""

import logging

import pymongo
from pymongo.collection import Collection

logger = logging.getLogger(__name__)


class MongoDBClient:
    def __init__(self, connection_string: str, db_name: str):
        self.client = pymongo.MongoClient(
            connection_string,
            maxPoolSize=10,
            minPoolSize=1,
            maxIdleTimeMS=30000,
            serverSelectionTimeoutMS=5000,
            connectTimeoutMS=5000,
            retryWrites=True,
        )
        self.client.admin.command("ping")
        logger.info("Successfully connected to MongoDB")
        self.db = self.client[db_name]

    def get_collection(self, collection_name: str) -> Collection:
        return self.db[collection_name]

    def close(self):
        if self.client:
            self.client.close()
