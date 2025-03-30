from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl
import logging
from crawl4ai import AsyncWebCrawler, CrawlerRunConfig, BrowserConfig
from crawl4ai.deep_crawling import BFSDeepCrawlStrategy
from crawl4ai.content_scraping_strategy import LXMLWebScrapingStrategy
import time
from uuid import uuid4


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
    depth: int = 2
    max_pages: int = 50
    include_external_domains: bool = False

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.get("/crawl")
async def crawl_url(base_url: HttpUrl, depth: int = 2, max_pages: int = 50, include_external_domains: bool = False):
    # Create the request object
    url_crawl_request = URLCrawlRequest(
        base_url=base_url,
        depth=depth,
        max_pages=max_pages,
        include_external_domains=include_external_domains
    )  
    
    try:
        logger.info(f"Starting crawl for URL: {url_crawl_request.base_url} with depth: {url_crawl_request.depth}")
        
        # Create a browser config
        browser_config = BrowserConfig(
            browser_type="chromium",
            headless=True,
            verbose=True
        )
        
        # Configure deep crawling with a unique session ID each time
        session_id = f"crawl_{int(time.time())}_{uuid4().hex[:8]}"
        
        config = CrawlerRunConfig(
            deep_crawl_strategy=BFSDeepCrawlStrategy(
                max_depth=url_crawl_request.depth,
                max_pages=url_crawl_request.max_pages,
                include_external=url_crawl_request.include_external_domains
            ),
            scraping_strategy=LXMLWebScrapingStrategy(),
            check_robots_txt=True,
            verbose=True,
            session_id=session_id  # Add the unique session ID
        )
        
        async with AsyncWebCrawler(config=browser_config) as crawler:
            try:
                # Run the crawl
                results = await crawler.arun(str(url_crawl_request.base_url), config=config)
                logger.info(f"Crawled {url_crawl_request.base_url} and found {len(results)} urls.")
                urls = [res.url for res in results]
                
                return {
                    "status": "success",
                    "urls": urls
                }
            finally:
                # Explicitly kill the session when done
                try:
                    await crawler.crawler_strategy.kill_session(session_id)
                    logger.info(f"Successfully killed session {session_id}")
                except Exception as e:
                    logger.error(f"Error killing session {session_id}: {str(e)}")
            
    except Exception as e:
        logger.error(f"Error crawling URL {url_crawl_request.base_url}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to crawl URL {url_crawl_request.base_url}: {str(e)}"
        )
# if __name__ == "__main__":
#     import uvicorn
#     uvicorn.run(app, host="0.0.0.0", port=11235)