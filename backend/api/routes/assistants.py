"""
API routes for assistant management and execution
"""

import json
import logging

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse

from backend.app.dependencies import get_assistant_service
from backend.schemas.assistant import (
    AssistantCreateRequest,
    AssistantResponse,
    AssistantUpdateRequest,
    ExecutionRequest,
    ExecutionResponse,
)
from backend.services.assistant_service import AssistantService

logger = logging.getLogger(__name__)

router = APIRouter()


# ── CRUD ──────────────────────────────────────────────────


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
    """Create a new assistant"""
    return service.create(request)


@router.get("/", response_model=list[AssistantResponse], operation_id="listAssistants")
async def list_assistants(
    type: str | None = Query(None, description="Filter by assistant type"),
    is_active: bool | None = Query(None, description="Filter by active status"),
    service: AssistantService = Depends(get_assistant_service),
):
    """List all assistants"""
    return service.list_assistants(assistant_type=type, is_active=is_active)


@router.get(
    "/{assistant_id}", response_model=AssistantResponse, operation_id="getAssistant"
)
async def get_assistant(
    assistant_id: str,
    service: AssistantService = Depends(get_assistant_service),
):
    """Get a specific assistant"""
    return service.get(assistant_id)


@router.put(
    "/{assistant_id}", response_model=AssistantResponse, operation_id="updateAssistant"
)
async def update_assistant(
    assistant_id: str,
    request: AssistantUpdateRequest,
    service: AssistantService = Depends(get_assistant_service),
):
    """Update an assistant"""
    return service.update(assistant_id, request)


@router.delete("/{assistant_id}", status_code=204, operation_id="deleteAssistant")
async def delete_assistant(
    assistant_id: str,
    service: AssistantService = Depends(get_assistant_service),
):
    """Delete an assistant"""
    service.delete(assistant_id)


# ── Types & Schemas ───────────────────────────────────────


@router.get("/types/list", operation_id="listAssistantTypes")
async def list_assistant_types(
    service: AssistantService = Depends(get_assistant_service),
):
    """List all available assistant types"""
    return {"types": service.list_types()}


@router.get("/types/{assistant_type}/schema", operation_id="getAssistantTypeSchema")
async def get_assistant_type_schema(
    assistant_type: str,
    service: AssistantService = Depends(get_assistant_service),
):
    """Get schemas for a specific assistant type"""
    return service.get_schemas(assistant_type)


# ── Execution ─────────────────────────────────────────────


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
    """Execute an assistant"""
    result = await service.execute(assistant_id, request.input_data)
    return ExecutionResponse(**result)


@router.post("/{assistant_id}/execute-stream", operation_id="executeAssistantStream")
async def execute_assistant_stream(
    assistant_id: str,
    request: ExecutionRequest,
    service: AssistantService = Depends(get_assistant_service),
):
    """Execute an assistant in streaming mode"""

    async def event_generator():
        async for chunk in service.execute_stream(assistant_id, request.input_data):
            if isinstance(chunk, str):
                yield f"data: {json.dumps({'token': chunk})}\n\n"
            else:
                yield f"data: {json.dumps(chunk)}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")
