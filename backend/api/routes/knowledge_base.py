from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel, HttpUrl
from typing import List, Optional, Dict, Any
import logging
from langchain_qdrant import FastEmbedSparse, QdrantVectorStore, RetrievalMode
from qdrant_client import QdrantClient, models
from qdrant_client.http.models import Distance, SparseVectorParams, VectorParams
from langchain_ollama import OllamaEmbeddings
from langchain_openai import OpenAIEmbeddings
from langchain_community.document_loaders import WebBaseLoader
from uuid import uuid4
from datetime import datetime
from langchain_core.documents import Document
from backend.db.mongodb import MongoDBClient
from langchain_text_splitters import (
    MarkdownHeaderTextSplitter,
    RecursiveCharacterTextSplitter,
)
from langchain_community.embeddings.fastembed import FastEmbedEmbeddings
import json
from bson import json_util
import os
import shutil

logging.basicConfig(level=logging.INFO)

logger = logging.getLogger(__name__)

router = APIRouter()
qdrant_client = QdrantClient(url="http://qdrant:6333")


@router.get("/collections")
async def get_collections():
    """Get all available collections"""
    try:
        collections_response = qdrant_client.get_collections()
        collection_names = [
            collection.name for collection in collections_response.collections
        ]
        collection_names.sort()

        return {"status": "success", "collection_names": collection_names}
    except Exception as e:
        logger.error(f"Error fetching collections: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Failed to fetch collections: {str(e)}"
        )


@router.get("/collection_info")
async def get_collection_info(collection_name: str):
    """Get detailed information about a specific collection"""
    try:
        mongodb_client = MongoDBClient.get_instance()
        collection_info = mongodb_client.get_docs(
            filter={"collection_name": collection_name},
            collection_name="configurations",
        )

        if len(collection_info) > 1:
            logger.warning(
                f"Warning: In MongoDB collection 'configurations' found more than one config file for '{collection_name}', using the first one"
            )
            return json.loads(json_util.dumps(collection_info[0]))
        elif len(collection_info) == 0:
            logger.error(
                f"Error: In mongo db collection 'configurations' could not be found a config file for the collection '{collection_name}'"
            )
            raise HTTPException(
                status_code=404,
                detail=f"Configuration not found for collection '{collection_name}'",
            )
        else:
            return json.loads(json_util.dumps(collection_info[0]))

    except Exception as e:
        logger.error(f"Error fetching collection info: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Error fetching collection info: {str(e)}"
        )


def get_embedder(embedding_model: str):
    """Get embeddings configuration for the specified model"""
    match embedding_model:
        case "jina/jina-embeddings-v2-base-de":
            logger.info(f"Fetches Jina Embedding Model '{embedding_model}'")
            return {
                "dense_embeddings": OllamaEmbeddings(
                    model="jina/jina-embeddings-v2-base-de",
                    base_url="http://host.docker.internal:11434",
                ),
                "sparse_embeddings": FastEmbedSparse(model_name="Qdrant/bm25"),
                "embedding_dim": 768,
            }
        case "text-embedding-3-small":
            logger.info(f"Fetches OpenAI Embedding Model '{embedding_model}'")
            return {
                "dense_embeddings": OpenAIEmbeddings(model=embedding_model),
                "sparse_embeddings": FastEmbedSparse(model_name="Qdrant/bm25"),
                "embedding_dim": 1536,
            }
        case _:
            return -1


def get_distance_metric(distance_metric: str):
    """Convert string distance metric to Qdrant Distance enum"""
    match distance_metric:
        case "Cosine similarity":
            return Distance.COSINE
        case "Dot product":
            return Distance.DOT
        case "Euclidean distance":
            return Distance.EUCLID
        case "Manhattan distance":
            return Distance.MANHATTAN
        case _:
            return ""


class CollectionCreateRequest(BaseModel):
    collection_name: str
    description: Optional[str] = ""
    embedding_model: str
    chunk_size: int
    chunk_overlap: int
    distance_metric: str


