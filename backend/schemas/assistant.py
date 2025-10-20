"""
API schemas for assistants
"""

from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional
from datetime import datetime


class AssistantCreateRequest(BaseModel):
    """Request to create an assistant"""

    name: str
    description: Optional[str] = ""
    type: str
    config: Dict[str, Any]
    created_by: str = "system"


class AssistantUpdateRequest(BaseModel):
    """Request to update an assistant"""

    name: Optional[str] = None
    description: Optional[str] = None
    config: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None


class AssistantResponse(BaseModel):
    """Response with assistant details"""

    id: str
    name: str
    description: str
    type: str
    config: Dict[str, Any]
    created_by: str
    created_at: datetime
    updated_at: datetime
    is_active: bool


class AssistantListResponse(BaseModel):
    """Response with list of assistants"""

    assistants: List[AssistantResponse]


class ExecutionRequest(BaseModel):
    """Request to execute an assistant"""

    assistant_id: str
    input_data: Dict[str, Any]


class ExecutionResponse(BaseModel):
    """Response from assistant execution"""

    execution_id: Optional[str] = None
    status: str
    output: Dict[str, Any]
    execution_time: Optional[float] = None
    error: Optional[str] = None
