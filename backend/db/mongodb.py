import os
import pymongo
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError
import logging
from typing import Dict, List, Optional, Any

logger = logging.getLogger(__name__)

class MongoDBClient:
    _instance = None
    
    @classmethod
    def get_instance(cls, connection_string=None, db_name=None):
        """
        Get or create a singleton instance of the MongoDB client.
        
        Args:
            connection_string: Optional MongoDB connection string
            db_name: Optional database name
            
        Returns:
            MongoDBClient: Singleton instance
        """
        if cls._instance is None:
            cls._instance = cls(connection_string, db_name)
        return cls._instance
    
    def __init__(self, connection_string=None, db_name=None):
        """
        Initialize MongoDB client with connection pooling.
        
        Args:
            connection_string: MongoDB connection string
            db_name: Name of the database to use
        """
        if connection_string is None:
            host = os.getenv("MONGODB_HOST", "mongodb")
            port = os.getenv("MONGODB_PORT", "27017")
            connection_string = f"mongodb://{host}:{port}"
        
        if db_name is None:
            db_name = os.getenv("MONGODB_DB_NAME", "rag_chatbot")
            
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
            self.client.admin.command('ping')
            logger.info("Successfully connected to MongoDB")
        except (ConnectionFailure, ServerSelectionTimeoutError) as e:
            logger.error(f"Failed to connect to MongoDB: {str(e)}")
        
        self.db = self.client[db_name]
    
    def get_database(self):
        """Get the database instance."""
        return self.db
    
    def get_collection(self, collection_name: str):
        """
        Get a collection by name.
        
        Args:
            collection_name: Name of the collection
            
        Returns:
            pymongo.collection.Collection: The requested collection
        """
        return self.db[collection_name]
    
    def persist_docs(self, docs: List[Dict[str, Any]], collection_name: str = "temp") -> List[str]:
        """
        Store documents in MongoDB.
        
        Args:
            docs: List of document dictionaries to store
            collection_name: Name of the collection to store documents in
            
        Returns:
            List[str]: List of inserted document IDs
        """
        collection = self.get_collection(collection_name)
        result = collection.insert_many(docs)
        return [str(id) for id in result.inserted_ids]
    
    def get_docs_by_ids(self, doc_ids: List[str], collection_name: str = "temp") -> List[Dict[str, Any]]:
        """
        Retrieve documents by their IDs.
        
        Args:
            doc_ids: List of document IDs to retrieve
            collection_name: Name of the collection to query
            
        Returns:
            List[Dict[str, Any]]: List of retrieved documents
        """
        from bson.objectid import ObjectId
        
        collection = self.get_collection(collection_name)
        object_ids = [ObjectId(id) for id in doc_ids]
        
        return list(collection.find({"_id": {"$in": object_ids}}))
    
    def get_docs_by_url(self, source_url: str, collection_name: str = "temp") -> List[Dict[str, Any]]:
        """
        Retrieve documents by their source URL.
        
        Args:
            source_url: URL source to filter by
            collection_name: Name of the collection to query
            
        Returns:
            List[Dict[str, Any]]: List of retrieved documents
        """
        collection = self.get_collection(collection_name)
        return list(collection.find({"url": source_url}))
    
    def get_docs(self, filter: Dict[str, Any], collection_name: str) -> List[Dict[str, Any]]:
        """
        Retrieve documents by a key-value pair.

        Args:
            key_value: Key-value pair to filter by
            collection_name: Name of the collection to query

        Returns:
            List[Dict[str, Any]]: List of retrieved documents
        """
        collection = self.get_collection(collection_name)
        return list(collection.find(filter))
    
    def get_all_documents(self, collection_name: str = "temp") -> List[Dict[str, Any]]:
        """
        Retrieve all documents from a collection.
        
        Args:
            collection_name: Name of the collection to query
            
        Returns:
            List[Dict[str, Any]]: List of all documents in the collection
        """
        collection = self.get_collection(collection_name)
        return list(collection.find({}))
    
    def update_document(self, doc_id: str, update_data: Dict[str, Any], collection_name: str = "temp") -> bool:
        """
        Update a document by ID.
        
        Args:
            doc_id: ID of the document to update
            update_data: Dictionary of fields to update
            collection_name: Name of the collection
            
        Returns:
            bool: True if update was successful
        """
        from bson.objectid import ObjectId
        
        collection = self.get_collection(collection_name)
        result = collection.update_one(
            {"_id": ObjectId(doc_id)},
            {"$set": update_data}
        )
        
        return result.modified_count > 0
    
    def delete_documents(self, filter_query: Dict[str, Any], collection_name: str = "temp") -> int:
        """
        Delete documents matching a filter query.
        
        Args:
            filter_query: MongoDB filter query
            collection_name: Name of the collection
            
        Returns:
            int: Number of documents deleted
        """
        collection = self.get_collection(collection_name)
        result = collection.delete_many(filter_query)
        
        return result.deleted_count
    

    def delete_collection(self, collection_name: str) -> bool:
        """
        Delete an entire collection from the database.
        
        Args:
            collection_name: Name of the collection to delete
            
        Returns:
            bool: True if the collection was successfully deleted, False otherwise
        """
        try:
            self.db.drop_collection(collection_name)
            logger.info(f"Collection '{collection_name}' successfully deleted")
            return True
        except Exception as e:
            logger.error(f"Error deleting collection '{collection_name}': {str(e)}")
            return False
    
    def close(self):
        """Close the MongoDB connection."""
        if self.client:
            self.client.close()
            logger.info("MongoDB connection closed")
            
    def __del__(self):
        """Ensure the connection is closed when the object is garbage collected."""
        self.close()


