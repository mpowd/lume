from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
import logging
from typing import Optional, List, Dict, Any
from backend.app.core.services.chatbot_service import get_chatbot_service

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()


class SourceUrl(BaseModel):
    url: str
    score: float = 0.5


class ChatRequest(BaseModel):
    query: str
    chatbot_id: Optional[str] = None


class ChatResponse(BaseModel):
    response: str
    contexts: List[str] = []
    source_urls: List[SourceUrl] = []


@router.post("/", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Process a chat request with either the default or a specific chatbot
    """
    try:
        logger.info(f"Received chat query: {request.query}")

        chatbot_service = get_chatbot_service()

        chatbot_id = request.chatbot_id
        if not chatbot_id:

            raise HTTPException(
                status_code=400,
                detail="No chatbot specified. Please provide a chatbot_id",
            )

        result = await chatbot_service.process_query(chatbot_id, request.query)
        logger.info(f"Generated response for query: {request.query}")

        if not isinstance(result, dict):
            return ChatResponse(response=str(result), contexts=[], source_urls=[])

        response = result.get("response", "No response generated")
        if isinstance(response, list):
            response = (
                "\n".join(response)
                if all(isinstance(item, str) for item in response)
                else str(response)
            )

        return ChatResponse(
            response=response,
            contexts=result.get("contexts", []),
            source_urls=result.get("source_urls", []),
        )

    except Exception as e:
        logger.error(f"Error in chat endpoint: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error processing chat: {str(e)}")


@router.get("/chatbots")
async def list_available_chatbots():
    """
    List all available chatbots for the user to choose from
    """
    try:
        from backend.db.mongodb import MongoDBClient

        mongodb_client = MongoDBClient.get_instance()

        chatbots = mongodb_client.get_all_documents(collection_name="chatbots")

        chatbot_list = [
            {
                "id": str(chatbot.get("_id")),
                "name": chatbot.get("chatbot_name", "Unnamed Chatbot"),
                "workflow": chatbot.get("workflow", "linear"),
                "llm": chatbot.get("llm", "Unknown"),
            }
            for chatbot in chatbots
        ]

        return {"chatbots": chatbot_list}

    except Exception as e:
        logger.error(f"Error listing chatbots: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
