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
    def get_config_schema(self) -> type[BaseModel]: ...

    @abstractmethod
    def get_input_schema(self) -> type[BaseModel]: ...

    @abstractmethod
    def execute(
        self, config: Any, input_data: Any, stream: bool = False
    ) -> AsyncIterator[Any]:
        """
        Execute the assistant logic.

        When stream=False: yields a single AssistantOutput.
        When stream=True: yields str tokens, then a final metadata dict.
        """
        ...

    @abstractmethod
    def supports_evaluation(self) -> bool: ...

    def validate_config(self, config: dict[str, Any]) -> bool:
        schema = self.get_config_schema()
        try:
            schema(**config)
            return True
        except Exception:
            return False