@router.post("/collections")
async def create_collection(request: CollectionCreateRequest):
    """
    Create a new knowledge base collection with specified configuration.

    This creates:
    1. A Qdrant collection with the specified vector configuration
    2. A MongoDB configuration document with collection metadata and settings
    """

    # Validate embedding model
    embedder_info = get_embedder(request.embedding_model)
    if embedder_info == -1:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported embedding model: {request.embedding_model}",
        )

    embedding_dim = embedder_info["embedding_dim"]
    distance_metric = get_distance_metric(request.distance_metric)

    if not distance_metric:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid distance metric: {request.distance_metric}",
        )

    # Create Qdrant collection
    try:
        qdrant_client.create_collection(
            collection_name=request.collection_name,
            vectors_config={
                "dense": VectorParams(size=embedding_dim, distance=distance_metric)
            },
            sparse_vectors_config={
                "sparse": SparseVectorParams(
                    index=models.SparseIndexParams(on_disk=False)
                )
            },
        )
        logger.info(f"Created Qdrant collection: {request.collection_name}")
    except Exception as e:
        logger.error(
            f"Error creating qdrant collection {request.collection_name}: {str(e)}"
        )
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create qdrant collection {request.collection_name}: {str(e)}",
        )

    # Save configuration to MongoDB
    try:
        config = {
            "collection_name": request.collection_name,
            "description": request.description or "",
            "dense_embedding_model": request.embedding_model,
            "dense_embedding_dim": embedding_dim,
            "sparse_embedding_model": "bm25",
            "chunk_size": request.chunk_size,
            "chunk_overlap": request.chunk_overlap,
            "distance_metric": request.distance_metric,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
        }
        mongodb_client = MongoDBClient.get_instance()
        mongodb_client.persist_docs(docs=[config], collection_name="configurations")
        logger.info(f"Saved configuration for collection: {request.collection_name}")
    except Exception as e:
        # Rollback: delete the Qdrant collection if MongoDB save fails
        try:
            qdrant_client.delete_collection(collection_name=request.collection_name)
        except:
            pass

        logger.error(
            f"Error saving config document for qdrant collection '{request.collection_name}' in mongodb: {str(e)}"
        )
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save config document for qdrant collection '{request.collection_name}' in mongodb: {str(e)}",
        )

    # Return config without MongoDB _id (which causes JSON serialization issues)
    return {
        "status": "success",
        "message": f"Collection '{request.collection_name}' created successfully",
        "collection_name": request.collection_name,
        "description": config["description"],
        "embedding_model": config["dense_embedding_model"],
        "chunk_size": config["chunk_size"],
        "chunk_overlap": config["chunk_overlap"],
        "distance_metric": config["distance_metric"],
    }


class DocumentUpload(BaseModel):
    url: HttpUrl
    custom_payload: Optional[str] = None


class UploadDocumentsRequest(BaseModel):
    collection_name: str
    documents: List[DocumentUpload]


import hashlib
from typing import List, Set


def generate_content_hash(text: str) -> str:
    """Generate a hash based on document content for deduplication."""
    return hashlib.md5(text.encode("utf-8")).hexdigest()


from urllib.parse import urlparse, urlunparse


def normalize_url(url: str) -> str:
    """
    Normalize URL to prevent duplicates from different URL variations.

    Normalizations:
    1. Convert to lowercase
    2. Remove 'www.' from domain
    3. Standardize protocol (use https)
    4. Remove trailing slashes
    5. Sort query parameters

    Args:
        url: URL string to normalize

    Returns:
        Normalized URL string
    """
    if not url:
        return url

    parsed = urlparse(url.lower().strip())

    netloc = parsed.netloc
    if netloc.startswith("www."):
        netloc = netloc[4:]

    normalized = urlunparse(
        (
            "https",
            netloc,
            parsed.path.rstrip("/"),
            parsed.params,
            parsed.query,
            parsed.fragment,
        )
    )

    return normalized


