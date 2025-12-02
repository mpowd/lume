from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
import logging
from datetime import datetime
from uuid import uuid4
import json
import asyncio


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/links")
async def get_links(
    base_url: str = Query(..., description="URL to crawl"),
    include_external_domains: bool = Query(
        False, description="Include external domains"
    ),
    collection_name: Optional[str] = Query(
        None, description="Collection name to check for existing URLs"
    ),
):
    """
    Get links from a website and mark which ones already exist in the collection.

    Returns links with an 'exists_in_collection' flag for URLs that are already in MongoDB.
    """
    logger.info(
        f"Get links request: {base_url}, collection={collection_name}, include_external={include_external_domains}"
    )

    from crawl4ai import AsyncWebCrawler, CrawlerRunConfig, LinkPreviewConfig

    # Configure link preview with basic options
    link_preview_config = LinkPreviewConfig(
        include_internal=True,
        include_external=include_external_domains,
        verbose=True,
    )

    # Configure crawler with link preview and scoring
    config = CrawlerRunConfig(
        link_preview_config=link_preview_config,
        score_links=True,
        only_text=True,
        verbose=True,
        check_robots_txt=True,
    )

    try:
        async with AsyncWebCrawler() as crawler:
            result = await crawler.arun(base_url, config=config)

            if result.success:
                internal_links = result.links.get("internal", [])
                external_links = (
                    result.links.get("external", []) if include_external_domains else []
                )

                all_links = internal_links + external_links

                # Get existing URLs from MongoDB if collection_name is provided
                existing_urls = set()
                if collection_name:
                    try:
                        from backend.db.mongodb import MongoDBClient

                        mongodb_client = MongoDBClient.get_instance()
                        logger.info(
                            f"Checking for existing URLs in collection: {collection_name}"
                        )
                        existing_docs = mongodb_client.get_docs(
                            filter={},
                            collection_name=collection_name,
                            projection={"url": 1},
                        )

                        # Create a set of existing URLs for fast lookup
                        existing_urls = {
                            doc.get("url") for doc in existing_docs if doc.get("url")
                        }
                        logger.info(
                            f"Found {len(existing_urls)} existing URLs in collection"
                        )
                    except Exception as e:
                        logger.warning(f"Could not check existing URLs: {str(e)}")
                        # Continue without duplicate checking if there's an error

                # Transform links to match frontend expectations
                transformed_links = []
                for link in all_links:
                    link_url = link.get("href", "")

                    # Get scores (normalized properly by Crawl4AI)
                    intrinsic_score = link.get("intrinsic_score", 0)  # 0-10 scale
                    contextual_score = link.get("contextual_score", 0)  # 0-1 scale
                    total_score = link.get("total_score", 0)  # Combined score

                    # Normalize intrinsic score to 0-1 range for consistency
                    normalized_intrinsic = (
                        intrinsic_score / 10.0 if intrinsic_score else 0
                    )

                    # Use total_score if available, otherwise use normalized intrinsic
                    final_score = total_score if total_score else normalized_intrinsic

                    # Check if URL exists in collection
                    exists_in_collection = link_url in existing_urls

                    transformed_links.append(
                        {
                            "href": link_url,
                            "url": link_url,
                            "text": link.get("text", ""),
                            "title": link.get("title", "Untitled"),
                            "score": final_score,  # 0-1 normalized score
                            "total_score": final_score,
                            "base_domain": link.get("base_domain", ""),
                            "exists_in_collection": exists_in_collection,  # Flag for existing URLs
                        }
                    )

                # Sort: new URLs first (by score), then existing URLs at the bottom
                transformed_links.sort(
                    key=lambda x: (x["exists_in_collection"], -x["score"])
                )

                new_count = len(
                    [l for l in transformed_links if not l["exists_in_collection"]]
                )
                existing_count = len(
                    [l for l in transformed_links if l["exists_in_collection"]]
                )

                logger.info(
                    f"Found {len(internal_links)} internal links, "
                    f"{len(external_links)} external links. "
                    f"Returning {len(transformed_links)} total "
                    f"({new_count} new, {existing_count} already exist)."
                )

                return transformed_links

            else:
                logger.error(f"Crawl failed: {result.error_message}")
                raise HTTPException(status_code=500, detail=result.error_message)

    except Exception as e:
        logger.error(f"Error crawling: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


class UploadDocumentsRequest(BaseModel):
    collection_name: str
    urls: List[str]


@router.get("/upload-documents-stream")
async def upload_documents_stream(
    collection_name: str,
    urls: str,  # JSON string of URLs
):
    """
    Upload selected URLs to the knowledge base with real-time progress streaming.
    Shows two-stage progress: crawling/chunking and embedding.

    Skips URLs that already exist in the MongoDB collection.
    """

    async def generate_progress():
        try:
            # Parse URLs from JSON string
            import json

            url_list = json.loads(urls)

            logger.info(
                f"Starting streaming upload for {len(url_list)} URLs to collection '{collection_name}'"
            )

            from backend.db.mongodb import MongoDBClient

            # Check for existing URLs before processing
            mongodb_client = MongoDBClient.get_instance()
            existing_docs = mongodb_client.get_docs(
                filter={}, collection_name=collection_name, projection={"url": 1}
            )
            existing_urls = {doc.get("url") for doc in existing_docs if doc.get("url")}

            # Filter out URLs that already exist
            new_urls = [url for url in url_list if url not in existing_urls]
            skipped_urls = [url for url in url_list if url in existing_urls]

            if skipped_urls:
                logger.info(
                    f"Skipping {len(skipped_urls)} URLs that already exist in the collection"
                )
                yield f"data: {json.dumps({'status': 'info', 'message': f'Skipping {len(skipped_urls)} URLs that already exist', 'current': 0, 'total_urls': len(url_list), 'processed': [], 'failed': [], 'skipped': skipped_urls})}\n\n"
                await asyncio.sleep(0.5)

            if not new_urls:
                logger.info("All URLs already exist in collection, nothing to upload")
                yield f"data: {json.dumps({'status': 'complete', 'message': 'All URLs already exist in collection', 'current': len(url_list), 'total_urls': len(url_list), 'processed': [], 'failed': [], 'skipped': skipped_urls})}\n\n"
                return

            # Send initial status
            yield f"data: {json.dumps({'status': 'starting', 'message': f'Processing {len(new_urls)} new URLs...', 'current': 0, 'total_urls': len(new_urls), 'processed': [], 'failed': [], 'skipped': skipped_urls})}\n\n"
            await asyncio.sleep(0.1)

            from crawl4ai import AsyncWebCrawler, CrawlerRunConfig
            from crawl4ai.content_filter_strategy import PruningContentFilter
            from crawl4ai.markdown_generation_strategy import DefaultMarkdownGenerator
            from langchain_qdrant import (
                QdrantVectorStore,
                RetrievalMode,
                FastEmbedSparse,
            )
            from langchain_text_splitters import (
                MarkdownHeaderTextSplitter,
                RecursiveCharacterTextSplitter,
                CharacterTextSplitter,
            )
            from qdrant_client import QdrantClient

            # Initialize clients
            qdrant_client = QdrantClient(url="http://qdrant:6333")

            # Get collection configuration
            collection_info = mongodb_client.get_docs(
                filter={"collection_name": collection_name},
                collection_name="configurations",
            )

            if not collection_info:
                yield f"data: {json.dumps({'status': 'error', 'message': f'Collection configuration not found for {collection_name}', 'current': 0, 'total_urls': len(new_urls), 'processed': [], 'failed': [], 'skipped': skipped_urls})}\n\n"
                return

            config_doc = collection_info[0]
            chunk_size = config_doc.get("chunk_size", 1000)
            chunk_overlap = config_doc.get("chunk_overlap", 100)
            embedding_model = config_doc.get("dense_embedding_model")

            # Import embedding utilities
            from langchain_ollama import OllamaEmbeddings
            from langchain_openai import OpenAIEmbeddings

            # Initialize embeddings based on model
            if embedding_model == "jina/jina-embeddings-v2-base-de":
                logger.info(
                    f"Use OpenAI Embedding Model '{embedding_model}' for indexing website"
                )
                dense_embeddings = OllamaEmbeddings(
                    model="jina/jina-embeddings-v2-base-de",
                    base_url="http://host.docker.internal:11434",
                )
                sparse_embeddings = FastEmbedSparse(model_name="Qdrant/bm25")
            elif embedding_model == "text-embedding-3-small":
                logger.info(
                    f"Use OpenAI Embedding Model '{embedding_model}' for indexing website"
                )
                dense_embeddings = OpenAIEmbeddings(model=embedding_model)
                sparse_embeddings = FastEmbedSparse(model_name="Qdrant/bm25")
            else:
                yield f"data: {json.dumps({'status': 'error', 'message': f'Unsupported embedding model: {embedding_model}', 'current': 0, 'total_urls': len(new_urls), 'processed': [], 'failed': [], 'skipped': skipped_urls})}\n\n"
                return

            # Configure crawler
            # prune_filter = PruningContentFilter(
            #     threshold=0.45,
            #     threshold_type="dynamic",
            #     min_word_threshold=30,
            # )
            prune_filter = PruningContentFilter(
                threshold=0.5
                # threshold=0.5, threshold_type="dynamic", min_word_threshold=30
            )

            md_generator = DefaultMarkdownGenerator(
                content_filter=prune_filter, options={"ignore_links": True}
            )

            # md_generator = DefaultMarkdownGenerator()

            crawler_config = CrawlerRunConfig(
                only_text=True,
                verbose=True,
                markdown_generator=md_generator,
                excluded_tags=["nav", "footer", "header"],
            )

            # Phase 1: Crawl and chunk documents
            crawled_documents = []
            failed_urls = []
            processed_urls = []

            yield f"data: {json.dumps({'status': 'crawling', 'message': 'Starting to crawl URLs...', 'current': 0, 'chunked_urls': 0, 'total_urls': len(new_urls), 'processed': [], 'failed': [], 'skipped': skipped_urls})}\n\n"

            async with AsyncWebCrawler() as crawler:
                for idx, url in enumerate(new_urls, 1):
                    try:
                        logger.info(f"[{idx}/{len(new_urls)}] Crawling: {url}")
                        yield f"data: {json.dumps({'status': 'crawling', 'message': f'Crawling URL {idx}/{len(new_urls)}...', 'current': idx, 'chunked_urls': idx, 'total_urls': len(new_urls), 'current_url': url, 'processed': processed_urls.copy(), 'failed': failed_urls.copy(), 'skipped': skipped_urls})}\n\n"

                        result = await crawler.arun(url, config=crawler_config)

                        if result.success and result.markdown:
                            doc = {
                                "url": url,
                                "markdown": result.markdown.fit_markdown,
                                "title": result.metadata.get("title", "Untitled"),
                                "description": result.metadata.get("description", ""),
                                "timestamp": datetime.now().isoformat(),
                                "metadata": {
                                    "status_code": result.status_code,
                                    "content_type": result.metadata.get(
                                        "content_type", "text/html"
                                    ),
                                },
                            }

                            mongodb_client.persist_docs(
                                docs=[doc], collection_name=collection_name
                            )

                            crawled_documents.append(
                                {
                                    "url": url,
                                    "markdown": result.markdown.fit_markdown,
                                    "title": doc["title"],
                                }
                            )
                            processed_urls.append(url)

                            logger.info(f"✓ Successfully crawled: {url}")

                        else:
                            error_msg = getattr(
                                result, "error_message", "Unknown error"
                            )
                            logger.error(f"✗ Failed to crawl {url}: {error_msg}")
                            failed_urls.append({"url": url, "error": error_msg})
                            yield f"data: {json.dumps({'status': 'crawling', 'message': f'Failed to crawl {url}', 'current': idx, 'chunked_urls': idx, 'total_urls': len(new_urls), 'processed': processed_urls.copy(), 'failed': failed_urls.copy(), 'skipped': skipped_urls})}\n\n"

                    except Exception as e:
                        logger.error(f"✗ Error crawling {url}: {str(e)}")
                        failed_urls.append({"url": url, "error": str(e)})
                        yield f"data: {json.dumps({'status': 'crawling', 'message': f'Error crawling {url}', 'current': idx, 'chunked_urls': idx, 'total_urls': len(new_urls), 'processed': processed_urls.copy(), 'failed': failed_urls.copy(), 'skipped': skipped_urls})}\n\n"

            if not crawled_documents:
                yield f"data: {json.dumps({'status': 'error', 'message': 'No documents were successfully crawled', 'current': 0, 'chunked_urls': 0, 'total_urls': len(new_urls), 'processed': [], 'failed': failed_urls, 'skipped': skipped_urls})}\n\n"
                return

            # Phase 2: Chunk documents
            # yield f"data: {json.dumps({'status': 'chunking', 'message': f'Chunking {len(crawled_documents)} documents...', 'current': 0, 'total_urls': len(new_urls), 'processed': processed_urls.copy(), 'failed': failed_urls.copy(), 'skipped': skipped_urls})}\n\n"
            await asyncio.sleep(0.1)

            headers_to_split_on = [
                ("#", "Header 1"),
                ("##", "Header 2"),
                ("###", "Header 3"),
            ]
            markdown_splitter = MarkdownHeaderTextSplitter(
                headers_to_split_on=headers_to_split_on, strip_headers=True
            )

            # text_splitter = RecursiveCharacterTextSplitter(
            #     chunk_size=chunk_size,
            #     chunk_overlap=chunk_overlap,
            #     separators=["\n\n", "\n", ".", ";", ",", " "],
            # )

            text_splitter = CharacterTextSplitter.from_tiktoken_encoder(
                encoding_name="cl100k_base",
                chunk_size=chunk_size,
                chunk_overlap=chunk_overlap,
            )

            all_chunks = []
            all_uuids = []

            for doc_idx, doc_data in enumerate(crawled_documents, 1):
                try:
                    yield f"data: {json.dumps({'status': 'chunking', 'message': f'Chunking document {doc_idx}/{len(crawled_documents)}...', 'current': doc_idx, 'chunked_urls': doc_idx, 'total_urls': len(crawled_documents), 'processed': processed_urls.copy(), 'failed': failed_urls.copy(), 'skipped': skipped_urls})}\n\n"

                    md_header_splits = markdown_splitter.split_text(
                        doc_data["markdown"]
                    )
                    chunks = text_splitter.split_documents(md_header_splits)

                    for chunk in chunks:
                        if not chunk.metadata:
                            chunk.metadata = {}

                        chunk.metadata["source_url"] = doc_data["url"]
                        chunk.metadata["title"] = doc_data["title"]

                        chunk_with_metadata = ""
                        for metadata in chunk.metadata:
                            match metadata:
                                case "title":
                                    chunk_with_metadata = (
                                        f"# {chunk.metadata[metadata]}\n\n"
                                        + chunk_with_metadata
                                    )
                                case "Header 1":
                                    chunk_with_metadata = (
                                        chunk_with_metadata
                                        + f"## {chunk.metadata[metadata]}\n\n"
                                    )
                                case "Header 2":
                                    chunk_with_metadata = (
                                        chunk_with_metadata
                                        + f"### {chunk.metadata[metadata]}\n\n"
                                    )
                                case "Header 3":
                                    chunk_with_metadata = (
                                        chunk_with_metadata
                                        + f"#### {chunk.metadata[metadata]}\n\n"
                                    )
                                case _:
                                    pass

                        chunk.page_content = chunk_with_metadata + chunk.page_content
                        if idx == 1:
                            logger.info(chunk.page_content)

                        all_chunks.append(chunk)
                        all_uuids.append(str(uuid4()))

                    logger.info(f"Created {len(chunks)} chunks from {doc_data['url']}")

                except Exception as e:
                    logger.error(f"Error chunking document {doc_data['url']}: {str(e)}")

            # Phase 3: Create embeddings
            yield f"data: {json.dumps({'status': 'embedding', 'message': f'Creating embeddings for {len(all_chunks)} chunks...', 'chunked_urls': len(crawled_documents), 'total_urls': len(crawled_documents), 'current': 0, 'embedded_chunks': 0, 'total_chunks': len(all_chunks), 'processed': processed_urls.copy(), 'failed': failed_urls.copy(), 'skipped': skipped_urls})}\n\n"
            await asyncio.sleep(0.1)

            qdrant = QdrantVectorStore(
                client=qdrant_client,
                collection_name=collection_name,
                embedding=dense_embeddings,
                sparse_embedding=sparse_embeddings,
                retrieval_mode=RetrievalMode.HYBRID,
                vector_name="dense",
                sparse_vector_name="sparse",
            )

            # Add documents in batches with progress updates
            batch_size = 1
            for i in range(0, len(all_chunks), batch_size):
                batch_chunks = all_chunks[i : i + batch_size]
                batch_uuids = all_uuids[i : i + batch_size]

                qdrant.add_documents(documents=batch_chunks, ids=batch_uuids)

                current = min(i + batch_size, len(all_chunks))
                yield f"data: {json.dumps({'status': 'embedding', 'message': f'Embedding progress: {current}/{len(all_chunks)} chunks', 'chunked_urls': len(crawled_documents), 'total_urls': len(crawled_documents), 'current': current, 'embedded_chunks': current, 'total_chunks': len(all_chunks), 'processed': processed_urls.copy(), 'failed': failed_urls.copy(), 'skipped': skipped_urls})}\n\n"
                await asyncio.sleep(0.1)

            # Final success message
            yield f"data: {json.dumps({'status': 'complete', 'message': f'Successfully uploaded {len(crawled_documents)} documents ({len(all_chunks)} chunks)', 'chunked_urls': len(crawled_documents), 'total_urls': len(crawled_documents), 'current': len(all_chunks), 'embedded_chunks': current, 'total_chunks': len(all_chunks), 'processed': processed_urls, 'failed': failed_urls, 'skipped': skipped_urls, 'total_chunks': len(all_chunks)})}\n\n"

        except Exception as e:
            logger.error(f"Error in streaming upload: {str(e)}")
            yield f"data: {json.dumps({'status': 'error', 'message': str(e), 'current': 0, 'embedded_chunks': current, 'total_chunks': 0, 'processed': [], 'failed': [], 'skipped': []})}\n\n"

    return StreamingResponse(generate_progress(), media_type="text/event-stream")
