from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import logging
from datetime import datetime
from uuid import uuid4
import asyncio

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

# In-memory storage for website upload tasks
website_upload_tasks: Dict[str, Dict[str, Any]] = {}


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

                # Transform links to match frontend expectations
                transformed_links = []
                for link in all_links:
                    link_url = link.get("href", "")

                    # Get scores
                    intrinsic_score = link.get("intrinsic_score", 0)
                    contextual_score = link.get("contextual_score", 0)
                    total_score = link.get("total_score", 0)

                    normalized_intrinsic = (
                        intrinsic_score / 10.0 if intrinsic_score else 0
                    )
                    final_score = total_score if total_score else normalized_intrinsic

                    # Check if URL exists in collection
                    exists_in_collection = link_url in existing_urls

                    transformed_links.append(
                        {
                            "href": link_url,
                            "url": link_url,
                            "text": link.get("text", ""),
                            "title": link.get("title", "Untitled"),
                            "score": final_score,
                            "total_score": final_score,
                            "base_domain": link.get("base_domain", ""),
                            "exists_in_collection": exists_in_collection,
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


async def process_websites_background(
    task_id: str, collection_name: str, urls: List[str]
):
    """
    Background task to process website URLs
    """
    try:
        from backend.db.mongodb import MongoDBClient
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
            CharacterTextSplitter,
        )
        from qdrant_client import QdrantClient

        # Check for existing URLs
        mongodb_client = MongoDBClient.get_instance()
        existing_docs = mongodb_client.get_docs(
            filter={}, collection_name=collection_name, projection={"url": 1}
        )
        existing_urls = {doc.get("url") for doc in existing_docs if doc.get("url")}

        # Filter out existing URLs
        new_urls = [url for url in urls if url not in existing_urls]
        skipped_urls = [url for url in urls if url in existing_urls]

        if skipped_urls:
            logger.info(
                f"Skipping {len(skipped_urls)} URLs that already exist in the collection"
            )

        if not new_urls:
            logger.info("All URLs already exist in collection")
            website_upload_tasks[task_id]["status"] = "complete"
            website_upload_tasks[task_id]["title"] = "Already Exists"
            website_upload_tasks[task_id][
                "message"
            ] = "All URLs already exist in collection"
            website_upload_tasks[task_id]["stats"] = [
                {
                    "label": "Skipped (Already Exist)",
                    "value": len(skipped_urls),
                    "variant": "warning",
                }
            ]
            return

        # Update task status
        website_upload_tasks[task_id]["stages"][0]["total"] = len(new_urls)
        website_upload_tasks[task_id]["stages"][0]["is_current"] = True

        # Get collection configuration
        collection_info = mongodb_client.get_docs(
            filter={"collection_name": collection_name},
            collection_name="configurations",
        )

        if not collection_info:
            raise Exception(f"Collection configuration not found for {collection_name}")

        config_doc = collection_info[0]
        chunk_size = config_doc.get("chunk_size", 1000)
        chunk_overlap = config_doc.get("chunk_overlap", 100)
        embedding_model = config_doc.get("dense_embedding_model")

        # Initialize embeddings
        from langchain_ollama import OllamaEmbeddings
        from langchain_openai import OpenAIEmbeddings

        if embedding_model == "jina/jina-embeddings-v2-base-de":
            dense_embeddings = OllamaEmbeddings(
                model="jina/jina-embeddings-v2-base-de",
                base_url="http://host.docker.internal:11434",
            )
            sparse_embeddings = FastEmbedSparse(model_name="Qdrant/bm25")
        elif embedding_model == "text-embedding-3-small":
            dense_embeddings = OpenAIEmbeddings(model=embedding_model)
            sparse_embeddings = FastEmbedSparse(model_name="Qdrant/bm25")
        else:
            raise Exception(f"Unsupported embedding model: {embedding_model}")

        # Configure crawler
        prune_filter = PruningContentFilter(threshold=0.5)
        md_generator = DefaultMarkdownGenerator(
            content_filter=prune_filter, options={"ignore_links": True}
        )

        crawler_config = CrawlerRunConfig(
            only_text=True,
            verbose=True,
            markdown_generator=md_generator,
            excluded_tags=["nav", "footer", "header"],
        )

        # Phase 1: Crawl and save to MongoDB
        crawled_documents = []
        failed_urls = []
        processed_urls = []

        async with AsyncWebCrawler() as crawler:
            for idx, url in enumerate(new_urls, 1):
                try:
                    logger.info(f"[{idx}/{len(new_urls)}] Crawling: {url}")

                    website_upload_tasks[task_id]["stages"][0]["current"] = idx
                    website_upload_tasks[task_id]["stages"][0]["current_item"] = url
                    website_upload_tasks[task_id][
                        "message"
                    ] = f"Crawling {idx}/{len(new_urls)}..."

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
                        error_msg = getattr(result, "error_message", "Unknown error")
                        logger.error(f"✗ Failed to crawl {url}: {error_msg}")
                        failed_urls.append({"url": url, "error": error_msg})

                except Exception as e:
                    logger.error(f"✗ Error crawling {url}: {str(e)}")
                    failed_urls.append({"url": url, "error": str(e)})

                await asyncio.sleep(0.1)

        if not crawled_documents:
            raise Exception("No documents were successfully crawled")

        website_upload_tasks[task_id]["stages"][0]["is_current"] = False
        website_upload_tasks[task_id]["stages"][1]["is_current"] = True
        website_upload_tasks[task_id]["stages"][1]["total"] = len(crawled_documents)

        # Phase 2: Chunk documents
        headers_to_split_on = [
            ("#", "Header 1"),
            ("##", "Header 2"),
            ("###", "Header 3"),
        ]
        markdown_splitter = MarkdownHeaderTextSplitter(
            headers_to_split_on=headers_to_split_on, strip_headers=True
        )

        text_splitter = CharacterTextSplitter.from_tiktoken_encoder(
            encoding_name="cl100k_base",
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
        )

        all_chunks = []
        all_uuids = []

        for doc_idx, doc_data in enumerate(crawled_documents, 1):
            try:
                website_upload_tasks[task_id]["stages"][1]["current"] = doc_idx
                website_upload_tasks[task_id]["stages"][1]["current_item"] = doc_data[
                    "url"
                ]
                website_upload_tasks[task_id][
                    "message"
                ] = f"Chunking document {doc_idx}/{len(crawled_documents)}..."

                md_header_splits = markdown_splitter.split_text(doc_data["markdown"])
                chunks = text_splitter.split_documents(md_header_splits)

                for chunk in chunks:
                    if not chunk.metadata:
                        chunk.metadata = {}

                    chunk.metadata["source_url"] = doc_data["url"]
                    chunk.metadata["title"] = doc_data["title"]
                    chunk.metadata["source_category"] = "website"
                    chunk.metadata["collection_name"] = collection_name

                    chunk_with_metadata = f"# {doc_data['title']}\n\n"
                    for key, value in chunk.metadata.items():
                        if key == "Header 1":
                            chunk_with_metadata += f"## {value}\n\n"
                        elif key == "Header 2":
                            chunk_with_metadata += f"### {value}\n\n"
                        elif key == "Header 3":
                            chunk_with_metadata += f"#### {value}\n\n"

                    chunk.page_content = chunk_with_metadata + chunk.page_content
                    all_chunks.append(chunk)
                    all_uuids.append(str(uuid4()))

                logger.info(f"Created {len(chunks)} chunks from {doc_data['url']}")

            except Exception as e:
                logger.error(f"Error chunking document {doc_data['url']}: {str(e)}")

            await asyncio.sleep(0.1)

        website_upload_tasks[task_id]["stages"][1]["is_current"] = False
        website_upload_tasks[task_id]["stages"][2]["is_current"] = True
        website_upload_tasks[task_id]["stages"][2]["total"] = len(all_chunks)

        # Phase 3: Create embeddings and save to Qdrant
        qdrant_client = QdrantClient(url="http://qdrant:6333")
        qdrant = QdrantVectorStore(
            client=qdrant_client,
            collection_name=collection_name,
            embedding=dense_embeddings,
            sparse_embedding=sparse_embeddings,
            retrieval_mode=RetrievalMode.HYBRID,
            vector_name="dense",
            sparse_vector_name="sparse",
        )

        batch_size = 10
        for i in range(0, len(all_chunks), batch_size):
            batch_chunks = all_chunks[i : i + batch_size]
            batch_uuids = all_uuids[i : i + batch_size]

            qdrant.add_documents(documents=batch_chunks, ids=batch_uuids)

            current = min(i + batch_size, len(all_chunks))
            website_upload_tasks[task_id]["stages"][2]["current"] = current
            website_upload_tasks[task_id][
                "message"
            ] = f"Embedding {current}/{len(all_chunks)} chunks..."

            await asyncio.sleep(0.1)

        # Complete
        website_upload_tasks[task_id]["status"] = "complete"
        website_upload_tasks[task_id]["title"] = "Upload Complete!"
        website_upload_tasks[task_id][
            "message"
        ] = f"Successfully processed {len(processed_urls)} websites"

        website_upload_tasks[task_id]["stages"][2]["is_current"] = False

        website_upload_tasks[task_id]["stats"] = [
            {
                "label": "Websites Processed",
                "value": len(processed_urls),
                "variant": "success",
            },
            {"label": "Chunks Created", "value": len(all_chunks), "variant": "info"},
        ]

        if skipped_urls:
            website_upload_tasks[task_id]["stats"].append(
                {
                    "label": "Skipped (Already Exist)",
                    "value": len(skipped_urls),
                    "variant": "warning",
                }
            )

        if failed_urls:
            website_upload_tasks[task_id]["stats"].append(
                {"label": "Failed", "value": len(failed_urls), "variant": "danger"}
            )
            website_upload_tasks[task_id]["failed"] = [f["url"] for f in failed_urls]

        logger.info(f"Website upload complete for task {task_id}")

    except Exception as e:
        logger.error(f"Error in background processing: {str(e)}")
        website_upload_tasks[task_id]["status"] = "error"
        website_upload_tasks[task_id]["title"] = "Processing Failed"
        website_upload_tasks[task_id]["message"] = str(e)


@router.post("/upload-documents")
async def upload_documents(request: UploadDocumentsRequest):
    """
    Start website upload task and return task ID
    """
    task_id = str(uuid4())

    # Initialize task
    website_upload_tasks[task_id] = {
        "status": "starting",
        "title": "Starting Website Upload",
        "message": f"Preparing to process {len(request.urls)} URLs...",
        "stages": [
            {
                "label": "Crawling Websites",
                "current": 0,
                "total": len(request.urls),
                "unit": "pages",
                "is_current": False,
                "show_percentage": True,
                "icon": "",
                "current_item": None,
            },
            {
                "label": "Chunking Documents",
                "current": 0,
                "total": 0,
                "unit": "documents",
                "is_current": False,
                "show_percentage": True,
                "icon": "",
                "current_item": None,
            },
            {
                "label": "Creating Embeddings",
                "current": 0,
                "total": 0,
                "unit": "chunks",
                "is_current": False,
                "show_percentage": True,
                "icon": "",
                "current_item": None,
            },
        ],
        "stats": [],
        "failed": [],
        "collection_name": request.collection_name,
        "start_time": datetime.now(),
    }

    # Start background processing
    asyncio.create_task(
        process_websites_background(task_id, request.collection_name, request.urls)
    )

    return JSONResponse(
        content={"task_id": task_id, "message": "Website upload started successfully"}
    )


@router.get("/upload-progress/{task_id}")
async def get_website_upload_progress(task_id: str):
    """
    Get upload progress for a specific website upload task
    """
    if task_id not in website_upload_tasks:
        return JSONResponse(content={"error": "Task not found"}, status_code=404)

    task = website_upload_tasks[task_id]

    return JSONResponse(
        content={
            "status": task["status"],
            "title": task["title"],
            "message": task["message"],
            "stages": task["stages"],
            "stats": task.get("stats", []),
            "failed": task.get("failed", []),
        }
    )
