"""
File parsing service — extracts content from uploaded files.
"""

import hashlib
import logging
import shutil
from datetime import datetime
from pathlib import Path

from llama_parse import LlamaParse

from backend.config import settings

logger = logging.getLogger(__name__)

FILES_BASE_DIR: Path = settings.FILES_BASE_DIR


def parse_file(
    filename: str,
    content: bytes,
    collection_name: str,
) -> dict:
    """
    Save a file to disk, parse it with LlamaParse, and return a document dict.

    Args:
        filename: Original filename.
        content: Raw file bytes.
        collection_name: Target collection name.

    Returns:
        Document dict with parsed content and metadata.

    Raises:
        RuntimeError: If parsing fails.
    """
    collection_dir = FILES_BASE_DIR / collection_name
    collection_dir.mkdir(parents=True, exist_ok=True)

    file_path = collection_dir / filename
    file_path.write_bytes(content)
    logger.info(f"Saved file to {file_path}")

    try:
        parser = LlamaParse(
            result_type="markdown",
            base_url="https://api.cloud.eu.llamaindex.ai",
            split_by_page=False,
        )

        documents = parser.load_data(
            str(file_path), extra_info={"file_name": str(file_path)}
        )

        parsed_content = "".join(doc.text_resource.text for doc in documents)

        if not parsed_content:
            raise RuntimeError(f"LlamaParse returned empty content for {filename}")

    except Exception as e:
        logger.error(f"Error parsing {filename}: {e}")
        raise RuntimeError(f"Failed to parse {filename}: {e}") from e

    return {
        "filename": filename,
        "url": str(file_path),
        "content": parsed_content,
        "source_category": "file",
        "collection_name": collection_name,
        "size": len(parsed_content),
        "timestamp": datetime.now().isoformat(),
        "hash": hashlib.md5(parsed_content.encode("utf-8")).hexdigest(),
    }


def delete_collection_files(collection_name: str) -> None:
    """Remove the file directory for a collection."""
    collection_dir = FILES_BASE_DIR / collection_name
    if collection_dir.is_dir():
        shutil.rmtree(collection_dir)
        logger.info(f"Deleted file directory: {collection_dir}")
