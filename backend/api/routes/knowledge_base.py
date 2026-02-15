"""
API routes for knowledge base management.
"""

import logging

from fastapi import APIRouter, Depends, File, Form, Query, UploadFile
from fastapi.responses import FileResponse, JSONResponse

from backend.app.dependencies import get_knowledge_base_service
from backend.schemas.collections import (
    CollectionConfigResponse,
    CollectionCreateRequest,
    CollectionListResponse,
    CollectionUpdateRequest,
    ReindexRequest,
    TaskProgressResponse,
    TaskStartedResponse,
    WatchUrlsResponse,
    WebsiteLinkInfo,
    WebsiteUploadRequest,
)
from backend.services.knowledge_base_service import KnowledgeBaseService

logger = logging.getLogger(__name__)

router = APIRouter()


# ── Collection CRUD ───────────────────────────────────────


@router.get(
    "/collections",
    response_model=CollectionListResponse,
    operation_id="listCollections",
)
async def list_collections(
    service: KnowledgeBaseService = Depends(get_knowledge_base_service),
):
    """List all available collections."""
    names = service.list_collections()
    return CollectionListResponse(collection_names=names)


@router.get(
    "/collections/{collection_name}",
    response_model=CollectionConfigResponse,
    operation_id="getCollectionConfig",
)
async def get_collection_config(
    collection_name: str,
    service: KnowledgeBaseService = Depends(get_knowledge_base_service),
):
    """Get configuration for a specific collection."""
    return service.get_collection_config(collection_name)


@router.post(
    "/collections",
    response_model=CollectionConfigResponse,
    status_code=201,
    operation_id="createCollection",
)
async def create_collection(
    request: CollectionCreateRequest,
    service: KnowledgeBaseService = Depends(get_knowledge_base_service),
):
    """Create a new knowledge base collection."""
    return service.create_collection(
        collection_name=request.collection_name,
        description=request.description,
        embedding_model=request.embedding_model,
        chunk_size=request.chunk_size,
        chunk_overlap=request.chunk_overlap,
        distance_metric=request.distance_metric,
    )


@router.patch(
    "/collections/{collection_name}",
    status_code=204,
    operation_id="updateCollection",
)
async def update_collection(
    collection_name: str,
    request: CollectionUpdateRequest,
    service: KnowledgeBaseService = Depends(get_knowledge_base_service),
):
    """Update collection metadata."""
    service.update_collection(collection_name, description=request.description)


@router.delete(
    "/collections/{collection_name}",
    status_code=204,
    operation_id="deleteCollection",
)
async def delete_collection(
    collection_name: str,
    service: KnowledgeBaseService = Depends(get_knowledge_base_service),
):
    """Delete a collection and all associated data."""
    service.delete_collection(collection_name)


# ── Website ingestion ─────────────────────────────────────


@router.get(
    "/links",
    response_model=list[WebsiteLinkInfo],
    operation_id="getWebsiteLinks",
)
async def get_links(
    base_url: str = Query(..., description="URL to crawl for links"),
    include_external: bool = Query(False, description="Include external domains"),
    collection_name: str | None = Query(
        None, description="Collection to check for existing URLs"
    ),
    service: KnowledgeBaseService = Depends(get_knowledge_base_service),
):
    """Discover links from a website and mark existing ones."""
    return await service.get_links(base_url, collection_name, include_external)


@router.post(
    "/upload-websites",
    response_model=TaskStartedResponse,
    status_code=202,
    operation_id="uploadWebsites",
)
async def upload_websites(
    request: WebsiteUploadRequest,
    service: KnowledgeBaseService = Depends(get_knowledge_base_service),
):
    """Start background website ingestion. Poll progress via /upload-progress/{task_id}."""
    task_id = service.start_website_upload(request.collection_name, request.urls)
    return TaskStartedResponse(
        task_id=task_id, message="Website upload started successfully"
    )


@router.post(
    "/reindex",
    operation_id="reindexUrls",
)
async def reindex_urls(
    request: ReindexRequest,
    service: KnowledgeBaseService = Depends(get_knowledge_base_service),
):
    """Delete and re-ingest URLs."""
    return await service.reindex_urls(request.collection_name, request.urls)


@router.get(
    "/watch-urls/{collection_name}",
    response_model=WatchUrlsResponse,
    operation_id="watchUrls",
)
async def watch_urls(
    collection_name: str,
    service: KnowledgeBaseService = Depends(get_knowledge_base_service),
):
    """Check if website contents have changed since last scrape."""
    return await service.watch_urls(collection_name)


# ── File ingestion ────────────────────────────────────────


@router.post(
    "/upload-files",
    response_model=TaskStartedResponse,
    status_code=202,
    operation_id="uploadFiles",
)
async def upload_files(
    collection_name: str = Form(...),
    files: list[UploadFile] = File(...),
    service: KnowledgeBaseService = Depends(get_knowledge_base_service),
):
    """Start background file ingestion. Poll progress via /upload-progress/{task_id}."""
    file_data_list = []
    for file in files:
        content = await file.read()
        file_data_list.append({"content": content, "filename": file.filename})

    task_id = service.start_file_upload(collection_name, file_data_list)
    return TaskStartedResponse(
        task_id=task_id, message="File upload started successfully"
    )


@router.get(
    "/files/{collection_name}/{filename}",
    operation_id="getFile",
)
async def get_file(
    collection_name: str,
    filename: str,
    service: KnowledgeBaseService = Depends(get_knowledge_base_service),
):
    """Serve an uploaded file."""
    file_path = service.get_file_path(collection_name, filename)
    if not file_path:
        return JSONResponse(content={"error": "File not found"}, status_code=404)

    mime_type = service.get_file_mime_type(filename)
    return FileResponse(
        file_path,
        media_type=mime_type,
        filename=filename,
        headers={"Content-Disposition": f"inline; filename={filename}"},
    )


# ── Shared progress endpoint ─────────────────────────────


@router.get(
    "/upload-progress/{task_id}",
    response_model=TaskProgressResponse,
    operation_id="getUploadProgress",
)
async def get_upload_progress(
    task_id: str,
    service: KnowledgeBaseService = Depends(get_knowledge_base_service),
):
    """Get progress for a website or file upload task."""
    progress = service.get_upload_progress(task_id)
    if not progress:
        return JSONResponse(content={"error": "Task not found"}, status_code=404)
    return progress
