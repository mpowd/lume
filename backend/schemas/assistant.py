"""
API schemas for assistants
"""

from datetime import datetime
from typing import Any

from pydantic import BaseModel

from backend.core.assistants.qa_assistant import QAAssistantConfig


class AssistantCreateRequest(BaseModel):
    name: str
    description: str | None = ""
    type: str = "qa"
    config: QAAssistantConfig
    created_by: str = "system"


class AssistantUpdateRequest(BaseModel):
    name: str | None = None
    description: str | None = None
    config: QAAssistantConfig | None = None
    is_active: bool | None = None


class AssistantResponse(BaseModel):
    id: str
    name: str
    description: str
    type: str
    config: QAAssistantConfig
    created_by: str
    created_at: datetime
    updated_at: datetime
    is_active: bool


class AssistantListResponse(BaseModel):
    """Response with list of assistants"""

    assistants: list[AssistantResponse]


class ExecutionRequest(BaseModel):
    """Request to execute an assistant"""

    input_data: dict[str, Any]


class ExecutionResponse(BaseModel):
    """Response from assistant execution"""

    execution_id: str | None = None
    status: str
    output: dict[str, Any]
    execution_time: float | None = None
    error: str | None = None
