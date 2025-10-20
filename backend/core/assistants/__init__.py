"""
Initialize all assistant types
Import this module to register all assistants
"""

from .base import BaseAssistant, AssistantConfig, AssistantInput, AssistantOutput
from .registry import AssistantRegistry
from .qa_assistant import QAAssistant

__all__ = [
    "BaseAssistant",
    "AssistantConfig",
    "AssistantInput",
    "AssistantOutput",
    "AssistantRegistry",
    "QAAssistant",
]
