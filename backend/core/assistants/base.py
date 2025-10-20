"""
Base classes for all assistant types
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field
from datetime import datetime


class AssistantConfig(BaseModel):
    """Base configuration for all assistants"""

    name: str
    description: Optional[str] = ""
    type: str
    created_by: str = "system"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True


class AssistantInput(BaseModel):
    """Base input for assistant execution"""

    pass


class AssistantOutput(BaseModel):
    """Base output from assistant execution"""

    result: Any
    metadata: Dict[str, Any] = Field(default_factory=dict)


class BaseAssistant(ABC):
    """Base class for all assistant types"""

    assistant_type: str = "base"

    @abstractmethod
    def get_config_schema(self) -> type[BaseModel]:
        """Return the Pydantic schema for configuration"""
        pass

    @abstractmethod
    def get_input_schema(self) -> type[BaseModel]:
        """Return the Pydantic schema for runtime input"""
        pass

    @abstractmethod
    async def execute(
        self, config: AssistantConfig, input_data: AssistantInput
    ) -> AssistantOutput:
        """Execute the assistant logic"""
        pass

    @abstractmethod
    def supports_evaluation(self) -> bool:
        """Whether this assistant type can be evaluated"""
        pass

    def validate_config(self, config: Dict[str, Any]) -> bool:
        """Validate assistant configuration"""
        schema = self.get_config_schema()
        try:
            schema(**config)
            return True
        except Exception:
            return False
