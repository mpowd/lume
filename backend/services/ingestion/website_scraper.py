"""
Website scraping service — extracts markdown content from URLs.
"""

import asyncio
import hashlib
import logging
from datetime import datetime

from crawl4ai import AsyncWebCrawler, CrawlerRunConfig
from crawl4ai.content_filter_strategy import PruningContentFilter
from crawl4ai.markdown_generation_strategy import DefaultMarkdownGenerator

logger = logging.getLogger(__name__)


def _get_crawler_config() -> CrawlerRunConfig:
    """Standard crawler configuration for markdown extraction."""
    prune_filter = PruningContentFilter(threshold=0.5)
    md_generator = DefaultMarkdownGenerator(
        content_filter=prune_filter, options={"ignore_links": True}
    )
    return CrawlerRunConfig(
        only_text=True,
        verbose=True,
        markdown_generator=md_generator,
        excluded_tags=["nav", "footer", "header"],
    )


def _content_hash(content: str) -> str:
    """Generate MD5 hash for content deduplication."""
    return hashlib.md5(content.encode("utf-8")).hexdigest()


async def scrape_urls(
    urls: list[str],
    collection_name: str,
    on_progress: callable = None,
) -> tuple[list[dict], list[str], list[dict]]:
    """
    Scrape a list of URLs and return structured document dicts.

    Args:
        urls: URLs to scrape.
        collection_name: Target collection name (stored in document metadata).
        on_progress: Optional callback(index, total, url) for progress updates.

    Returns:
        Tuple of:
        - scraped_documents: List of document dicts ready for MongoDB
        - processed_urls: Successfully scraped URLs
        - failed_urls: List of {"url": ..., "error": ...} dicts
    """
    scraped_documents = []
    processed_urls = []
    failed_urls = []

    config = _get_crawler_config()

    async with AsyncWebCrawler() as crawler:
        for idx, url in enumerate(urls, 1):
            try:
                logger.info(f"[{idx}/{len(urls)}] Crawling: {url}")

                if on_progress:
                    on_progress(idx, len(urls), url)

                result = await crawler.arun(url, config=config)

                if result.success and result.markdown:
                    markdown_content = result.markdown.fit_markdown
                    doc = {
                        "url": url,
                        "markdown": markdown_content,
                        "title": result.metadata.get("title", "Untitled"),
                        "description": result.metadata.get("description", ""),
                        "source_category": "website",
                        "collection_name": collection_name,
                        "timestamp": datetime.now().isoformat(),
                        "hash": _content_hash(markdown_content),
                        "metadata": {
                            "status_code": result.status_code,
                            "content_type": result.metadata.get(
                                "content_type", "text/html"
                            ),
                        },
                    }
                    scraped_documents.append(doc)
                    processed_urls.append(url)
                    logger.info(f"Successfully crawled: {url}")
                else:
                    error_msg = getattr(result, "error_message", "Unknown error")
                    logger.error(f"Failed to crawl {url}: {error_msg}")
                    failed_urls.append({"url": url, "error": error_msg})

            except Exception as e:
                logger.error(f"Error crawling {url}: {e}")
                failed_urls.append({"url": url, "error": str(e)})

            await asyncio.sleep(0.1)

    if not scraped_documents:
        raise RuntimeError("No documents were successfully crawled")

    return scraped_documents, processed_urls, failed_urls


async def get_links(
    base_url: str,
    include_external: bool = False,
) -> list[dict]:
    """
    Discover links from a base URL using crawl4ai link preview.

    Args:
        base_url: URL to crawl for links.
        include_external: Whether to include external domain links.

    Returns:
        List of link dicts with href, text, title, score, base_domain.
    """
    from crawl4ai import LinkPreviewConfig

    link_preview_config = LinkPreviewConfig(
        include_internal=True,
        include_external=include_external,
        verbose=True,
    )

    config = CrawlerRunConfig(
        link_preview_config=link_preview_config,
        score_links=True,
        only_text=True,
        verbose=True,
        check_robots_txt=True,
    )

    async with AsyncWebCrawler() as crawler:
        result = await crawler.arun(base_url, config=config)

        if not result.success:
            raise RuntimeError(
                f"Crawl failed: {getattr(result, 'error_message', 'Unknown error')}"
            )

        internal = result.links.get("internal", [])
        external = result.links.get("external", []) if include_external else []

        links = []
        for link in internal + external:
            intrinsic = link.get("intrinsic_score", 0)
            total = link.get("total_score", 0)
            score = total if total else (intrinsic / 10.0 if intrinsic else 0)

            links.append(
                {
                    "href": link.get("href", ""),
                    "url": link.get("href", ""),
                    "text": link.get("text", ""),
                    "title": link.get("title", "Untitled"),
                    "score": score,
                    "base_domain": link.get("base_domain", ""),
                }
            )

        return links
