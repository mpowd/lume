"""
File parsing service — extracts content from uploaded files.
"""

import hashlib
import logging
import os
from datetime import datetime

from llama_parse import LlamaParse

logger = logging.getLogger(__name__)

# Base directory for stored files
FILES_BASE_DIR = "/data/files"


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
    # Ensure collection directory exists
    collection_dir = os.path.join(FILES_BASE_DIR, collection_name)
    os.makedirs(collection_dir, exist_ok=True)

    file_path = os.path.join(collection_dir, filename)

    # Save file to disk
    with open(file_path, "wb") as f:
        f.write(content)

    logger.info(f"Saved file to {file_path}")

    # Parse with LlamaParse
    try:
        parser = LlamaParse(
            result_type="markdown",
            base_url="https://api.cloud.eu.llamaindex.ai",
            split_by_page=False,
        )

        with open(file_path, "rb") as f:
            documents = parser.load_data(f, extra_info={"file_name": file_path})

        parsed_content = ""
        for doc in documents:
            parsed_content += doc.text_resource.text

        if not parsed_content:
            raise RuntimeError(f"LlamaParse returned empty content for {filename}")

    except Exception as e:
        logger.error(f"Error parsing {filename}: {e}")
        raise RuntimeError(f"Failed to parse {filename}: {e}") from e

    return {
        "filename": filename,
        "url": file_path,
        "content": parsed_content,
        "source_category": "file",
        "collection_name": collection_name,
        "size": len(parsed_content),
        "timestamp": datetime.now().isoformat(),
        "hash": hashlib.md5(parsed_content.encode("utf-8")).hexdigest(),
    }


def delete_collection_files(collection_name: str) -> None:
    """Remove the file directory for a collection."""
    import shutil

    collection_dir = os.path.join(FILES_BASE_DIR, collection_name)
    if os.path.isdir(collection_dir):
        shutil.rmtree(collection_dir)
        logger.info(f"Deleted file directory: {collection_dir}")
