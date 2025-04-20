from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, HttpUrl
import logging
import os
import httpx
import json

import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional
from backend.db.mongodb import MongoDBClient


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

class URLCrawlRequest(BaseModel):
    base_url: HttpUrl
    depth: int
    max_pages: int
    include_external_domains: bool

@router.get("/")
async def crawl_url(base_url: HttpUrl, depth: int = 2, max_pages: int = 200, include_external_domains: bool = False, collection_name:str = "temp"):

    logger.info(f"Prepare crawl request with params: base_url={str(base_url)}, depth={depth}, max_pages={max_pages}, include_external_domains={include_external_domains}")
    
    crawl_session_id = str(uuid.uuid4())
    
    url_crawl_request = URLCrawlRequest(
        base_url=base_url,
        depth=depth,
        max_pages=max_pages,
        include_external_domains=include_external_domains,
    )
    
    try:
        with httpx.Client(timeout=600000.0) as client:
            response = client.get(
                f"http://crawler:11235/crawl",
                params={
                    "base_url": str(url_crawl_request.base_url),
                    "depth": url_crawl_request.depth,
                    "max_pages": url_crawl_request.max_pages,
                    "include_external_domains": url_crawl_request.include_external_domains,
                    "crawl_session_id": crawl_session_id
                }
            )

        response_data = json.loads(response.text)

        logger.info(f"Try to persist docs in mongodb")
        mongo_db_client = MongoDBClient.get_instance()
        
        doc_ids = mongo_db_client.persist_docs(docs=response_data['results'], collection_name="temp")
        logger.info(f"Stored {len(doc_ids)} documents in Mongo DB.")

        urls = [res["url"] for res in response_data['results']][:max_pages]
        
        return {
            "status": "success",
            "response": {
                "status": "success",
                "urls": urls,
                "crawl_session_id": crawl_session_id
            }
        }

    except Exception as e:
        logger.error(f"Error crawling URL {url_crawl_request.base_url}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to crawl URL {url_crawl_request.base_url}: {str(e)}"
        )