from functools import lru_cache

from fastapi import Depends

from backend.config import settings
from backend.db.mongodb import MongoDBClient
from backend.db.repositories.assistant_repo import AssistantRepository
from backend.services.assistant_service import AssistantService


@lru_cache(maxsize=1)
def get_mongodb() -> MongoDBClient:
    return MongoDBClient(settings.MONGODB_URL, settings.MONGODB_NAME)


def get_assistant_repo(db: MongoDBClient = Depends(get_mongodb)) -> AssistantRepository:
    return AssistantRepository(db=db)


def get_assistant_service(
    repo: AssistantRepository = Depends(get_assistant_repo),
) -> AssistantService:
    return AssistantService(repo=repo)