@router.post("/upload_documents")
async def upload_documents(request: UploadDocumentsRequest):
    """
    Upload documents to the vector database with duplicate detection and URL normalization.

    - collection_name: Name of the collection to add documents to
    - documents: List of document objects containing URL and optional custom payload

    Performs deduplication at multiple levels:
    1. URL normalization - prevents duplicates from http/https, www/non-www variants
    2. Document level in MongoDB - prevents duplicate URLs/documents
    3. Chunk level in Qdrant - prevents duplicate content chunks
    """
    try:
        mongodb_client = MongoDBClient.get_instance()
        valid_urls = []

        collection_info = mongodb_client.get_docs(
            filter={"collection_name": request.collection_name},
            collection_name="configurations",
        )
        if not collection_info:
            raise HTTPException(
                status_code=404,
                detail=f"Collection configuration not found for {request.collection_name}",
            )

        chunk_size = collection_info[0].get("chunk_size", 1000)
        chunk_overlap = collection_info[0].get("chunk_overlap", 100)

        urls = [str(doc.url) for doc in request.documents]
        url_mapping = {url: normalize_url(url) for url in urls}
        normalized_urls = set(url_mapping.values())

        url_to_payload = {}
        for doc in request.documents:
            raw_url = str(doc.url)
            normalized_url = url_mapping[raw_url]
            url_to_payload[normalized_url] = doc.custom_payload

        url_to_docs_map = {}

        existing_docs = set()

        for normalized_url in normalized_urls:
            existing_url_docs = mongodb_client.get_docs_by_url(
                source_url=normalized_url, collection_name=request.collection_name
            )

            if not existing_url_docs:
                parsed = urlparse(normalized_url)
                domain = parsed.netloc
                path = parsed.path

                variant_urls = [
                    f"https://{domain}{path}",
                    f"http://{domain}{path}",
                    f"https://www.{domain}{path}",
                    f"http://www.{domain}{path}",
                ]

                for variant in variant_urls:
                    variant_docs = mongodb_client.get_docs_by_url(
                        source_url=variant, collection_name=request.collection_name
                    )
                    if (
                        variant_docs
                        and isinstance(variant_docs, list)
                        and len(variant_docs) > 0
                    ):
                        existing_url_docs = variant_docs
                        break

            if (
                existing_url_docs
                and isinstance(existing_url_docs, list)
                and len(existing_url_docs) > 0
            ):
                existing_docs.add(normalized_url)
                sorted_docs = sorted(
                    existing_url_docs,
                    key=lambda x: x.get("timestamp", ""),
                    reverse=True,
                )
                latest_doc = sorted_docs[0]
                doc_markdown = latest_doc.get("markdown", "")
                if doc_markdown:
                    url_to_docs_map[normalized_url] = doc_markdown
                valid_urls.append(normalized_url)
                logger.info(
                    f"URL {normalized_url} already exists in MongoDB collection {request.collection_name}"
                )

        for url in urls:
            normalized_url = url_mapping[url]
            if normalized_url in existing_docs:
                continue

            docs = mongodb_client.get_docs_by_url(
                source_url=url, collection_name="temp"
            )
            if docs and isinstance(docs, list) and len(docs) > 0:
                sorted_docs = sorted(
                    docs, key=lambda x: x.get("timestamp", ""), reverse=True
                )
                latest_doc = sorted_docs[0]

                doc_markdown = latest_doc.get("markdown", "")
                if not doc_markdown:
                    continue

                if not latest_doc.get("metadata"):
                    latest_doc["metadata"] = {}
                latest_doc["metadata"]["content_hash"] = generate_content_hash(
                    doc_markdown
                )

                latest_doc["metadata"]["normalized_url"] = normalized_url

                latest_doc["source_url"] = normalized_url

                mongodb_client.persist_docs(
                    docs=[latest_doc], collection_name=request.collection_name
                )

                url_to_docs_map[normalized_url] = doc_markdown
                valid_urls.append(normalized_url)

        headers_to_split_on = [("#", "Header 1"), ("##", "Header 2")]

        existing_hashes = await get_existing_content_hashes(request.collection_name)
        logger.info(
            f"Found {len(existing_hashes)} existing document hashes in collection"
        )

        all_chunks = []
        all_uuids = []
        all_hashes = set()
        duplicate_count = 0
        skipped_chunks_count = 0

        # Minimum chunk length configuration
        MIN_CHUNK_LENGTH = 100  # Minimum 100 characters of actual content

        for url, markdown_doc in url_to_docs_map.items():
            markdown_splitter = MarkdownHeaderTextSplitter(
                headers_to_split_on=headers_to_split_on, strip_headers=True
            )
            md_header_splits = markdown_splitter.split_text(markdown_doc)

            text_splitter = RecursiveCharacterTextSplitter(
                chunk_size=chunk_size,
                chunk_overlap=chunk_overlap,
                separators=["\n\n", "\n", ".", ";", ",", " "],
            )

            doc_chunks = text_splitter.split_documents(md_header_splits)

            # Merge chunks that are too small
            merged_chunks = []
            pending_chunk = None

            for chunk in doc_chunks:
                content_length = len(chunk.page_content.strip())

                # If chunk is too small
                if content_length < MIN_CHUNK_LENGTH:
                    if pending_chunk is None:
                        # Start accumulating small chunks
                        pending_chunk = chunk
                    else:
                        # Merge with previous small chunk
                        pending_chunk.page_content += "\n\n" + chunk.page_content
                        # Merge metadata if different
                        if chunk.metadata:
                            for key, value in chunk.metadata.items():
                                if key not in pending_chunk.metadata and value:
                                    pending_chunk.metadata[key] = value
                else:
                    # Chunk is large enough
                    if pending_chunk is not None:
                        # Merge pending small chunks with current chunk
                        chunk.page_content = (
                            pending_chunk.page_content + "\n\n" + chunk.page_content
                        )
                        # Merge metadata
                        if pending_chunk.metadata:
                            for key, value in pending_chunk.metadata.items():
                                if key not in chunk.metadata and value:
                                    chunk.metadata[key] = value
                        pending_chunk = None
                    merged_chunks.append(chunk)

            # Handle any remaining pending chunk
            if pending_chunk is not None:
                if len(merged_chunks) > 0:
                    # Merge with last chunk
                    merged_chunks[-1].page_content += (
                        "\n\n" + pending_chunk.page_content
                    )
                    # Merge metadata
                    if pending_chunk.metadata:
                        for key, value in pending_chunk.metadata.items():
                            if key not in merged_chunks[-1].metadata and value:
                                merged_chunks[-1].metadata[key] = value
                else:
                    # No chunks to merge with - add if it has some content
                    if len(pending_chunk.page_content.strip()) > 20:
                        merged_chunks.append(pending_chunk)
                    else:
                        logger.warning(
                            f"Skipping very small orphan chunk from {url}: {pending_chunk.page_content[:100]}"
                        )
                        skipped_chunks_count += 1

            # Process merged chunks
            for chunk in merged_chunks:
                if not chunk.metadata:
                    chunk.metadata = {}

                # Add headers to content for context
                header_prefix = ""
                if "Header 1" in chunk.metadata and chunk.metadata["Header 1"]:
                    header_prefix += f"# {chunk.metadata['Header 1']}\n"
                if "Header 2" in chunk.metadata and chunk.metadata["Header 2"]:
                    header_prefix += f"## {chunk.metadata['Header 2']}\n"

                if header_prefix:
                    chunk.page_content = f"{header_prefix}\n{chunk.page_content}"

                chunk.metadata["source_url"] = url

                if url in url_to_payload and url_to_payload[url]:
                    chunk.metadata["custom_payload"] = url_to_payload[url]

                content_hash = generate_content_hash(chunk.page_content)

                if content_hash in existing_hashes:
                    duplicate_count += 1
                    continue

                chunk.metadata["content_hash"] = content_hash

                all_chunks.append(chunk)
                all_uuids.append(str(uuid4()))
                all_hashes.add(content_hash)

        if all_chunks:
            embedder_info = get_embedder(
                collection_info[0].get("dense_embedding_model")
            )
            if embedder_info == -1:
                raise HTTPException(
                    status_code=400, detail=f"Unsupported embedding model"
                )

            dense_embeddings = embedder_info["dense_embeddings"]
            sparse_embeddings = embedder_info["sparse_embeddings"]

            qdrant = QdrantVectorStore(
                client=qdrant_client,
                collection_name=request.collection_name,
                embedding=dense_embeddings,
                sparse_embedding=sparse_embeddings,
                retrieval_mode=RetrievalMode.HYBRID,
                vector_name="dense",
                sparse_vector_name="sparse",
            )

            qdrant.add_documents(documents=all_chunks, ids=all_uuids)

        logger.info(
            f"Processing complete: {len(all_chunks)} chunks added, {duplicate_count} duplicates skipped, {skipped_chunks_count} tiny chunks merged"
        )

        return {
            "status": "success",
            "message": f"Successfully processed {len(all_chunks)} documents from {len(valid_urls)} valid URLs",
            "processed_urls": valid_urls,
            "duplicate_chunks_skipped": duplicate_count,
            "tiny_chunks_merged": skipped_chunks_count,
        }

    except Exception as e:
        logger.error(f"Error processing documents: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Error processing documents: {str(e)}"
        )


