"""
Knowledge base service — orchestrates collection and document management.
"""

import asyncio
import logging
import mimetypes
import os
from uuid import uuid4

from backend.app.exceptions import (
    CollectionConfigError,
    CollectionNotFoundError,
    UnsupportedEmbeddingModelError,
)
from backend.core.chunking import chunk_documents
from backend.core.embeddings import get_embedding_config, get_embedding_dimension
from backend.db import qdrant as qdrant_ops
from backend.db.repositories.knowledge_base_repo import KnowledgeBaseRepository
from backend.services.ingestion import file_parser, website_scraper
from backend.services.task_progress import TaskProgressManager, task_progress_manager

logger = logging.getLogger(__name__)


class KnowledgeBaseService:
    """Service for managing knowledge base collections and documents."""

    def __init__(self, repo: KnowledgeBaseRepository):
        self.repo = repo
        self.progress: TaskProgressManager = task_progress_manager

    # ── Collection CRUD ───────────────────────────────────

    def list_collections(self) -> list[str]:
        return self.repo.list_collection_names()

    def get_collection_config(self, collection_name: str) -> dict:
        config = self.repo.get_collection_config(collection_name)
        if not config:
            raise CollectionNotFoundError(collection_name)
        return config

    def create_collection(
        self,
        collection_name: str,
        description: str,
        embedding_model: str,
        chunk_size: int,
        chunk_overlap: int,
        distance_metric: str,
    ) -> dict:
        """Create a new collection in both Qdrant and MongoDB."""

        # Validate embedding model
        try:
            dimension = get_embedding_dimension(embedding_model)
        except ValueError as e:
            raise UnsupportedEmbeddingModelError(embedding_model) from e

        # Validate distance metric
        try:
            distance = qdrant_ops.parse_distance_metric(distance_metric)
        except ValueError as e:
            raise CollectionConfigError(str(e)) from e

        # Create Qdrant collection
        try:
            qdrant_ops.create_collection(
                client=self.repo.qdrant,
                collection_name=collection_name,
                embedding_dim=dimension,
                distance=distance,
            )
        except Exception as e:
            raise CollectionConfigError(
                f"Failed to create Qdrant collection: {e}"
            ) from e

        # Save config to MongoDB
        try:
            config = self.repo.insert_collection_config(
                {
                    "collection_name": collection_name,
                    "description": description,
                    "dense_embedding_model": embedding_model,
                    "dense_embedding_dim": dimension,
                    "sparse_embedding_model": "bm25",
                    "chunk_size": chunk_size,
                    "chunk_overlap": chunk_overlap,
                    "distance_metric": distance_metric,
                }
            )
        except Exception as e:
            # Rollback Qdrant collection
            try:
                qdrant_ops.delete_collection(self.repo.qdrant, collection_name)
            except Exception:
                logger.error(f"Failed to rollback Qdrant collection: {collection_name}")
            raise CollectionConfigError(f"Failed to save collection config: {e}") from e

        return config

    def update_collection(
        self, collection_name: str, description: str | None = None
    ) -> None:
        """Update collection metadata."""
        config = self.repo.get_collection_config(collection_name)
        if not config:
            raise CollectionNotFoundError(collection_name)

        update_data = {}
        if description is not None:
            update_data["description"] = description

        if update_data:
            self.repo.update_collection_config(collection_name, update_data)

    def delete_collection(self, collection_name: str) -> None:
        """Delete a collection from Qdrant, MongoDB, and disk."""

        # Delete files on disk
        file_parser.delete_collection_files(collection_name)

        # Delete Qdrant collection
        try:
            qdrant_ops.delete_collection(self.repo.qdrant, collection_name)
        except Exception as e:
            logger.error(f"Error deleting Qdrant collection: {e}")

        # Delete MongoDB document collection + config
        try:
            self.repo.drop_document_collection(collection_name)
            self.repo.delete_collection_config(collection_name)
        except Exception as e:
            logger.error(f"Error deleting MongoDB data: {e}")

    # ── Website ingestion ─────────────────────────────────

    async def get_links(
        self,
        base_url: str,
        collection_name: str | None,
        include_external: bool,
    ) -> list[dict]:
        """Discover links and mark which already exist in the collection."""

        links = await website_scraper.get_links(base_url, include_external)

        # Mark existing URLs
        existing_urls: set[str] = set()
        if collection_name:
            try:
                existing_urls = self.repo.get_document_urls(collection_name)
            except Exception as e:
                logger.warning(f"Could not check existing URLs: {e}")

        for link in links:
            link["exists_in_collection"] = link["href"] in existing_urls

        # Sort: new first (by score), then existing
        links.sort(key=lambda x: (x["exists_in_collection"], -x["score"]))

        return links

    def start_website_upload(self, collection_name: str, urls: list[str]) -> str:
        """Start a background website upload task. Returns the task ID."""

        config = self.get_collection_config(collection_name)

        task_id = str(uuid4())
        self.progress.create_task(
            task_id=task_id,
            title="Starting Website Upload",
            message=f"Preparing to process {len(urls)} URLs...",
            stages=[
                {"label": "Scraping Websites", "total": len(urls), "unit": "pages"},
                {"label": "Chunking Documents", "unit": "documents"},
                {"label": "Creating Embeddings", "unit": "chunks"},
            ],
        )

        asyncio.create_task(
            self._process_website_upload(task_id, collection_name, urls, config)
        )

        return task_id

    async def _process_website_upload(
        self,
        task_id: str,
        collection_name: str,
        urls: list[str],
        collection_config: dict,
    ) -> None:
        """Background task: scrape → chunk → embed → store."""
        try:
            # Filter out existing URLs
            existing_urls = self.repo.get_document_urls(collection_name)
            new_urls = [u for u in urls if u not in existing_urls]
            skipped_count = len(urls) - len(new_urls)

            if not new_urls:
                self.progress.complete(
                    task_id,
                    title="Already Exists",
                    message="All URLs already exist in collection",
                    stats=[
                        {
                            "label": "Skipped (Already Exist)",
                            "value": skipped_count,
                            "variant": "warning",
                        }
                    ],
                )
                return

            # Stage 1: Scrape
            self.progress.advance_to_stage(task_id, 0)
            self.progress.update_stage(task_id, 0, total=len(new_urls))

            def on_scrape_progress(idx, total, url):
                self.progress.update_stage(task_id, 0, current=idx, current_item=url)
                self.progress.update_message(task_id, f"Crawling {idx}/{total}...")

            scraped_docs, processed_urls, failed = await website_scraper.scrape_urls(
                new_urls, collection_name, on_progress=on_scrape_progress
            )

            # Save raw documents to MongoDB
            self.repo.insert_documents(collection_name, scraped_docs)

            # Stage 2: Chunk
            self.progress.advance_to_stage(task_id, 1)
            self.progress.update_stage(task_id, 1, total=len(scraped_docs))

            chunks, chunk_ids = chunk_documents(
                scraped_docs,
                chunk_size=collection_config.get("chunk_size", 1000),
                chunk_overlap=collection_config.get("chunk_overlap", 100),
            )

            # Stage 3: Embed and store
            self.progress.advance_to_stage(task_id, 2)
            self.progress.update_stage(task_id, 2, total=len(chunks))

            embedding_config = get_embedding_config(
                collection_config["dense_embedding_model"]
            )

            await self._store_chunks_with_progress(
                task_id, 2, collection_name, chunks, chunk_ids, embedding_config
            )

            # Complete
            stats = [
                {
                    "label": "Websites Processed",
                    "value": len(processed_urls),
                    "variant": "success",
                },
                {"label": "Chunks Created", "value": len(chunks), "variant": "info"},
            ]
            if skipped_count:
                stats.append(
                    {
                        "label": "Skipped (Already Exist)",
                        "value": skipped_count,
                        "variant": "warning",
                    }
                )
            if failed:
                stats.append(
                    {"label": "Failed", "value": len(failed), "variant": "danger"}
                )

            self.progress.complete(
                task_id,
                title="Upload Complete!",
                message=f"Successfully processed {len(processed_urls)} websites",
                stats=stats,
                failed=[f["url"] for f in failed],
            )

        except Exception as e:
            logger.error(f"Website upload failed: {e}", exc_info=True)
            self.progress.fail(task_id, "Processing Failed", str(e))

    # ── File ingestion ────────────────────────────────────

    def start_file_upload(
        self, collection_name: str, file_data_list: list[dict]
    ) -> str:
        """Start a background file upload task. Returns the task ID."""

        config = self.get_collection_config(collection_name)

        task_id = str(uuid4())
        self.progress.create_task(
            task_id=task_id,
            title="Starting File Upload",
            message=f"Preparing to process {len(file_data_list)} files...",
            stages=[
                {
                    "label": "Parsing Files",
                    "total": len(file_data_list),
                    "unit": "files",
                },
                {
                    "label": "Chunking Documents",
                    "total": len(file_data_list),
                    "unit": "files",
                },
                {"label": "Creating Embeddings", "unit": "chunks"},
            ],
        )

        asyncio.create_task(
            self._process_file_upload(task_id, collection_name, file_data_list, config)
        )

        return task_id

    async def _process_file_upload(
        self,
        task_id: str,
        collection_name: str,
        file_data_list: list[dict],
        collection_config: dict,
    ) -> None:
        """Background task: parse → chunk → embed → store."""
        try:
            # Stage 1: Parse files
            self.progress.advance_to_stage(task_id, 0)
            parsed_docs = []
            parse_failed = []

            for idx, file_data in enumerate(file_data_list, 1):
                filename = file_data["filename"]
                self.progress.update_stage(
                    task_id, 0, current=idx, current_item=filename
                )
                self.progress.update_message(task_id, f"Parsing {filename}...")

                try:
                    doc = file_parser.parse_file(
                        filename=filename,
                        content=file_data["content"],
                        collection_name=collection_name,
                    )
                    parsed_docs.append(doc)

                    # Save to MongoDB
                    self.repo.insert_documents(collection_name, [doc])

                except Exception as e:
                    logger.error(f"Error parsing {filename}: {e}")
                    parse_failed.append(filename)

                await asyncio.sleep(0.1)

            if not parsed_docs:
                self.progress.fail(
                    task_id, "Parsing Failed", "No files were parsed successfully"
                )
                return

            # Stage 2: Chunk
            self.progress.advance_to_stage(task_id, 1)
            self.progress.update_stage(task_id, 1, total=len(parsed_docs))

            chunks, chunk_ids = chunk_documents(
                parsed_docs,
                chunk_size=collection_config.get("chunk_size", 1000),
                chunk_overlap=collection_config.get("chunk_overlap", 100),
            )

            # Stage 3: Embed and store
            self.progress.advance_to_stage(task_id, 2)
            self.progress.update_stage(task_id, 2, total=len(chunks))

            embedding_config = get_embedding_config(
                collection_config["dense_embedding_model"]
            )

            await self._store_chunks_with_progress(
                task_id, 2, collection_name, chunks, chunk_ids, embedding_config
            )

            # Complete
            stats = [
                {
                    "label": "Files Processed",
                    "value": len(parsed_docs),
                    "variant": "success",
                },
                {"label": "Chunks Created", "value": len(chunks), "variant": "info"},
            ]
            if parse_failed:
                stats.append(
                    {"label": "Failed", "value": len(parse_failed), "variant": "danger"}
                )

            self.progress.complete(
                task_id,
                title="Upload Complete!",
                message=f"Successfully processed {len(parsed_docs)} files",
                stats=stats,
                failed=parse_failed,
            )

        except Exception as e:
            logger.error(f"File upload failed: {e}", exc_info=True)
            self.progress.fail(task_id, "Processing Failed", str(e))

    # ── Reindex ───────────────────────────────────────────

    async def reindex_urls(self, collection_name: str, urls: list[str]) -> dict:
        """Delete and re-ingest URLs."""

        config = self.get_collection_config(collection_name)

        # Delete from both stores
        qdrant_ops.delete_documents_by_urls(self.repo.qdrant, collection_name, urls)
        self.repo.delete_documents_by_urls(collection_name, urls)

        # Re-scrape
        scraped_docs, processed_urls, failed = await website_scraper.scrape_urls(
            urls, collection_name
        )
        self.repo.insert_documents(collection_name, scraped_docs)

        # Chunk and embed
        chunks, chunk_ids = chunk_documents(
            scraped_docs,
            chunk_size=config.get("chunk_size", 1000),
            chunk_overlap=config.get("chunk_overlap", 100),
        )

        embedding_cfg = get_embedding_config(config["dense_embedding_model"])
        qdrant_ops.store_documents(
            self.repo.qdrant, collection_name, chunks, chunk_ids, embedding_cfg
        )

        return {
            "processed_urls": processed_urls,
            "chunks_created": len(chunks),
            "failed": [f["url"] for f in failed],
        }

    # ── Watch / Change detection ──────────────────────────

    async def watch_urls(self, collection_name: str) -> dict:
        """Check if website contents have changed since last scrape."""

        website_docs = self.repo.get_documents_by_source_category(
            collection_name, "website"
        )

        if not website_docs:
            return {
                "total_urls": 0,
                "changed_urls": [],
                "unchanged_urls": [],
                "changed_count": 0,
                "unchanged_count": 0,
            }

        urls = [doc["url"] for doc in website_docs]
        old_hashes = {doc["url"]: doc.get("hash") for doc in website_docs}

        # Scrape current content
        scraped_docs, _, _ = await website_scraper.scrape_urls(urls, collection_name)
        new_hashes = {doc["url"]: doc["hash"] for doc in scraped_docs}

        changed = [
            u for u in urls if u in new_hashes and old_hashes.get(u) != new_hashes[u]
        ]
        unchanged = [
            u for u in urls if u in new_hashes and old_hashes.get(u) == new_hashes[u]
        ]

        return {
            "total_urls": len(urls),
            "changed_urls": changed,
            "unchanged_urls": unchanged,
            "changed_count": len(changed),
            "unchanged_count": len(unchanged),
        }

    # ── Upload progress ───────────────────────────────────

    def get_upload_progress(self, task_id: str) -> dict | None:
        """Get progress for a background upload task."""
        task = self.progress.get_task(task_id)
        if not task:
            return None
        return task.model_dump(exclude={"task_id", "created_at"})

    # ── File serving ──────────────────────────────────────

    def get_file_path(self, collection_name: str, filename: str) -> str | None:
        """Get the path to a stored file, or None if it doesn't exist."""
        path = os.path.join(file_parser.FILES_BASE_DIR, collection_name, filename)
        return path if os.path.exists(path) else None

    def get_file_mime_type(self, filename: str) -> str:
        """Guess MIME type for a filename."""
        mime_type, _ = mimetypes.guess_type(filename)
        if mime_type:
            return mime_type
        ext = filename.lower().rsplit(".", 1)[-1] if "." in filename else ""
        return {
            "pdf": "application/pdf",
            "doc": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "txt": "text/plain",
        }.get(ext, "application/octet-stream")

    # ── Shared helpers ────────────────────────────────────

    async def _store_chunks_with_progress(
        self,
        task_id: str,
        stage_index: int,
        collection_name: str,
        chunks: list,
        chunk_ids: list[str],
        embedding_config,
        batch_size: int = 10,
    ) -> None:
        """Store chunks in Qdrant with progress updates."""
        from langchain_qdrant import QdrantVectorStore, RetrievalMode

        vector_store = QdrantVectorStore(
            client=self.repo.qdrant,
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

            current = min(i + batch_size, len(chunks))
            self.progress.update_stage(task_id, stage_index, current=current)
            self.progress.update_message(
                task_id, f"Embedding {current}/{len(chunks)} chunks..."
            )

            await asyncio.sleep(0.1)
