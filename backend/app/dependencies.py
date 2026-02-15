"""
FastAPI dependency injection providers.
"""

from functools import lru_cache

from fastapi import Depends
from qdrant_client import QdrantClient

from backend.config import settings
from backend.db.mongodb import MongoDBClient
from backend.db.repositories.assistant_repo import AssistantRepository
from backend.db.repositories.evaluation_repo import EvaluationRepository
from backend.db.repositories.knowledge_base_repo import KnowledgeBaseRepository
from backend.services.assistant_service import AssistantService
from backend.services.evaluation_service import EvaluationService
from backend.services.knowledge_base_service import KnowledgeBaseService

# ── Clients ───────────────────────────────────────────────


@lru_cache(maxsize=1)
def get_mongodb() -> MongoDBClient:
    return MongoDBClient(settings.MONGODB_URL, settings.MONGODB_NAME)


@lru_cache(maxsize=1)
def get_qdrant_client() -> QdrantClient:
    return QdrantClient(url=settings.qdrant_url)


# ── Repositories ──────────────────────────────────────────


def get_assistant_repo(
    db: MongoDBClient = Depends(get_mongodb),
) -> AssistantRepository:
    return AssistantRepository(db=db)


def get_knowledge_base_repo(
    db: MongoDBClient = Depends(get_mongodb),
    qdrant: QdrantClient = Depends(get_qdrant_client),
) -> KnowledgeBaseRepository:
    return KnowledgeBaseRepository(db=db, qdrant=qdrant)


def get_evaluation_repo(
    db: MongoDBClient = Depends(get_mongodb),
) -> EvaluationRepository:
    return EvaluationRepository(db=db)


# ── Services ──────────────────────────────────────────────


def get_assistant_service(
    repo: AssistantRepository = Depends(get_assistant_repo),
) -> AssistantService:
    return AssistantService(repo=repo)


def get_knowledge_base_service(
    repo: KnowledgeBaseRepository = Depends(get_knowledge_base_repo),
) -> KnowledgeBaseService:
    return KnowledgeBaseService(repo=repo)


def get_evaluation_service(
    repo: EvaluationRepository = Depends(get_evaluation_repo),
) -> EvaluationService:
    return EvaluationService(repo=repo)
