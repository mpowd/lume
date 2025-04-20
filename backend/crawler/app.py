from fastapi import FastAPI, HTTPException, BackgroundTasks, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl
import logging
from crawl4ai import AsyncWebCrawler, CrawlerRunConfig, BrowserConfig, RateLimiter, CrawlerMonitor, DisplayMode, CacheMode
from crawl4ai.deep_crawling import BFSDeepCrawlStrategy
from crawl4ai.content_scraping_strategy import LXMLWebScrapingStrategy
from crawl4ai.async_dispatcher import MemoryAdaptiveDispatcher, SemaphoreDispatcher
from crawl4ai.content_filter_strategy import PruningContentFilter
from crawl4ai.markdown_generation_strategy import DefaultMarkdownGenerator
import time
from uuid import uuid4
import os
import docker
from typing import List, Dict, Any, Optional
from collections import OrderedDict
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class URLCrawlRequest(BaseModel):
    base_url: HttpUrl
    depth: int
    max_pages: int
    include_external_domains: bool




def restart_container():
    """Function to restart the current container"""
    try:
        time.sleep(3)
        
        container_id = os.environ.get('HOSTNAME')
        
        if not container_id:
            logger.error("Could not determine container ID")
            return
        
        client = docker.from_env()
        container = client.containers.get(container_id)
        
        logger.info(f"Restarting container {container_id}")
        container.restart()
    except Exception as e:
        logger.error(f"Failed to restart container: {str(e)}")

@app.get("/health")
async def health_check():
    return {"status": "healthy"}


class JsonableCrawlResult(BaseModel):
    """A modified version of CrawlResult that can be serialized to JSON"""
    url: str
    success: bool
    markdown: Optional[Dict[str, str]] = None
    links: Optional[Dict[str, List[Dict]]] = None
    title: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    crawl_session_id: Optional[str] = None
    timestamp: datetime = datetime.now()




@app.get("/crawl")
async def crawl(
    background_tasks: BackgroundTasks,
    base_url: str = Query(..., description="URL to crawl"),
    depth: int = Query(2, description="Crawl depth"),
    max_pages: int = Query(50, description="Maximum pages to crawl"),
    include_external_domains: bool = Query(False, description="Whether to include external domains"),
    crawl_session_id: str = Query(..., description="Unique session ID for this crawl")
): 
    
    logger.info(f"Starting crawl for URL: {base_url} with depth: {depth}")

    
    try:

        prune_filter = PruningContentFilter(
            threshold=0.4,           
            threshold_type="dynamic",  
   
        )

        md_generator = DefaultMarkdownGenerator(content_filter=prune_filter)

        config = CrawlerRunConfig(
            deep_crawl_strategy=BFSDeepCrawlStrategy(
                max_depth=depth,
                max_pages=int(max_pages * 1.5),
                include_external=include_external_domains
            ),
            markdown_generator=md_generator,
            scraping_strategy=LXMLWebScrapingStrategy(),
            check_robots_txt=True,
            verbose=True
        )

        results=[]
        async with AsyncWebCrawler() as crawler:
            crawl_results = await crawler.arun(str(base_url), config=config)

            logger.info(f"Crawled {len(crawl_results)} pages in total")


        for result in crawl_results:
            title = None
            if hasattr(result, 'metadata') and result.metadata:
                title = result.metadata.get('title')
            
            if result.markdown:
                serializable_result = {
                    "url": result.url,
                    "success": result.success,
                    "markdown": result.markdown.fit_markdown,
                    "links": result.links,
                    "title": title,
                    "metadata": result.metadata,
                    "crawl_session_id": crawl_session_id,
                    "timestamp": datetime.now().isoformat()
                }
                results.append(serializable_result)

        url_dict = {result["url"]: result for result in results}
        distinct_results = list(url_dict.values())


        # workaround for bug in playwright
        background_tasks.add_task(restart_container)

        logger.info("Crawl completed successfully, container will restart soon")


        return {
            "results": distinct_results
        }

            
    except Exception as e:
        logger.error(f"Error crawling URL {base_url}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to crawl URL {base_url}: {str(e)}"
        )