"""
Database models for assistants
"""

from datetime import datetime
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field
from bson import ObjectId


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

    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    name: str
    description: Optional[str] = ""
    type: str  # qa, retrieval, image, chatbot
    config: Dict[str, Any]
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

    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    assistant_id: str
    input_data: Dict[str, Any]
    output_data: Dict[str, Any]
    status: str  # pending, running, completed, failed
    error: Optional[str] = None
    execution_time: Optional[float] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}
