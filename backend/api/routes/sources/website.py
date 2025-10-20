from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List
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
):
    """Get links from a website"""
    logger.info(
        f"Get links request: {base_url}, include_external={include_external_domains}"
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

                # Transform links to match frontend expectations
                transformed_links = []
                for link in all_links:
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

                    transformed_links.append(
                        {
                            "href": link.get("href", ""),
                            "url": link.get("href", ""),
                            "text": link.get("text", ""),
                            "title": link.get("title", "Untitled"),
                            "score": final_score,  # 0-1 normalized score
                            "total_score": final_score,
                            "base_domain": link.get("base_domain", ""),
                        }
                    )

                # Sort by score descending
                transformed_links.sort(key=lambda x: x["score"], reverse=True)

                logger.info(
                    f"Found {len(internal_links)} internal links, "
                    f"{len(external_links)} external links. "
                    f"Returning {len(transformed_links)} total."
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
    """

    async def generate_progress():
        try:
            # Parse URLs from JSON string
            import json

            url_list = json.loads(urls)

            logger.info(
                f"Starting streaming upload for {len(url_list)} URLs to collection '{collection_name}'"
            )

            # Send initial status
            yield f"data: {json.dumps({'status': 'starting', 'message': 'Initializing upload...', 'current': 0, 'total': len(url_list), 'processed': [], 'failed': []})}\n\n"
            await asyncio.sleep(0.1)

            from crawl4ai import AsyncWebCrawler, CrawlerRunConfig
            from crawl4ai.content_filter_strategy import PruningContentFilter
            from crawl4ai.markdown_generation_strategy import DefaultMarkdownGenerator
            from backend.db.mongodb import MongoDBClient
            from langchain_qdrant import (
                QdrantVectorStore,
                RetrievalMode,
                FastEmbedSparse,
            )
            from langchain_text_splitters import (
                MarkdownHeaderTextSplitter,
                RecursiveCharacterTextSplitter,
            )
            from qdrant_client import QdrantClient

            # Initialize clients
            mongodb_client = MongoDBClient.get_instance()
            qdrant_client = QdrantClient(url="http://qdrant:6333")

            # Get collection configuration
            collection_info = mongodb_client.get_docs(
                filter={"collection_name": collection_name},
                collection_name="configurations",
            )

            if not collection_info:
                yield f"data: {json.dumps({'status': 'error', 'message': f'Collection configuration not found for {collection_name}', 'current': 0, 'total': len(url_list), 'processed': [], 'failed': []})}\n\n"
                return

            config_doc = collection_info[0]
            chunk_size = config_doc.get("chunk_size", 1000)
            chunk_overlap = config_doc.get("chunk_overlap", 100)
            embedding_model = config_doc.get("dense_embedding_model")

            # Import embedding utilities
            from langchain_ollama import OllamaEmbeddings

            # Initialize embeddings based on model
            if embedding_model == "jina/jina-embeddings-v2-base-de":
                dense_embeddings = OllamaEmbeddings(
                    model="jina/jina-embeddings-v2-base-de",
                    base_url="http://host.docker.internal:11434",
                )
                sparse_embeddings = FastEmbedSparse(model_name="Qdrant/bm25")
            else:
                yield f"data: {json.dumps({'status': 'error', 'message': f'Unsupported embedding model: {embedding_model}', 'current': 0, 'total': len(url_list), 'processed': [], 'failed': []})}\n\n"
                return

            # Configure crawler
            prune_filter = PruningContentFilter(
                threshold=0.45,
                threshold_type="dynamic",
                min_word_threshold=30,
            )

            md_generator = DefaultMarkdownGenerator(content_filter=prune_filter)

            crawler_config = CrawlerRunConfig(
                only_text=True, verbose=True, markdown_generator=md_generator
            )

            crawled_documents = []
            failed_urls = []
            processed_urls = []

            # STAGE 1: Crawl all URLs
            yield f"data: {json.dumps({'status': 'crawling', 'message': 'Crawling websites...', 'current': 0, 'total': len(url_list), 'processed': processed_urls, 'failed': failed_urls})}\n\n"

            async with AsyncWebCrawler() as crawler:
                for idx, url in enumerate(url_list):
                    try:
                        logger.info(f"Crawling {idx + 1}/{len(url_list)}: {url}")

                        yield f"data: {json.dumps({'status': 'crawling', 'message': f'Scraping page {idx + 1} of {len(url_list)}', 'current': idx, 'total': len(url_list), 'processed': processed_urls, 'failed': failed_urls, 'current_url': url})}\n\n"

                        result = await crawler.arun(url, config=crawler_config)

                        if result.success and result.markdown:
                            doc = {
                                "url": url,
                                "markdown": result.markdown.fit_markdown,
                                "raw_markdown": result.markdown.raw_markdown,
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
                                docs=[doc], collection_name="temp"
                            )
                            mongodb_client.persist_docs(
                                docs=[doc], collection_name=collection_name
                            )

                            crawled_documents.append(
                                {
                                    "url": url,
                                    "markdown": result.markdown.raw_markdown,
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

                        await asyncio.sleep(0.1)

                    except Exception as e:
                        logger.error(f"✗ Error crawling {url}: {str(e)}")
                        failed_urls.append({"url": url, "error": str(e)})

            if not crawled_documents:
                yield f"data: {json.dumps({'status': 'error', 'message': 'No documents were successfully crawled', 'current': 0, 'total': len(url_list), 'processed': processed_urls, 'failed': failed_urls})}\n\n"
                return

            # STAGE 2: Chunk the documents
            yield f"data: {json.dumps({'status': 'chunking', 'message': f'Chunking {len(crawled_documents)} documents...', 'current': len(processed_urls), 'total': len(url_list), 'processed': processed_urls, 'failed': failed_urls})}\n\n"

            logger.info(f"Chunking {len(crawled_documents)} documents...")

            headers_to_split_on = [
                ("#", "Header 1"),
                ("##", "Header 2"),
            ]
            markdown_splitter = MarkdownHeaderTextSplitter(
                headers_to_split_on=headers_to_split_on, strip_headers=True
            )

            text_splitter = RecursiveCharacterTextSplitter(
                chunk_size=chunk_size,
                chunk_overlap=chunk_overlap,
                separators=["\n\n", "\n", ".", ";", ",", " "],
            )

            all_chunks = []
            all_uuids = []

            for doc_data in crawled_documents:
                try:
                    md_header_splits = markdown_splitter.split_text(
                        doc_data["markdown"]
                    )
                    chunks = text_splitter.split_documents(md_header_splits)

                    for chunk in chunks:
                        if not chunk.metadata:
                            chunk.metadata = {}

                        chunk.metadata["source_url"] = doc_data["url"]
                        chunk.metadata["title"] = doc_data["title"]

                        all_chunks.append(chunk)
                        all_uuids.append(str(uuid4()))

                    logger.info(f"Created {len(chunks)} chunks from {doc_data['url']}")

                except Exception as e:
                    logger.error(f"Error chunking document {doc_data['url']}: {str(e)}")

            if not all_chunks:
                yield f"data: {json.dumps({'status': 'error', 'message': 'No chunks were created from the documents', 'current': len(processed_urls), 'total': len(url_list), 'processed': processed_urls, 'failed': failed_urls})}\n\n"
                return

            # STAGE 3: Create embeddings with progress updates
            total_chunks = len(all_chunks)
            batch_size = 50  # Process in batches for progress updates

            yield f"data: {json.dumps({'status': 'embedding', 'message': f'Creating embeddings for {total_chunks} chunks...', 'current': len(processed_urls), 'total': len(url_list), 'processed': processed_urls, 'failed': failed_urls, 'total_chunks': total_chunks, 'embedded_chunks': 0})}\n\n"

            logger.info(f"Creating embeddings for {total_chunks} chunks...")

            qdrant = QdrantVectorStore(
                client=qdrant_client,
                collection_name=collection_name,
                embedding=dense_embeddings,
                sparse_embedding=sparse_embeddings,
                retrieval_mode=RetrievalMode.HYBRID,
                vector_name="dense",
                sparse_vector_name="sparse",
            )

            # Process chunks in batches to show progress
            for i in range(0, len(all_chunks), batch_size):
                batch_chunks = all_chunks[i : i + batch_size]
                batch_uuids = all_uuids[i : i + batch_size]

                qdrant.add_documents(documents=batch_chunks, ids=batch_uuids)

                embedded_count = min(i + batch_size, total_chunks)

                yield f"data: {json.dumps({'status': 'embedding', 'message': f'Embedding chunks ({embedded_count}/{total_chunks})...', 'current': len(processed_urls), 'total': len(url_list), 'processed': processed_urls, 'failed': failed_urls, 'total_chunks': total_chunks, 'embedded_chunks': embedded_count})}\n\n"

                await asyncio.sleep(0.1)

            logger.info(f"✓ Successfully uploaded {total_chunks} chunks to Qdrant")

            # Send completion status
            yield f"data: {json.dumps({'status': 'complete', 'message': f'Successfully processed {len(crawled_documents)} documents!', 'current': len(processed_urls), 'total': len(url_list), 'total_processed': len(crawled_documents), 'processed': processed_urls, 'failed': failed_urls, 'total_chunks': total_chunks, 'embedded_chunks': total_chunks})}\n\n"

        except Exception as e:
            logger.error(f"Error in streaming upload: {str(e)}")
            yield f"data: {json.dumps({'status': 'error', 'message': f'Error: {str(e)}', 'current': 0, 'total': 0, 'processed': [], 'failed': []})}\n\n"

    return StreamingResponse(
        generate_progress(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# @router.post("/upload-documents")
# async def upload_documents(request: UploadDocumentsRequest):
#     """
#     Upload selected URLs to the knowledge base (non-streaming version).

#     This endpoint:
#     1. Crawls each URL with Crawl4AI to extract markdown content
#     2. Stores the raw markdown in MongoDB
#     3. Chunks the content
#     4. Creates embeddings
#     5. Stores vectors in Qdrant
#     """
#     try:
#         logger.info(
#             f"Processing {len(request.urls)} URLs for collection '{request.collection_name}'"
#         )

#         from crawl4ai import AsyncWebCrawler, CrawlerRunConfig
#         from backend.db.mongodb import MongoDBClient
#         from langchain_qdrant import QdrantVectorStore, RetrievalMode, FastEmbedSparse
#         from langchain_text_splitters import (
#             MarkdownHeaderTextSplitter,
#             RecursiveCharacterTextSplitter,
#         )
#         from langchain_core.documents import Document
#         from qdrant_client import QdrantClient

#         # Initialize clients
#         mongodb_client = MongoDBClient.get_instance()
#         qdrant_client = QdrantClient(url="http://qdrant:6333")

#         # Get collection configuration
#         collection_info = mongodb_client.get_docs(
#             filter={"collection_name": request.collection_name},
#             collection_name="configurations",
#         )

#         if not collection_info:
#             raise HTTPException(
#                 status_code=404,
#                 detail=f"Collection configuration not found for '{request.collection_name}'",
#             )

#         config_doc = collection_info[0]
#         chunk_size = config_doc.get("chunk_size", 1000)
#         chunk_overlap = config_doc.get("chunk_overlap", 100)
#         embedding_model = config_doc.get("dense_embedding_model")

#         # Import embedding utilities
#         from langchain_ollama import OllamaEmbeddings

#         # Initialize embeddings based on model
#         if embedding_model == "jina/jina-embeddings-v2-base-de":
#             dense_embeddings = OllamaEmbeddings(
#                 model="jina/jina-embeddings-v2-base-de",
#                 base_url="http://host.docker.internal:11434",
#             )
#             sparse_embeddings = FastEmbedSparse(model_name="Qdrant/bm25")
#         else:
#             raise HTTPException(
#                 status_code=400,
#                 detail=f"Unsupported embedding model: {embedding_model}",
#             )

#         # Configure crawler
#         crawler_config = CrawlerRunConfig(only_text=True, verbose=True)

#         crawled_documents = []
#         failed_urls = []

#         # Step 1: Crawl all URLs and store in MongoDB
#         logger.info("Step 1: Crawling URLs...")
#         async with AsyncWebCrawler() as crawler:
#             for url in request.urls:
#                 try:
#                     logger.info(f"Crawling: {url}")
#                     result = await crawler.arun(url, config=crawler_config)

#                     if result.success and result.markdown:
#                         # Create document for MongoDB
#                         doc = {
#                             "url": url,
#                             "markdown": result.markdown.raw_markdown,
#                             "title": result.metadata.get("title", "Untitled"),
#                             "description": result.metadata.get("description", ""),
#                             "timestamp": datetime.now().isoformat(),
#                             "metadata": {
#                                 "status_code": result.status_code,
#                                 "content_type": result.metadata.get(
#                                     "content_type", "text/html"
#                                 ),
#                             },
#                         }

#                         # Store in MongoDB temp collection
#                         mongodb_client.persist_docs(docs=[doc], collection_name="temp")

#                         # Also store in the target collection
#                         mongodb_client.persist_docs(
#                             docs=[doc], collection_name=request.collection_name
#                         )

#                         crawled_documents.append(
#                             {
#                                 "url": url,
#                                 "markdown": result.markdow2.raw_markdown,
#                                 "title": doc["title"],
#                             }
#                         )

#                         logger.info(f"✓ Successfully crawled: {url}")
#                     else:
#                         error_msg = getattr(result, "error_message", "Unknown error")
#                         logger.error(f"✗ Failed to crawl {url}: {error_msg}")
#                         failed_urls.append({"url": url, "error": error_msg})

#                 except Exception as e:
#                     logger.error(f"✗ Error crawling {url}: {str(e)}")
#                     failed_urls.append({"url": url, "error": str(e)})

#         if not crawled_documents:
#             return {
#                 "success": False,
#                 "message": "No documents were successfully crawled",
#                 "uploaded_count": 0,
#                 "failed_count": len(failed_urls),
#                 "failed_urls": failed_urls,
#             }

#         # Step 2: Chunk the documents
#         logger.info(f"Step 2: Chunking {len(crawled_documents)} documents...")

#         headers_to_split_on = [
#             ("#", "Header 1"),
#             ("##", "Header 2"),
#         ]
#         markdown_splitter = MarkdownHeaderTextSplitter(
#             headers_to_split_on=headers_to_split_on, strip_headers=True
#         )

#         text_splitter = RecursiveCharacterTextSplitter(
#             chunk_size=chunk_size,
#             chunk_overlap=chunk_overlap,
#             separators=["\n\n", "\n", ".", ";", ",", " "],
#         )

#         all_chunks = []
#         all_uuids = []

#         for doc_data in crawled_documents:
#             try:
#                 # Split by markdown headers
#                 md_header_splits = markdown_splitter.split_text(doc_data["markdown"])

#                 # Further split into chunks
#                 chunks = text_splitter.split_documents(md_header_splits)

#                 # Add metadata to each chunk
#                 for chunk in chunks:
#                     if not chunk.metadata:
#                         chunk.metadata = {}

#                     chunk.metadata["source_url"] = doc_data["url"]
#                     chunk.metadata["title"] = doc_data["title"]

#                     all_chunks.append(chunk)
#                     all_uuids.append(str(uuid4()))

#                 logger.info(f"Created {len(chunks)} chunks from {doc_data['url']}")

#             except Exception as e:
#                 logger.error(f"Error chunking document {doc_data['url']}: {str(e)}")

#         if not all_chunks:
#             raise HTTPException(
#                 status_code=500, detail="No chunks were created from the documents"
#             )

#         # Step 3: Create embeddings and store in Qdrant
#         logger.info(f"Step 3: Creating embeddings for {len(all_chunks)} chunks...")

#         qdrant = QdrantVectorStore(
#             client=qdrant_client,
#             collection_name=request.collection_name,
#             embedding=dense_embeddings,
#             sparse_embedding=sparse_embeddings,
#             retrieval_mode=RetrievalMode.HYBRID,
#             vector_name="dense",
#             sparse_vector_name="sparse",
#         )

#         qdrant.add_documents(documents=all_chunks, ids=all_uuids)

#         logger.info(f"✓ Successfully uploaded {len(all_chunks)} chunks to Qdrant")

#         return {
#             "success": True,
#             "uploaded_count": len(crawled_documents),
#             "failed_count": len(failed_urls),
#             "total_chunks": len(all_chunks),
#             "urls": [doc["url"] for doc in crawled_documents],
#             "failed_urls": failed_urls,
#         }

#     except HTTPException:
#         raise
#     except Exception as e:
#         logger.error(f"Error uploading documents: {str(e)}")
#         raise HTTPException(status_code=500, detail=str(e))
