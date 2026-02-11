from fastapi import Depends

from backend.db.mongodb import MongoDBClient
from backend.db.repositories.assistant_repo import AssistantRepository
from backend.services.assistant_service import AssistantService


def get_mongodb() -> MongoDBClient:
    return MongoDBClient.get_instance()


def get_assistant_repo(db: MongoDBClient = Depends(get_mongodb)) -> AssistantRepository:
    return AssistantRepository(db=db)


def get_assistant_service(
    repo: AssistantRepository = Depends(get_assistant_repo),
) -> AssistantService:
    return AssistantService(repo=repo)
