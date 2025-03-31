from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, HttpUrl
# from crawl4ai import AsyncWebCrawler, CrawlerRunConfig
# from crawl4ai.deep_crawling import BFSDeepCrawlStrategy
# from crawl4ai.content_scraping_strategy import LXMLWebScrapingStrategy
import logging
import os
import httpx
import json


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

class URLCrawlRequest(BaseModel):
    base_url: HttpUrl
    depth: int
    max_pages: int
    include_external_domains: bool

@router.get("/")
async def crawl_url(base_url: HttpUrl, depth: int = 2, max_pages: int = 200, include_external_domains: bool = False):

    logger.info(f"Prepare crawl request with params: base_url={str(base_url)}, depth={depth}, max_pages={max_pages}, include_external_domains={include_external_domains}")
    # Create the request object
    url_crawl_request = URLCrawlRequest(
        base_url=base_url,
        depth=depth,
        max_pages=max_pages,
        include_external_domains=include_external_domains
    )
    
    try:
        with httpx.Client(timeout=500.0) as client:
            response = client.get(
                f"http://crawler:11235/crawl",
                params={
                    "base_url": str(url_crawl_request.base_url),
                    "depth": url_crawl_request.depth,
                    "max_pages": url_crawl_request.max_pages,
                    "include_external_domains": url_crawl_request.include_external_domains
                }
            )

        urls = json.loads(response.text)['response']['urls']

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
        

        # Access individual results
        # for result in results[:3]:  # Show first 3 results
        #     print(f"URL: {result.url}")
        #     print(f"Depth: {result.metadata.get('depth', 0)}")












# from fastapi import APIRouter, HTTPException
# from pydantic import BaseModel, HttpUrl
# from crawl4ai import AsyncWebCrawler, CrawlerRunConfig
# from crawl4ai.deep_crawling import BFSDeepCrawlStrategy
# from crawl4ai.content_scraping_strategy import LXMLWebScrapingStrategy
# import logging
# import os


# logging.basicConfig(level=logging.INFO)
# logger = logging.getLogger(__name__)

# router = APIRouter()

# class URLCrawlRequest(BaseModel):
#     base_url: HttpUrl
#     depth: int = 2
#     max_pages: int = 50
#     include_external_domains: bool = False

# @router.get("/{url}")
# async def crawl_url(url_crawl_request: URLCrawlRequest):
#     try:
#         #    # Configure a 2-level deep crawl
#         # config = CrawlerRunConfig(
#         #     deep_crawl_strategy=BFSDeepCrawlStrategy(
#         #         max_depth=url_crawl_request.depth,
#         #         max_pages=url_crawl_request.max_pages,
#         #         include_external=url_crawl_request.include_external_domains
#         #     ),
#         #     scraping_strategy=LXMLWebScrapingStrategy(),
#         #     check_robots_txt=True,
#         #     verbose=True
#         # )

#         # async with AsyncWebCrawler() as crawler:
#         #     results = await crawler.arun(str(url_crawl_request.base_url), config=config)
#         #     logger.info(f"Crawled {url_crawl_request.base_url} and found {len(results)} urls.")
#         #     urls = [res.url for res in results]

#         return {
#             "status": "success",
#             # "urls": urls
#             "base_url": url
#         }
#     except Exception as e:
#         logger.error(f"Error crawling URL {url_crawl_request.base_url}: {str(e)}")
#         raise HTTPException(
#             status_code=500,
#             detail=f"Failed to crawl URL {url_crawl_request.base_url}: {str(e)}"
#         )
        

#         # Access individual results
#         # for result in results[:3]:  # Show first 3 results
#         #     print(f"URL: {result.url}")
#         #     print(f"Depth: {result.metadata.get('depth', 0)}")




