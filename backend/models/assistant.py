"""
Database models for assistants
"""

from datetime import datetime
from typing import Any

from bson import ObjectId
from pydantic import BaseModel, Field


class PyObjectId(ObjectId):
    """Custom type for MongoDB ObjectId"""

    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)

    @classmethod
    def __get_pydantic_json_schema__(cls, schema):
        schema.update(type="string")
        return schema


class AssistantModel(BaseModel):
    """Database model for assistants"""

    id: PyObjectId | None = Field(alias="_id", default=None)
    name: str
    description: str | None = ""
    type: str  # qa, retrieval, image, chatbot
    config: dict[str, Any]
    created_by: str = "system"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class ExecutionModel(BaseModel):
    """Database model for execution history"""

    id: PyObjectId | None = Field(alias="_id", default=None)
    assistant_id: str
    input_data: dict[str, Any]
    output_data: dict[str, Any]
    status: str  # pending, running, completed, failed
    error: str | None = None
    execution_time: float | None = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}
