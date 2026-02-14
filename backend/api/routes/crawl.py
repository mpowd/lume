import json
import logging
import uuid

import httpx
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from backend.db.mongodb import MongoDBClient

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/")
async def crawl_url(
    base_url: str = Query(..., description="URL to crawl"),
    depth: int = Query(2, description="Crawl depth"),
    max_pages: int = Query(50, description="Maximum pages to crawl"),
    include_external_domains: bool = Query(
        False, description="Include external domains"
    ),
):
    """Stream crawl progress via Server-Sent Events"""
    logger.info(f"Crawl request: {base_url}, depth={depth}, max_pages={max_pages}")

    async def generate():
        crawl_session_id = str(uuid.uuid4())

        # Send initial status
        yield f"data: {json.dumps({'type': 'init', 'session_id': crawl_session_id, 'max_pages': max_pages})}\n\n"

        try:
            # Make the crawl request to crawler service
            async with httpx.AsyncClient(timeout=600.0) as client:
                response = await client.get(
                    "http://crawler:11235/crawl",
                    params={
                        "base_url": base_url,
                        "depth": depth,
                        "max_pages": max_pages,
                        "include_external_domains": include_external_domains,
                        "crawl_session_id": crawl_session_id,
                    },
                )

            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code, detail="Crawler service error"
                )

            response_data = response.json()
            results = response_data.get("results", [])

            # Store all results in MongoDB temp collection
            if results:
                mongo_db_client = MongoDBClient.get_instance()
                mongo_db_client.db["temp"].insert_many(results)
                logger.info(f"Stored {len(results)} documents in temp collection")

            # Stream each URL as it's processed
            for i, result in enumerate(results):
                url_data = {
                    "type": "url",
                    "url": result["url"],
                    "title": result.get("title", ""),
                    "index": i,
                    "total": len(results),
                    "session_id": crawl_session_id,
                }
                yield f"data: {json.dumps(url_data)}\n\n"

            # Send completion status
            yield f"data: {json.dumps({'type': 'complete', 'total': len(results), 'session_id': crawl_session_id})}\n\n"

        except httpx.TimeoutException:
            logger.error("Crawl timeout")
            yield f"data: {json.dumps({'type': 'error', 'message': 'Crawl request timed out'})}\n\n"
        except Exception as e:
            logger.error(f"Crawl error: {str(e)}")
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


class UploadDocumentsRequest(BaseModel):
    collection_name: str
    urls: list[str]
    crawl_session_id: str


@router.post("/upload-documents")
async def upload_documents(request: UploadDocumentsRequest):
    """Upload selected URLs to the vector store"""
    try:
        mongo_db_client = MongoDBClient.get_instance()

        # Retrieve documents from temp collection by crawl_session_id
        all_docs = list(
            mongo_db_client.db["temp"].find(
                {"crawl_session_id": request.crawl_session_id}
            )
        )

        if not all_docs:
            raise HTTPException(
                status_code=404,
                detail=f"No documents found for session {request.crawl_session_id}",
            )

        # Filter to only include selected URLs
        selected_docs = [doc for doc in all_docs if doc.get("url") in request.urls]

        if not selected_docs:
            raise HTTPException(
                status_code=404, detail="No matching documents found for selected URLs"
            )

        logger.info(
            f"Uploading {len(selected_docs)} documents to {request.collection_name}"
        )

        # TODO: Implement your vector store upload logic here
        # Example:
        # from backend.services.vector_store import vector_store
        # vector_store.add_documents(request.collection_name, selected_docs)

        # Clean up temp documents after successful upload
        mongo_db_client.db["temp"].delete_many(
            {"crawl_session_id": request.crawl_session_id}
        )

        return {
            "success": True,
            "uploaded_count": len(selected_docs),
            "urls": request.urls,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading documents: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
