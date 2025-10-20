"""
Registry for all assistant types
"""

from typing import Dict, Type, List, Any
from .base import BaseAssistant
import logging

logger = logging.getLogger(__name__)


class AssistantRegistry:
    """Registry for all assistant types"""

    _assistants: Dict[str, Type[BaseAssistant]] = {}

    @classmethod
    def register(cls, assistant_type: str):
        """Decorator to register assistant types"""

        def wrapper(assistant_class: Type[BaseAssistant]):
            cls._assistants[assistant_type] = assistant_class
            logger.info(f"Registered assistant type: {assistant_type}")
            return assistant_class

        return wrapper

    @classmethod
    def get(cls, assistant_type: str) -> Type[BaseAssistant]:
        """Get assistant class by type"""
        if assistant_type not in cls._assistants:
            raise ValueError(f"Unknown assistant type: {assistant_type}")
        return cls._assistants[assistant_type]

    @classmethod
    def list_types(cls) -> List[str]:
        """List all registered assistant types"""
        return list(cls._assistants.keys())

    @classmethod
    def get_schemas(cls, assistant_type: str) -> Dict[str, Any]:
        """Get configuration and input schemas for an assistant type"""
        assistant_class = cls.get(assistant_type)
        instance = assistant_class()
        return {
            "config_schema": instance.get_config_schema().model_json_schema(),
            "input_schema": instance.get_input_schema().model_json_schema(),
            "supports_evaluation": instance.supports_evaluation(),
        }

    @classmethod
    def create_instance(cls, assistant_type: str) -> BaseAssistant:
        """Create an instance of an assistant"""
        assistant_class = cls.get(assistant_type)
        return assistant_class()
