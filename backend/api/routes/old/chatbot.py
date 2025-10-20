from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
import logging
from typing import Dict, Any, List, Optional
from backend.db.mongodb import MongoDBClient
import uuid
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()


class ChatbotCreateRequest(BaseModel):
    chatbot_name: str
    workflow: str
    collections: List[str]
    local_only: Optional[bool] = False  # NEW: Local-only processing mode
    hybrid_search: Optional[bool] = True
    hyde: Optional[bool] = False
    hyde_prompt: Optional[str] = None
    top_k: Optional[int] = 10
    reranking: Optional[bool] = False
    reranker: Optional[str] = None  # Deprecated, kept for backwards compatibility
    reranker_provider: Optional[str] = "cohere"  # NEW: cohere or huggingface
    reranker_model: Optional[str] = "rerank-v3.5"  # NEW: Specific model name
    top_n: Optional[int] = None
    llm: str
    llm_provider: Optional[str] = "openai"  # NEW: openai or ollama
    rag_prompt: Optional[str] = None
    tools: Optional[List[str]] = None
    max_steps: Optional[int] = 4
    precise_citation: Optional[bool] = False


class ChatbotUpdateRequest(ChatbotCreateRequest):
    id: Optional[str] = None


@router.post("/save")
async def save_chatbot(request: ChatbotCreateRequest):
    try:
        logger.info(f"Creating new chatbot: {request.chatbot_name}")

        chatbot_config = request.dict()

        chatbot_config["created_at"] = datetime.now().isoformat()
        chatbot_config["updated_at"] = datetime.now().isoformat()

        mongodb_client = MongoDBClient.get_instance()
        result = mongodb_client.persist_docs(
            docs=[chatbot_config], collection_name="chatbots"
        )

        logger.info(f"Chatbot saved with ID: {result[0]}")

        if request.local_only:
            logger.info(f"Chatbot configured with LOCAL-ONLY mode enabled")
        if request.precise_citation:
            logger.info(f"Chatbot configured with PRECISE CITATION mode enabled")
        if request.reranking:
            logger.info(
                f"Chatbot configured with reranking: {request.reranker_provider}/{request.reranker_model}"
            )

        return {
            "status": "success",
            "message": f"Chatbot '{request.chatbot_name}' created successfully",
            "chatbot_id": str(result[0]),
        }

    except Exception as e:
        logger.error(f"Error creating chatbot: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{chatbot_id}")
async def update_chatbot(chatbot_id: str, request: ChatbotUpdateRequest):
    """
    Update an existing chatbot configuration
    """
    try:
        logger.info(f"Updating chatbot: {request.chatbot_name} (ID: {chatbot_id})")

        mongodb_client = MongoDBClient.get_instance()
        from bson.objectid import ObjectId

        existing_chatbots = mongodb_client.get_docs(
            filter={"_id": ObjectId(chatbot_id)}, collection_name="chatbots"
        )

        if not existing_chatbots:
            raise HTTPException(status_code=404, detail="Chatbot not found")

        chatbot_config = request.dict(exclude_unset=True)

        if "id" in chatbot_config:
            del chatbot_config["id"]

        chatbot_config["updated_at"] = datetime.now().isoformat()

        result = mongodb_client.update_document(
            doc_id=chatbot_id, update_data=chatbot_config, collection_name="chatbots"
        )

        if not result:
            raise HTTPException(status_code=500, detail="Failed to update chatbot")

        logger.info(
            f"Chatbot updated successfully. Local-only: {request.local_only}, Reranking: {request.reranking}"
        )

        return {
            "status": "success",
            "message": f"Chatbot '{request.chatbot_name}' updated successfully",
            "chatbot_id": chatbot_id,
        }

    except Exception as e:
        logger.error(f"Error updating chatbot: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/list")
async def list_chatbots():
    """
    List all available chatbots
    """
    try:
        mongodb_client = MongoDBClient.get_instance()
        chatbots = mongodb_client.get_all_documents(collection_name="chatbots")

        chatbot_list = [
            {
                "id": str(chatbot.get("_id")),
                "name": chatbot.get("chatbot_name"),
                "workflow": chatbot.get("workflow"),
                "llm": chatbot.get("llm"),
                "llm_provider": chatbot.get("llm_provider", "openai"),
                "collections": chatbot.get("collections", []),
                "local_only": chatbot.get("local_only", False),
                "reranking": chatbot.get("reranking", False),
                "reranker_provider": chatbot.get("reranker_provider", "cohere"),
                "reranker_model": chatbot.get("reranker_model", "rerank-v3.5"),
                "created_at": chatbot.get("created_at"),
                "precise_citation": chatbot.get("precise_citation", False),
            }
            for chatbot in chatbots
        ]

        return {"chatbots": chatbot_list}

    except Exception as e:
        logger.error(f"Error listing chatbots: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{chatbot_id}")
async def get_chatbot(chatbot_id: str):
    """
    Get a specific chatbot configuration by ID
    """
    try:
        mongodb_client = MongoDBClient.get_instance()
        from bson.objectid import ObjectId

        chatbots = mongodb_client.get_docs(
            filter={"_id": ObjectId(chatbot_id)}, collection_name="chatbots"
        )

        if not chatbots:
            raise HTTPException(status_code=404, detail="Chatbot not found")

        chatbot = chatbots[0]
        chatbot["_id"] = str(chatbot["_id"])

        return {"chatbot": chatbot}

    except Exception as e:
        logger.error(f"Error retrieving chatbot: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{chatbot_id}")
async def delete_chatbot(chatbot_id: str):
    """
    Delete a chatbot configuration
    """
    try:
        mongodb_client = MongoDBClient.get_instance()
        from bson.objectid import ObjectId

        result = mongodb_client.delete_documents(
            filter_query={"_id": ObjectId(chatbot_id)}, collection_name="chatbots"
        )

        if result == 0:
            raise HTTPException(status_code=404, detail="Chatbot not found")

        return {"status": "success", "message": "Chatbot deleted successfully"}

    except Exception as e:
        logger.error(f"Error deleting chatbot: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
