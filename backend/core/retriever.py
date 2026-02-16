"""
Document retriever — supports dense and hybrid (dense + sparse) search.
"""

import logging
from typing import Any

from langchain_core.documents import Document
from langchain_qdrant import QdrantVectorStore, RetrievalMode
from qdrant_client import QdrantClient

from backend.config import settings
from backend.core.embeddings import get_embedding_config
from backend.core.llm import get_chat_llm

logger = logging.getLogger(__name__)


_qdrant_client: QdrantClient | None = None
_embedding_config = None
_sparse_embeddings = None


def _get_qdrant_client() -> QdrantClient:
    global _qdrant_client
    if _qdrant_client is None:
        _qdrant_client = QdrantClient(url=settings.qdrant_url, timeout=10)
    return _qdrant_client


def _get_dense_embeddings():
    global _embedding_config
    if _embedding_config is None:
        _embedding_config = get_embedding_config("jina/jina-embeddings-v2-base-de")
    return _embedding_config.dense


def _get_sparse_embeddings():
    """
    Get sparse BM25 embeddings (only needed for hybrid search).

    Lazy-loaded on first hybrid search request. The fastembed library
    caches the model in ~/.cache/fastembed/ so it's only downloaded once.
    """
    global _sparse_embeddings
    if _sparse_embeddings is None:
        from langchain_qdrant import FastEmbedSparse

        logger.info("Loading BM25 sparse model (first hybrid search request)...")
        _sparse_embeddings = FastEmbedSparse(model_name="Qdrant/bm25")
        logger.info("BM25 sparse model loaded and cached.")
    return _sparse_embeddings


def _generate_hypothetical_document(query: str, hyde_prompt: str, llm) -> str:
    """Generate a hypothetical answer to use as the search query (HyDE)."""
    try:
        formatted_prompt = hyde_prompt.format(question=query)
        response = llm.invoke(formatted_prompt)
        return response.content if hasattr(response, "content") else str(response)
    except Exception as e:
        logger.error(f"HyDE generation failed, falling back to original query: {e}")
        return query


async def retrieve(
    query: str,
    knowledge_base_ids: list[str],
    config: dict[str, Any],
) -> list[Document]:
    """
    Retrieve relevant documents from vector store.

    Args:
        query: The user's question.
        knowledge_base_ids: Collection names to search.
        config: Assistant config dict with keys:
            - hybrid_search (bool): Use hybrid (dense + sparse) or dense only
            - top_k (int): Number of documents to retrieve
            - use_hyde (bool): Generate hypothetical document first
            - hyde_prompt (str): Prompt template for HyDE
            - llm_model (str): Model for HyDE generation
            - llm_provider (str): Provider for HyDE generation
    """
    if not knowledge_base_ids:
        logger.warning("No knowledge bases specified")
        return []

    collection_name = knowledge_base_ids[0]
    hybrid = config.get("hybrid_search", True)
    top_k = config.get("top_k", 10)

    logger.info(
        f"Retrieving from '{collection_name}' "
        f"(mode={'hybrid' if hybrid else 'dense'}, top_k={top_k})"
    )

    # Build vector store with appropriate search mode
    store_kwargs = {
        "client": _get_qdrant_client(),
        "collection_name": collection_name,
        "embedding": _get_dense_embeddings(),
        "vector_name": "dense",
    }

    if hybrid:
        store_kwargs["sparse_embedding"] = _get_sparse_embeddings()
        store_kwargs["sparse_vector_name"] = "sparse"
        store_kwargs["retrieval_mode"] = RetrievalMode.HYBRID
    else:
        store_kwargs["retrieval_mode"] = RetrievalMode.DENSE

    vector_store = QdrantVectorStore(**store_kwargs)
    retriever = vector_store.as_retriever(search_kwargs={"k": top_k})

    # Apply HyDE if enabled
    query_to_use = query
    if config.get("use_hyde", False):
        hyde_prompt = config.get(
            "hyde_prompt",
            "Given a question, generate a paragraph that answers it.\n\n"
            "Question: {question}\n\nParagraph: ",
        )
        llm = get_chat_llm(
            model=config.get("llm_model", "gpt-4o-mini"),
            provider=config.get("llm_provider", "openai"),
        )
        query_to_use = _generate_hypothetical_document(query, hyde_prompt, llm)
        logger.info(f"HyDE query: {query_to_use[:100]}...")

    documents = retriever.invoke(query_to_use)
    logger.info(f"Retrieved {len(documents)} documents")
    return documents
