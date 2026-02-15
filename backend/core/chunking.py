"""
Document chunking.
"""

import logging
from uuid import uuid4

from langchain_core.documents import Document
from langchain_text_splitters import (
    CharacterTextSplitter,
    MarkdownHeaderTextSplitter,
)

logger = logging.getLogger(__name__)

# Headers to split on
_HEADERS_TO_SPLIT_ON = [
    ("#", "Header 1"),
    ("##", "Header 2"),
    ("###", "Header 3"),
]


def chunk_documents(
    documents: list[dict],
    chunk_size: int = 1000,
    chunk_overlap: int = 100,
) -> tuple[list[Document], list[str]]:
    """
    Chunk a list of documents into smaller pieces for embedding.

    Each document dict should have:
        - "content" or "markdown": the text to chunk
        - "url": source URL or file path
        - "title": document title (optional)
        - "source_category": "website" or "file" (optional)
        - "collection_name": collection it belongs to (optional)

    Args:
        documents: List of document dicts with content and metadata.
        chunk_size: Target chunk size in tokens.
        chunk_overlap: Overlap between consecutive chunks in tokens.

    Returns:
        Tuple of (chunks as LangChain Documents, UUIDs for each chunk).
    """
    markdown_splitter = MarkdownHeaderTextSplitter(
        headers_to_split_on=_HEADERS_TO_SPLIT_ON,
        strip_headers=True,
    )

    text_splitter = CharacterTextSplitter.from_tiktoken_encoder(
        encoding_name="cl100k_base",
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
    )

    all_chunks: list[Document] = []
    all_ids: list[str] = []

    for doc_data in documents:
        content = doc_data.get("markdown") or doc_data.get("content", "")
        if not content:
            logger.warning(f"Skipping document with no content: {doc_data.get('url')}")
            continue

        try:
            chunks = _chunk_single_document(
                content=content,
                metadata=_extract_metadata(doc_data),
                markdown_splitter=markdown_splitter,
                text_splitter=text_splitter,
            )

            for chunk in chunks:
                all_chunks.append(chunk)
                all_ids.append(str(uuid4()))

            logger.info(
                f"Created {len(chunks)} chunks from {doc_data.get('url', 'unknown')}"
            )

        except Exception as e:
            logger.error(f"Error chunking {doc_data.get('url', 'unknown')}: {e}")

    logger.info(
        f"Chunking complete: {len(all_chunks)} total chunks from {len(documents)} documents"
    )
    return all_chunks, all_ids


def _chunk_single_document(
    content: str,
    metadata: dict,
    markdown_splitter: MarkdownHeaderTextSplitter,
    text_splitter: CharacterTextSplitter,
) -> list[Document]:
    """Chunk a single document's content."""

    # Step 1: Split by markdown headers
    header_splits = markdown_splitter.split_text(content)

    # Step 2: Split into sized chunks
    chunks = text_splitter.split_documents(header_splits)

    # Step 3: Enrich each chunk
    enriched = []
    for chunk in chunks:
        # Build header prefix from markdown structure
        header_prefix = _build_header_prefix(chunk.metadata, metadata.get("title"))

        if header_prefix:
            chunk.page_content = header_prefix + chunk.page_content

        # Merge source metadata into chunk metadata
        chunk.metadata = {**metadata, **chunk.metadata}
        enriched.append(chunk)

    return enriched


def _build_header_prefix(chunk_metadata: dict, title: str | None = None) -> str:
    """Build a header prefix string from chunk metadata for context."""
    parts = []

    if title:
        parts.append(f"# {title}")

    for key in ("Header 1", "Header 2", "Header 3"):
        value = chunk_metadata.get(key)
        if value:
            level = int(key.split()[-1]) + (1 if title else 0)
            prefix = "#" * min(level, 4)
            parts.append(f"{prefix} {value}")

    if parts:
        return "\n".join(parts) + "\n\n"
    return ""


def _extract_metadata(doc_data: dict) -> dict:
    """Extract standard metadata fields from a document dict."""
    metadata = {
        "source_url": doc_data.get("url", ""),
        "title": doc_data.get("title", "Untitled"),
    }

    # Optional fields — only include if present
    if "source_category" in doc_data:
        metadata["source_category"] = doc_data["source_category"]
    if "collection_name" in doc_data:
        metadata["collection_name"] = doc_data["collection_name"]

    return metadata