@router.get("/check_url_exists")
async def check_url_exists(collection_name: str, url: str):
    """
    Check if a URL already exists in the specified collection.
    Uses URL normalization to handle variants (http/https, www/non-www).

    Args:
        collection_name: Name of the collection to check
        url: URL to check for existence

    Returns:
        Dict with exists flag and document count
    """
    try:
        mongodb_client = MongoDBClient.get_instance()

        normalized_url = normalize_url(url)

        docs = mongodb_client.get_docs_by_url(
            source_url=normalized_url, collection_name=collection_name
        )

        if not docs or len(docs) == 0:
            parsed = urlparse(normalized_url)
            domain = parsed.netloc
            path = parsed.path

            variant_urls = [
                f"https://{domain}{path}",
                f"http://{domain}{path}",
                f"https://www.{domain}{path}",
                f"http://www.{domain}{path}",
            ]

            for variant in variant_urls:
                if variant == normalized_url:
                    continue

                variant_docs = mongodb_client.get_docs_by_url(
                    source_url=variant, collection_name=collection_name
                )
                if (
                    variant_docs
                    and isinstance(variant_docs, list)
                    and len(variant_docs) > 0
                ):
                    docs = variant_docs
                    break

        exists = docs is not None and isinstance(docs, list) and len(docs) > 0

        return {
            "status": "success",
            "exists": exists,
            "document_count": len(docs) if exists else 0,
            "normalized_url": normalized_url,
        }
    except Exception as e:
        logger.error(f"Error checking URL existence: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Error checking URL existence: {str(e)}"
        )


