"""
Embedding model factory
"""

import logging
from dataclasses import dataclass

from langchain_core.embeddings import Embeddings
from langchain_ollama import OllamaEmbeddings
from langchain_openai import OpenAIEmbeddings
from langchain_qdrant import FastEmbedSparse

from backend.config import settings

logger = logging.getLogger(__name__)


@dataclass
class EmbeddingConfig:
    """Holds dense + sparse embeddings and dimension info for a model."""

    dense: Embeddings
    sparse: FastEmbedSparse
    dimension: int


# ── Registry of supported models ──────────────────────────

_EMBEDDING_MODELS: dict[str, dict] = {
    "jina/jina-embeddings-v2-base-de": {
        "provider": "ollama",
        "dimension": 768,
    },
    "text-embedding-3-small": {
        "provider": "openai",
        "dimension": 1536,
    },
    "text-embedding-3-large": {
        "provider": "openai",
        "dimension": 3072,
    },
}

# BM25 sparse model used for all hybrid search
_SPARSE_MODEL = "Qdrant/bm25"


def get_embedding_config(model_name: str) -> EmbeddingConfig:
    """
    Create an EmbeddingConfig for the given model name.

    Args:
        model_name: One of the supported embedding model names.

    Returns:
        EmbeddingConfig with dense embeddings, sparse embeddings, and dimension.

    Raises:
        ValueError: If the model name is not supported.
    """
    if model_name not in _EMBEDDING_MODELS:
        raise ValueError(
            f"Unsupported embedding model: {model_name}. "
            f"Supported: {list(_EMBEDDING_MODELS.keys())}"
        )

    model_info = _EMBEDDING_MODELS[model_name]
    provider = model_info["provider"]
    dimension = model_info["dimension"]

    if provider == "ollama":
        dense = OllamaEmbeddings(
            model=model_name,
            base_url=settings.OLLAMA_BASE_URL,
        )
    elif provider == "openai":
        dense = OpenAIEmbeddings(model=model_name)
    else:
        raise ValueError(f"Unknown embedding provider: {provider}")

    sparse = FastEmbedSparse(model_name=_SPARSE_MODEL)

    logger.info(f"Created embedding config for '{model_name}' (dim={dimension})")

    return EmbeddingConfig(dense=dense, sparse=sparse, dimension=dimension)


def list_supported_models() -> list[dict[str, str | int]]:
    """Return metadata for all supported embedding models."""
    return [
        {"name": name, "provider": info["provider"], "dimension": info["dimension"]}
        for name, info in _EMBEDDING_MODELS.items()
    ]


def get_embedding_dimension(model_name: str) -> int:
    """Get the vector dimension for a model without creating instances."""
    if model_name not in _EMBEDDING_MODELS:
        raise ValueError(f"Unsupported embedding model: {model_name}")
    return _EMBEDDING_MODELS[model_name]["dimension"]
