"""
Shared utilities for assistant pipelines.
"""

from typing import Any

from langchain_core.documents import Document


def format_context(documents: list[Document]) -> str:
    """Format documents as a context string for LLM prompts."""
    parts = []
    for doc in documents:
        doc_name = doc.metadata.get("Title", "Document")
        parts.append(f"[Quote from {doc_name}] {doc.page_content}")
    return "\n\n".join(parts)


def format_context_with_indices(documents: list[Document]) -> str:
    """Format documents with chunk indices for precise citation."""
    return "\n\n".join(
        f"[Chunk {i}]\n{doc.page_content}" for i, doc in enumerate(documents)
    )


def extract_sources(
    documents: list[Document], include_without_scores: bool = False
) -> list[dict[str, Any]]:
    """Extract source URLs and metadata from retrieved documents."""
    sources = []
    for doc in documents:
        source = (
            doc.metadata.get("source")
            or doc.metadata.get("url")
            or doc.metadata.get("source_url")
            or "Unknown source"
        )
        score = doc.metadata.get("relevance_score")
        collection_name = doc.metadata.get("collection_name")

        if score is not None:
            sources.append(
                {
                    "url": source,
                    "score": float(score),
                    "metadata": {"collection_name": collection_name},
                }
            )
        elif include_without_scores:
            sources.append(
                {
                    "url": source,
                    "metadata": {"collection_name": collection_name},
                }
            )
    return sources