@router.post("/deduplicate_collection")
async def deduplicate_collection(collection_name: str):
    """
    Clean up a collection by removing duplicate documents with the same content
    but different URL variants (http/https, www/non-www).

    This is useful for collections that were created before URL normalization was implemented.

    Args:
        collection_name: Name of the collection to deduplicate

    Returns:
        Dict with status and summary of the deduplication process
    """
    try:
        mongodb_client = MongoDBClient.get_instance()

        all_docs = mongodb_client.get_docs(filter={}, collection_name=collection_name)

        url_groups = {}
        for doc in all_docs:
            url = doc.get("source_url")
            if not url:
                continue

            normalized_url = normalize_url(url)
            if normalized_url not in url_groups:
                url_groups[normalized_url] = []

            url_groups[normalized_url].append(doc)

        duplicate_groups = {
            url: docs for url, docs in url_groups.items() if len(docs) > 1
        }

        docs_to_remove = []
        for url, docs in duplicate_groups.items():
            sorted_docs = sorted(
                docs, key=lambda x: x.get("timestamp", ""), reverse=True
            )
            for doc in sorted_docs[1:]:
                doc_id = doc.get("_id")
                if doc_id:
                    docs_to_remove.append(doc_id)

        qdrant_points = await get_all_points(collection_name)

        hash_groups = {}
        for point in qdrant_points:
            if not point.payload or "metadata" not in point.payload:
                continue

            content_hash = point.payload["metadata"].get("content_hash")
            if not content_hash:
                continue

            if content_hash not in hash_groups:
                hash_groups[content_hash] = []

            hash_groups[content_hash].append(point)

        duplicate_hashes = {
            hash: points for hash, points in hash_groups.items() if len(points) > 1
        }
        point_ids_to_remove = []

        for hash, points in duplicate_hashes.items():
            normalized_urls = set()
            for point in points:
                url = point.payload["metadata"].get("source_url", "")
                normalized_url = normalize_url(url)
                normalized_urls.add(normalized_url)

            if len(normalized_urls) == 1:
                for point in points[1:]:
                    point_ids_to_remove.append(point.id)

        if point_ids_to_remove:
            qdrant_client.delete(
                collection_name=collection_name,
                points_selector=models.PointIdsList(points=point_ids_to_remove),
            )

        removed_docs = 0
        if docs_to_remove:
            removed_docs = len(docs_to_remove)

        return {
            "status": "success",
            "duplicate_url_groups": len(duplicate_groups),
            "duplicate_content_hashes": len(duplicate_hashes),
            "removed_mongodb_docs": removed_docs,
            "removed_qdrant_points": len(point_ids_to_remove),
        }

    except Exception as e:
        logger.error(f"Error deduplicating collection {collection_name}: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Error deduplicating collection: {str(e)}"
        )


