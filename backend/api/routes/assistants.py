"""
API routes for assistant management and execution.
"""

import json
import logging

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse

from backend.app.dependencies import get_assistant_service, get_conversation_repo
from backend.db.repositories.conversation_repo import ConversationRepository
from backend.schemas.assistant import (
    AssistantCreateRequest,
    AssistantResponse,
    AssistantUpdateRequest,
    ExecutionRequest,
    ExecutionResponse,
)
from backend.schemas.conversation import ConversationDetail, ConversationListItem
from backend.services.assistant_service import AssistantService

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/", response_model=list[AssistantResponse], operation_id="listAssistants")
async def list_assistants(
    type: str | None = Query(None),
    is_active: bool | None = Query(None),
    service: AssistantService = Depends(get_assistant_service),
):
    return service.list_assistants(assistant_type=type, is_active=is_active)


@router.post(
    "/",
    response_model=AssistantResponse,
    status_code=201,
    operation_id="createAssistant",
)
async def create_assistant(
    request: AssistantCreateRequest,
    service: AssistantService = Depends(get_assistant_service),
):
    return service.create(request)


@router.get("/types/list", operation_id="listAssistantTypes")
async def list_assistant_types(
    service: AssistantService = Depends(get_assistant_service),
):
    return {"types": service.list_types()}


@router.get("/types/{assistant_type}/schema", operation_id="getAssistantTypeSchema")
async def get_assistant_type_schema(
    assistant_type: str,
    service: AssistantService = Depends(get_assistant_service),
):
    return service.get_schemas(assistant_type)


@router.get(
    "/{assistant_id}/conversations",
    response_model=list[ConversationListItem],
    operation_id="listConversations",
)
async def list_conversations(
    assistant_id: str,
    limit: int = Query(50, ge=1, le=200),
    repo: ConversationRepository = Depends(get_conversation_repo),
):
    return repo.list_by_assistant(assistant_id, limit=limit)


@router.get(
    "/{assistant_id}/conversations/{session_id}",
    response_model=ConversationDetail,
    operation_id="getConversation",
)
async def get_conversation(
    assistant_id: str,
    session_id: str,
    repo: ConversationRepository = Depends(get_conversation_repo),
):
    doc = repo.get_session(session_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {
        "session_id": doc["session_id"],
        "title": doc.get("title"),
        "created_at": doc.get("created_at"),
        "updated_at": doc.get("updated_at"),
        "messages": doc.get("messages", []),
    }


@router.delete(
    "/{assistant_id}/conversations/{session_id}",
    status_code=204,
    operation_id="deleteConversation",
)
async def delete_conversation(
    assistant_id: str,
    session_id: str,
    repo: ConversationRepository = Depends(get_conversation_repo),
):
    repo.clear(session_id)


@router.post(
    "/{assistant_id}/execute",
    response_model=ExecutionResponse,
    operation_id="executeAssistant",
)
async def execute_assistant(
    assistant_id: str,
    request: ExecutionRequest,
    service: AssistantService = Depends(get_assistant_service),
):
    result = await service.execute(assistant_id, request.input_data)
    return ExecutionResponse(**result)


@router.post(
    "/{assistant_id}/execute-stream",
    operation_id="executeAssistantStream",
)
async def execute_assistant_stream(
    assistant_id: str,
    request: ExecutionRequest,
    service: AssistantService = Depends(get_assistant_service),
):
    async def event_generator():
        async for chunk in service.execute_stream(assistant_id, request.input_data):
            if isinstance(chunk, str):
                yield f"data: {json.dumps({'token': chunk})}\n\n"
            else:
                yield f"data: {json.dumps(chunk)}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


# ── 3. /{assistant_id} — catch-all LAST ───────────────────────────────────────


@router.get(
    "/{assistant_id}",
    response_model=AssistantResponse,
    operation_id="getAssistant",
)
async def get_assistant(
    assistant_id: str,
    service: AssistantService = Depends(get_assistant_service),
):
    return service.get(assistant_id)


@router.put(
    "/{assistant_id}",
    response_model=AssistantResponse,
    operation_id="updateAssistant",
)
async def update_assistant(
    assistant_id: str,
    request: AssistantUpdateRequest,
    service: AssistantService = Depends(get_assistant_service),
):
    return service.update(assistant_id, request)


@router.delete(
    "/{assistant_id}",
    status_code=204,
    operation_id="deleteAssistant",
)
async def delete_assistant(
    assistant_id: str,
    service: AssistantService = Depends(get_assistant_service),
):
    service.delete(assistant_id)
