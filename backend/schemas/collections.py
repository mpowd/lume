"""
Pydantic schemas for knowledge base (collections, documents, ingestion).
"""

from pydantic import BaseModel, Field

# ── Collection CRUD ───────────────────────────────────────


class CollectionCreateRequest(BaseModel):
    collection_name: str
    description: str = ""
    embedding_model: str
    chunk_size: int = 1000
    chunk_overlap: int = 100
    distance_metric: str = "Cosine similarity"


class CollectionUpdateRequest(BaseModel):
    description: str | None = None


class CollectionConfigResponse(BaseModel):
    """The full collection configuration stored in MongoDB."""

    collection_name: str
    description: str = ""
    dense_embedding_model: str
    dense_embedding_dim: int
    sparse_embedding_model: str = "bm25"
    chunk_size: int
    chunk_overlap: int
    distance_metric: str
    created_at: str
    updated_at: str


class CollectionListResponse(BaseModel):
    collection_names: list[str]


# ── Document / Source management ──────────────────────────


class SourceDocument(BaseModel):
    """A document stored in MongoDB for a collection."""

    url: str
    title: str = "Untitled"
    source_category: str  # "website" or "file"
    hash: str | None = None
    collection_name: str
    timestamp: str | None = None


class CollectionDocumentsResponse(BaseModel):
    documents: list[SourceDocument]
    total: int


# ── Website ingestion ────────────────────────────────────


class WebsiteLinkInfo(BaseModel):
    """A link discovered during crawling."""

    href: str
    url: str
    text: str = ""
    title: str = "Untitled"
    score: float = 0.0
    base_domain: str = ""
    exists_in_collection: bool = False


class WebsiteUploadRequest(BaseModel):
    collection_name: str
    urls: list[str]


class ReindexRequest(BaseModel):
    collection_name: str
    urls: list[str]


# ── File ingestion ────────────────────────────────────────

# File upload uses Form + File, so no request body model needed.
# The response is the same TaskStartedResponse.


# ── Background task progress ─────────────────────────────


class TaskStartedResponse(BaseModel):
    task_id: str
    message: str


class ProgressStageResponse(BaseModel):
    label: str
    current: int = 0
    total: int = 0
    unit: str = "items"
    is_current: bool = False
    current_item: str | None = None


class CompletionStatResponse(BaseModel):
    label: str
    value: int
    variant: str = "info"


class TaskProgressResponse(BaseModel):
    status: str
    title: str
    message: str
    stages: list[ProgressStageResponse] = Field(default_factory=list)
    stats: list[CompletionStatResponse] = Field(default_factory=list)
    failed: list[str] = Field(default_factory=list)


# ── Watch / Change detection ─────────────────────────────


class WatchUrlsResponse(BaseModel):
    total_urls: int
    changed_urls: list[str]
    unchanged_urls: list[str]
    changed_count: int
    unchanged_count: int
