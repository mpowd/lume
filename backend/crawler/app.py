from fastapi import FastAPI, HTTPException, BackgroundTasks, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl
import logging
from crawl4ai import AsyncWebCrawler, CrawlerRunConfig, BrowserConfig, CacheMode
from crawl4ai.deep_crawling import BFSDeepCrawlStrategy
from crawl4ai.content_scraping_strategy import LXMLWebScrapingStrategy
from crawl4ai.content_filter_strategy import PruningContentFilter
from crawl4ai.markdown_generation_strategy import DefaultMarkdownGenerator
import time
import os
import docker
from typing import List, Dict, Any, Optional
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


def restart_container():
    """Function to restart the current container"""
    try:
        time.sleep(3)

        container_id = os.environ.get("HOSTNAME")

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


@app.get("/crawl")
async def crawl(
    background_tasks: BackgroundTasks,
    base_url: str = Query(..., description="URL to crawl"),
    depth: int = Query(2, description="Crawl depth"),
    max_pages: int = Query(50, description="Maximum pages to crawl"),
    include_external_domains: bool = Query(
        False, description="Whether to include external domains"
    ),
    crawl_session_id: str = Query(..., description="Unique session ID for this crawl"),
):
    logger.info(
        f"Starting crawl for URL: {base_url} with depth: {depth}, max_pages: {max_pages}"
    )

    try:
        # Configure browser - important settings for container environment
        browser_config = BrowserConfig(
            headless=True,
            verbose=False,
            accept_downloads=False,
            # Additional settings for stability
            extra_args=[
                "--disable-gpu",
                "--disable-dev-shm-usage",
                "--no-sandbox",
                "--disable-setuid-sandbox",
            ],
        )

        # Configure content filtering
        prune_filter = PruningContentFilter(
            threshold=0.4,
            threshold_type="dynamic",
        )

        md_generator = DefaultMarkdownGenerator(content_filter=prune_filter)

        # Configure crawl strategy
        config = CrawlerRunConfig(
            deep_crawl_strategy=BFSDeepCrawlStrategy(
                max_depth=depth,
                max_pages=int(max_pages * 1.5),  # Crawl extra to account for filtering
                include_external=include_external_domains,
            ),
            markdown_generator=md_generator,
            scraping_strategy=LXMLWebScrapingStrategy(),
            check_robots_txt=True,
            cache_mode=CacheMode.BYPASS,  # Don't use cache for fresh results
            verbose=True,
        )

        results = []

        # Use async context manager properly
        async with AsyncWebCrawler(config=browser_config) as crawler:
            crawl_results = await crawler.arun(str(base_url), config=config)

            logger.info(f"Crawled {len(crawl_results)} pages in total")

            # Process results
            for result in crawl_results:
                title = None
                if hasattr(result, "metadata") and result.metadata:
                    title = result.metadata.get("title")

                # Only include successful crawls with content
                if result.success and result.markdown:
                    serializable_result = {
                        "url": result.url,
                        "success": result.success,
                        "markdown": result.markdown.fit_markdown,
                        "links": result.links,
                        "title": title,
                        "metadata": result.metadata,
                        "crawl_session_id": crawl_session_id,
                        "timestamp": datetime.now().isoformat(),
                    }
                    results.append(serializable_result)

        # Deduplicate by URL
        url_dict = {result["url"]: result for result in results}
        distinct_results = list(url_dict.values())

        logger.info(
            f"Crawl completed successfully with {len(distinct_results)} unique pages"
        )

        # Schedule container restart as workaround for playwright bug
        # Comment this out if you don't want auto-restart
        # background_tasks.add_task(restart_container)

        return {"results": distinct_results}

    except Exception as e:
        logger.error(f"Error crawling URL {base_url}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500, detail=f"Failed to crawl URL {base_url}: {str(e)}"
        )