async def get_all_points(collection_name: str, batch_size=1000):
    """Get all points from a Qdrant collection with pagination."""
    all_points = []
    offset = None

    while True:
        response = qdrant_client.scroll(
            collection_name=collection_name,
            limit=batch_size,
            offset=offset,
            with_payload=True,
            with_vectors=False,
        )

        points, offset = response
        all_points.extend(points)

        if offset is None or len(points) < batch_size:
            break

    return all_points


async def get_existing_content_hashes(collection_name: str) -> Set[str]:
    """
    Retrieve all content hashes from existing documents in the collection.

    Args:
        collection_name: The name of the Qdrant collection

    Returns:
        A set of content hash strings
    """
    try:
        response = qdrant_client.scroll(
            collection_name=collection_name,
            limit=10000,
            with_payload=True,
            with_vectors=False,
        )

        existing_hashes = set()

        for point in response[0]:
            if point.payload and "metadata" in point.payload:
                content_hash = point.payload["metadata"].get("content_hash")
                if content_hash:
                    existing_hashes.add(content_hash)

        return existing_hashes

    except Exception as e:
        logger.error(
            f"Error retrieving content hashes from collection {collection_name}: {str(e)}"
        )
        return set()


@router.delete("/collections/{collection_name}")
async def delete_collection(collection_name: str):
    """
    Delete a collection and all its associated data.

    This removes:
    1. The Qdrant vector collection
    2. The MongoDB document collection
    3. The MongoDB configuration document
    """

    # Delete collection directory
    try:
        collection_path = os.path.join("/data", "files", collection_name)
        if os.path.isdir(collection_path):
            shutil.rmtree(collection_path)
    except Exception as e:
        logger.error(
            f"Error deleting directory of collection {collection_name}: {str(e)}"
        )
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete directory of collection {collection_name}: {str(e)}",
        )

    # Delete from Qdrant
    try:
        qdrant_client.delete_collection(collection_name=collection_name)
        logger.info(f"Deleted Qdrant collection: {collection_name}")
    except Exception as e:
        logger.error(f"Error deleting qdrant collection {collection_name}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete qdrant collection {collection_name}: {str(e)}",
        )

    # Delete from MongoDB
    try:
        mongodb_client = MongoDBClient.get_instance()

        # Delete the document collection
        mongodb_client.delete_collection(collection_name)

        # Delete the configuration document
        mongodb_client.delete_documents(
            filter_query={"collection_name": collection_name},
            collection_name="configurations",
        )

        logger.info(f"Deleted MongoDB collection and configuration: {collection_name}")
    except Exception as e:
        logger.error(f"Error deleting mongodb collection {collection_name}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete mongodb collection {collection_name}: {str(e)}",
        )

    return {
        "status": "success",
        "message": f"Collection '{collection_name}' deleted successfully",
    }


@router.patch("/collections/{collection_name}")
async def update_collection(collection_name: str, description: Optional[str] = None):
    """
    Update collection metadata (e.g., description).

    Args:
        collection_name: Name of the collection to update
        description: New description for the collection
    """
    try:
        mongodb_client = MongoDBClient.get_instance()

        # Check if collection exists
        collection_info = mongodb_client.get_docs(
            filter={"collection_name": collection_name},
            collection_name="configurations",
        )

        if not collection_info:
            raise HTTPException(
                status_code=404, detail=f"Collection '{collection_name}' not found"
            )

        # Update fields
        update_data = {"updated_at": datetime.now().isoformat()}

        if description is not None:
            update_data["description"] = description

        # Update in MongoDB
        from bson.objectid import ObjectId

        doc_id = str(collection_info[0]["_id"])

        success = mongodb_client.update_document(
            doc_id=doc_id, update_data=update_data, collection_name="configurations"
        )

        if not success:
            raise HTTPException(status_code=500, detail="Failed to update collection")

        return {
            "status": "success",
            "message": f"Collection '{collection_name}' updated successfully",
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating collection {collection_name}: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Error updating collection: {str(e)}"
        )
