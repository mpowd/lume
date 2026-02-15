"""
Qdrant vector store operations.

Thin helper around QdrantClient and LangChain's QdrantVectorStore.
"""

import logging

from langchain_core.documents import Document
from langchain_qdrant import QdrantVectorStore, RetrievalMode
from qdrant_client import QdrantClient, models
from qdrant_client.http.models import (
    Distance,
    SparseVectorParams,
    VectorParams,
)

from backend.core.embeddings import EmbeddingConfig

logger = logging.getLogger(__name__)

# ── Distance metric mapping ──────────────────────────────

_DISTANCE_MAP: dict[str, Distance] = {
    "Cosine similarity": Distance.COSINE,
    "Dot product": Distance.DOT,
    "Euclidean distance": Distance.EUCLID,
    "Manhattan distance": Distance.MANHATTAN,
}


def parse_distance_metric(metric_name: str) -> Distance:
    """Convert a human-readable distance metric name to Qdrant enum."""
    if metric_name not in _DISTANCE_MAP:
        raise ValueError(
            f"Invalid distance metric: {metric_name}. "
            f"Supported: {list(_DISTANCE_MAP.keys())}"
        )
    return _DISTANCE_MAP[metric_name]


# ── Collection operations ─────────────────────────────────


def create_collection(
    client: QdrantClient,
    collection_name: str,
    embedding_dim: int,
    distance: Distance,
) -> None:
    """Create a Qdrant collection with dense + sparse vector config."""
    client.create_collection(
        collection_name=collection_name,
        vectors_config={
            "dense": VectorParams(size=embedding_dim, distance=distance),
        },
        sparse_vectors_config={
            "sparse": SparseVectorParams(
                index=models.SparseIndexParams(on_disk=False),
            ),
        },
    )
    logger.info(f"Created Qdrant collection: {collection_name}")


def delete_collection(client: QdrantClient, collection_name: str) -> None:
    """Delete a Qdrant collection."""
    client.delete_collection(collection_name=collection_name)
    logger.info(f"Deleted Qdrant collection: {collection_name}")


def collection_exists(client: QdrantClient, collection_name: str) -> bool:
    """Check if a collection exists."""
    collections = client.get_collections()
    return any(c.name == collection_name for c in collections.collections)


def list_collection_names(client: QdrantClient) -> list[str]:
    """List all collection names, sorted alphabetically."""
    response = client.get_collections()
    return sorted(c.name for c in response.collections)


# ── Document operations ───────────────────────────────────


def store_documents(
    client: QdrantClient,
    collection_name: str,
    chunks: list[Document],
    chunk_ids: list[str],
    embedding_config: EmbeddingConfig,
    batch_size: int = 10,
) -> int:
    """
    Embed and store document chunks in Qdrant.

    Args:
        client: Qdrant client instance.
        collection_name: Target collection.
        chunks: LangChain Document objects to embed and store.
        chunk_ids: UUIDs for each chunk (must match len(chunks)).
        embedding_config: Dense + sparse embedding models.
        batch_size: Number of chunks per batch.

    Returns:
        Number of chunks stored.
    """
    if not chunks:
        logger.warning("No chunks to store")
        return 0

    vector_store = QdrantVectorStore(
        client=client,
        collection_name=collection_name,
        embedding=embedding_config.dense,
        sparse_embedding=embedding_config.sparse,
        retrieval_mode=RetrievalMode.HYBRID,
        vector_name="dense",
        sparse_vector_name="sparse",
    )

    for i in range(0, len(chunks), batch_size):
        batch_chunks = chunks[i : i + batch_size]
        batch_ids = chunk_ids[i : i + batch_size]
        vector_store.add_documents(documents=batch_chunks, ids=batch_ids)

    logger.info(f"Stored {len(chunks)} chunks in Qdrant collection '{collection_name}'")
    return len(chunks)


def delete_documents_by_urls(
    client: QdrantClient,
    collection_name: str,
    urls: list[str],
) -> None:
    """Delete all points matching the given source URLs."""
    for url in urls:
        client.delete(
            collection_name=collection_name,
            points_selector=models.FilterSelector(
                filter=models.Filter(
                    must=[
                        models.FieldCondition(
                            key="metadata.source_url",
                            match=models.MatchValue(value=url),
                        ),
                    ],
                )
            ),
        )
    logger.info(f"Deleted documents for {len(urls)} URLs from '{collection_name}'")
