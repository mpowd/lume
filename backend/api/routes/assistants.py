"""
API routes for assistant management
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List
from backend.schemas.assistant import (
    AssistantCreateRequest,
    AssistantUpdateRequest,
    AssistantResponse,
    AssistantListResponse,
)
from backend.services.assistant_service import get_assistant_service
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/", response_model=AssistantResponse)
async def create_assistant(request: AssistantCreateRequest):
    """Create a new assistant"""
    try:
        service = get_assistant_service()

        assistant_data = request.dict()
        assistant_id = service.create_assistant(assistant_data)

        # Get created assistant
        assistant = service.get_assistant(assistant_id)

        return AssistantResponse(
            id=assistant["_id"],
            name=assistant["name"],
            description=assistant.get("description", ""),
            type=assistant["type"],
            config=assistant["config"],
            created_by=assistant.get("created_by", "system"),
            created_at=assistant["created_at"],
            updated_at=assistant["updated_at"],
            is_active=assistant.get("is_active", True),
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating assistant: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/", response_model=AssistantListResponse)
async def list_assistants(
    type: Optional[str] = Query(None, description="Filter by assistant type"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
):
    """List all assistants"""
    try:
        service = get_assistant_service()
        assistants = service.list_assistants(assistant_type=type, is_active=is_active)

        assistant_responses = [
            AssistantResponse(
                id=a["_id"],
                name=a["name"],
                description=a.get("description", ""),
                type=a["type"],
                config=a["config"],
                created_by=a.get("created_by", "system"),
                created_at=a["created_at"],
                updated_at=a["updated_at"],
                is_active=a.get("is_active", True),
            )
            for a in assistants
        ]

        return AssistantListResponse(assistants=assistant_responses)

    except Exception as e:
        logger.error(f"Error listing assistants: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{assistant_id}", response_model=AssistantResponse)
async def get_assistant(assistant_id: str):
    """Get a specific assistant"""
    try:
        service = get_assistant_service()
        assistant = service.get_assistant(assistant_id)

        if not assistant:
            raise HTTPException(status_code=404, detail="Assistant not found")

        return AssistantResponse(
            id=assistant["_id"],
            name=assistant["name"],
            description=assistant.get("description", ""),
            type=assistant["type"],
            config=assistant["config"],
            created_by=assistant.get("created_by", "system"),
            created_at=assistant["created_at"],
            updated_at=assistant["updated_at"],
            is_active=assistant.get("is_active", True),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting assistant: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{assistant_id}", response_model=AssistantResponse)
async def update_assistant(assistant_id: str, request: AssistantUpdateRequest):
    """Update an assistant"""
    try:
        service = get_assistant_service()

        update_data = request.dict(exclude_unset=True)

        success = service.update_assistant(assistant_id, update_data)

        if not success:
            raise HTTPException(status_code=404, detail="Assistant not found")

        # Get updated assistant
        assistant = service.get_assistant(assistant_id)

        return AssistantResponse(
            id=assistant["_id"],
            name=assistant["name"],
            description=assistant.get("description", ""),
            type=assistant["type"],
            config=assistant["config"],
            created_by=assistant.get("created_by", "system"),
            created_at=assistant["created_at"],
            updated_at=assistant["updated_at"],
            is_active=assistant.get("is_active", True),
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating assistant: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{assistant_id}")
async def delete_assistant(assistant_id: str):
    """Delete an assistant"""
    try:
        service = get_assistant_service()

        success = service.delete_assistant(assistant_id)

        if not success:
            raise HTTPException(status_code=404, detail="Assistant not found")

        return {"status": "success", "message": "Assistant deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting assistant: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/types/list")
async def list_assistant_types():
    """List all available assistant types"""
    try:
        service = get_assistant_service()
        types = service.list_assistant_types()

        return {"types": types}

    except Exception as e:
        logger.error(f"Error listing assistant types: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/types/{assistant_type}/schema")
async def get_assistant_type_schema(assistant_type: str):
    """Get schemas for a specific assistant type"""
    try:
        service = get_assistant_service()
        schemas = service.get_assistant_schemas(assistant_type)

        return schemas

    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error getting schemas: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
