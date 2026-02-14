"""
Base classes for all assistant types
"""

from abc import ABC, abstractmethod
from collections.abc import AsyncIterator
from typing import Any

from pydantic import BaseModel, Field


class AssistantConfig(BaseModel):
    """Base configuration for all assistants"""

    pass


class AssistantInput(BaseModel):
    """Base input for assistant execution"""

    pass


class AssistantOutput(BaseModel):
    """Base output from assistant execution"""

    result: Any
    metadata: dict[str, Any] = Field(default_factory=dict)


class BaseAssistant(ABC):
    """Base class for all assistant types"""

    assistant_type: str = "base"

    @abstractmethod
    def get_config_schema(self) -> type[AssistantConfig]:
        """Return the Pydantic schema for configuration"""
        pass

    @abstractmethod
    def get_input_schema(self) -> type[AssistantInput]:
        """Return the Pydantic schema for runtime input"""
        pass

    @abstractmethod
    async def execute(
        self, config: AssistantConfig, input_data: AssistantInput
    ) -> AssistantOutput:
        """Execute the assistant logic"""
        pass

    @abstractmethod
    async def execute_stream(
        self, config: AssistantConfig, input_data: AssistantInput
    ) -> AsyncIterator[Any]:
        pass

    @abstractmethod
    def supports_evaluation(self) -> bool:
        """Whether this assistant type can be evaluated"""
        pass

    def validate_config(self, config: dict[str, Any]) -> bool:
        """Validate assistant configuration"""
        schema = self.get_config_schema()
        try:
            schema(**config)
            return True
        except Exception:
            return False
