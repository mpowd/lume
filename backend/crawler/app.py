from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl
import logging
from crawl4ai import AsyncWebCrawler, CrawlerRunConfig, BrowserConfig
from crawl4ai.deep_crawling import BFSDeepCrawlStrategy
from crawl4ai.content_scraping_strategy import LXMLWebScrapingStrategy
import time
from uuid import uuid4
import os
import docker


# Set up logging
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
        # Wait a moment to ensure the response is sent
        time.sleep(3)
        
        # Get the container ID (available as an env var in Docker)
        container_id = os.environ.get('HOSTNAME')
        
        if not container_id:
            logger.error("Could not determine container ID")
            return
        
        # Connect to Docker API
        client = docker.from_env()
        container = client.containers.get(container_id)
        
        logger.info(f"Restarting container {container_id}")
        container.restart()
    except Exception as e:
        logger.error(f"Failed to restart container: {str(e)}")

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.get("/crawl")
async def crawl_url(background_tasks: BackgroundTasks, base_url: HttpUrl, depth: int = 2, max_pages: int = 50, include_external_domains: bool = False):
    logger.info(f"Received crawl request for {base_url} with depth={depth}, max_pages={max_pages}")
    
    # Create the request object
    url_crawl_request = URLCrawlRequest(
        base_url=base_url,
        depth=depth,
        max_pages=max_pages,
        include_external_domains=include_external_domains
    )  
    
    try:
        logger.info(f"Starting crawl for URL: {url_crawl_request.base_url} with depth: {url_crawl_request.depth}")

        #    # Configure a 2-level deep crawl
        config = CrawlerRunConfig(
            deep_crawl_strategy=BFSDeepCrawlStrategy(
                max_depth=url_crawl_request.depth,
                max_pages=url_crawl_request.max_pages,
                include_external=url_crawl_request.include_external_domains
            ),
            scraping_strategy=LXMLWebScrapingStrategy(),
            check_robots_txt=True,
            verbose=True
        )

        async with AsyncWebCrawler() as crawler:
            results = await crawler.arun(str(url_crawl_request.base_url), config=config)

            logger.info(f"Crawled {len(results)} pages in total")

        urls = [res.url for res in results]

        background_tasks.add_task(restart_container)

        logger.info("Crawl completed successfully, container will restart soon")

        return {
            "status": "success",
            "response": {
                "status": "success",
                "urls": urls
            }
        }
            
    except Exception as e:
        logger.error(f"Error crawling URL {url_crawl_request.base_url}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to crawl URL {url_crawl_request.base_url}: {str(e)}"
        )