from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel, HttpUrl
from typing import List, Optional
import time
import logging
import os
from langchain_qdrant import FastEmbedSparse, QdrantVectorStore, RetrievalMode
from qdrant_client import QdrantClient, models
from qdrant_client.http.models import Distance, SparseVectorParams, VectorParams
from langchain_ollama import OllamaEmbeddings
from langchain_community.document_loaders import WebBaseLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from uuid import uuid4
from langchain_ollama import OllamaEmbeddings
import asyncio
from datetime import datetime
import httpx
from langchain_core.documents import Document



# Set up logging
logging.basicConfig(level=logging.INFO)

logger = logging.getLogger(__name__)

router = APIRouter()
qdrant_client = QdrantClient(url="http://qdrant:6333")
sparse_embeddings = FastEmbedSparse(model_name="Qdrant/bm25")
embeddings = OllamaEmbeddings(model="jina/jina-embeddings-v2-base-de", base_url="http://ollama:11434")



@router.get("/collections")
async def get_collections():
    try:
        collections_response = qdrant_client.get_collections()
        collection_names = [collection.name for collection in collections_response.collections]
        collection_names.sort()
        
        return {
            "status": "success",
            "collection_names": collection_names
        }
    except Exception as e:
        logger.error(f"Error fetching collections: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch collections: {str(e)}"
        )
    
class CollectionCreateModel(BaseModel):
    name: str

@router.post("/collections")
async def create_collection(collection: CollectionCreateModel):
    try:
        qdrant_client.create_collection(
            collection_name=collection.name,
            vectors_config={"dense": VectorParams(size=768, distance=Distance.COSINE)},
            sparse_vectors_config={
                "sparse": SparseVectorParams(index=models.SparseIndexParams(on_disk=False))
            },
        )
        return {"status": "success", "message": f"Collection '{collection.name}' created successfully"}
    except Exception as e:
        logger.error(f"Error creating collection {collection.name}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create collection {collection.name}: {str(e)}"
        )
    
class DocumentUploadModel(BaseModel):
    collection_name: str
    urls: List[HttpUrl]



async def process_and_store_documents(collection_name: str, documents, metadata=None):
    """Process and store documents in the vector database."""
    try:
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000, chunk_overlap=100,
            separators=["\n\n", "\n", ".", ";", ",", " "],
        )
        
        # Initialize an empty list for our Document objects
        docs_chunks = []
        
        # Handle different input types
        if isinstance(documents, str):
            # Plain text - split it and create Document objects
            chunks = text_splitter.split_text(documents)
            for chunk in chunks:
                doc = Document(
                    page_content=chunk,
                    metadata=metadata or {}
                )
                docs_chunks.append(doc)
        elif isinstance(documents, dict):
            # Dictionary - try to extract text
            text = documents.get("markdown", "") or documents.get("text", "")
            chunks = text_splitter.split_text(text)
            for chunk in chunks:
                doc = Document(
                    page_content=chunk,
                    metadata=metadata or {}
                )
                docs_chunks.append(doc)
        elif isinstance(documents, list):
            # List - check if it's already Document objects
            if all(hasattr(doc, "page_content") for doc in documents):
                # Already Document objects, just split them
                docs_chunks = text_splitter.split_documents(documents)
            else:
                # Convert each item to a Document
                temp_docs = []
                for item in documents:
                    if isinstance(item, str):
                        temp_docs.append(Document(page_content=item, metadata=metadata or {}))
                    elif isinstance(item, dict):
                        text = item.get("page_content", "") or item.get("text", "") or item.get("markdown", "")
                        temp_docs.append(Document(page_content=text, metadata=metadata or {}))
                if temp_docs:
                    docs_chunks = text_splitter.split_documents(temp_docs)
        
        # Make sure we have documents to store
        if not docs_chunks:
            logger.warning("No document chunks were created. Check the input format.")
            return {"status": "error", "message": "No document chunks were created"}
        
        # Generate UUIDs
        uuids = [str(uuid4()) for _ in range(len(docs_chunks))]
        
        # Store in vector database
        qdrant = QdrantVectorStore(
            client=qdrant_client,
            collection_name=collection_name,
            embedding=embeddings,
            sparse_embedding=sparse_embeddings,
            retrieval_mode=RetrievalMode.HYBRID,
            vector_name="dense",
            sparse_vector_name="sparse",
        )
        
        # Log what we're about to store
        logger.info(f"About to store {len(docs_chunks)} document chunks")
        
        # Add documents to the vector store
        qdrant.add_documents(documents=docs_chunks, ids=uuids)
        logger.info(f"Successfully stored {len(docs_chunks)} chunks in collection {collection_name}")
        
        return {"status": "success", "chunks_stored": len(docs_chunks)}
    except Exception as e:
        logger.error(f"Error processing documents for {collection_name}: {str(e)}")
        raise e

# Update your upload_documents function to use the helper
@router.post("/collections/{name}/documents")
async def upload_documents(upload_request: DocumentUploadModel):
    try:
        url_strings = [str(url) for url in upload_request.urls]
        loader = WebBaseLoader(url_strings)
        docs = loader.load()
        
        # Use the helper function
        result = await process_and_store_documents(
            collection_name=upload_request.collection_name,
            documents=docs
        )
        
        return result
    except Exception as e:
        logger.error(f"Error uploading documents in {upload_request.collection_name}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to upload documents in {upload_request.collection_name}: {str(e)}"
        )


@router.delete("/collections/{collection_name}")
async def delete_collection(collection_name: str):
    try:
        qdrant_client.delete_collection(collection_name=collection_name)
        return{
            "status": "success"
        }
    except Exception as e:
        logger.error(f"Error deleting collection {collection_name}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete collecion {collection_name}: {str(e)}"
        )






