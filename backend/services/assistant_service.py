"""
Service layer for assistant business logic
"""

import logging
import time
from typing import Any

from backend.core.assistants.base import BaseAssistant
from backend.core.assistants.registry import AssistantRegistry
from backend.db.repositories.assistant_repo import AssistantRepository
from backend.schemas.assistant import (
    AssistantCreateRequest,
    AssistantResponse,
    AssistantUpdateRequest,
)

logger = logging.getLogger(__name__)


class AssistantNotFoundError(Exception):
    def __init__(self, assistant_id: str):
        self.assistant_id = assistant_id
        super().__init__(f"Assistant '{assistant_id}' not found")


class AssistantValidationError(Exception):
    pass


class AssistantInactiveError(Exception):
    pass


class AssistantService:
    """Service for managing and executing assistants"""

    def __init__(self, repo: AssistantRepository):
        self.repo = repo
        self._instance_cache: dict[str, BaseAssistant] = {}

    # ── CRUD ──────────────────────────────────────────────

    def create(self, request: AssistantCreateRequest) -> AssistantResponse:
        """Create a new assistant"""
        self._validate_type(request.type)
        self._validate_config(request.type, request.config)
        return self.repo.insert(request.model_dump())

    def get(self, assistant_id: str) -> AssistantResponse:
        """Get assistant by ID"""
        assistant = self.repo.find_by_id(assistant_id)
        if not assistant:
            raise AssistantNotFoundError(assistant_id)
        return assistant

    def list_assistants(
        self,
        assistant_type: str | None = None,
        is_active: bool | None = None,
    ) -> list[AssistantResponse]:
        """List assistants with optional filters"""
        return self.repo.find_all(assistant_type=assistant_type, is_active=is_active)

    def update(
        self, assistant_id: str, request: AssistantUpdateRequest
    ) -> AssistantResponse:
        """Update an assistant"""
        existing = self.get(assistant_id)  # Raises NotFound if missing

        if request.config is not None:
            self._validate_config(existing.type, request.config)

        self._clear_instance_cache(assistant_id)

        result = self.repo.update(assistant_id, request.model_dump(exclude_unset=True))
        if not result:
            raise AssistantNotFoundError(assistant_id)
        return result

    def delete(self, assistant_id: str) -> bool:
        """Delete an assistant"""
        self._clear_instance_cache(assistant_id)
        if not self.repo.delete(assistant_id):
            raise AssistantNotFoundError(assistant_id)
        return True

    # ── Execution ─────────────────────────────────────────

    async def execute(
        self, assistant_id: str, input_data: dict[str, Any]
    ) -> dict[str, Any]:
        """Execute an assistant"""
        start_time = time.time()

        assistant = self.get(assistant_id)

        if not assistant.is_active:
            raise AssistantInactiveError(f"Assistant '{assistant_id}' is not active")

        instance = self._get_or_create_instance(assistant_id, assistant.type)

        validated_input = self._validate_input(instance, input_data)
        config = instance.get_config_schema()(**assistant.config)

        result = await instance.execute(config, validated_input)
        execution_time = time.time() - start_time

        logger.info(f"Assistant {assistant_id} executed in {execution_time:.2f}s")

        return {
            "status": "completed",
            "output": result.model_dump(),
            "execution_time": execution_time,
            "error": None,
        }

    async def execute_stream(self, assistant_id: str, input_data: dict[str, Any]):
        """Execute an assistant in streaming mode"""
        assistant = self.get(assistant_id)

        if not assistant.is_active:
            raise AssistantInactiveError(f"Assistant '{assistant_id}' is not active")

        instance = self._get_or_create_instance(assistant_id, assistant.type)

        validated_input = self._validate_input(instance, input_data)
        config = instance.get_config_schema()(**assistant.config)

        async for chunk in instance.execute_stream(config, validated_input):
            yield chunk

    # ── Schema / Type queries ─────────────────────────────

    def list_types(self) -> list[str]:
        return AssistantRegistry.list_types()

    def get_schemas(self, assistant_type: str) -> dict[str, Any]:
        self._validate_type(assistant_type)
        return AssistantRegistry.get_schemas(assistant_type)

    # ── Private helpers ───────────────────────────────────

    def _validate_type(self, assistant_type: str) -> None:
        if assistant_type not in AssistantRegistry.list_types():
            raise AssistantValidationError(f"Unknown assistant type: {assistant_type}")

    def _validate_config(self, assistant_type: str, config: dict) -> None:
        instance = AssistantRegistry.create_instance(assistant_type)
        schema = instance.get_config_schema()
        try:
            schema(**config)
        except Exception as e:
            raise AssistantValidationError(f"Invalid configuration: {e}") from e

    def _validate_input(self, instance: BaseAssistant, input_data: dict):
        schema = instance.get_input_schema()
        try:
            return schema(**input_data)
        except Exception as e:
            raise AssistantValidationError(f"Invalid input: {e}") from e

    def _get_or_create_instance(
        self, assistant_id: str, assistant_type: str
    ) -> BaseAssistant:
        if assistant_id not in self._instance_cache:
            self._instance_cache[assistant_id] = AssistantRegistry.create_instance(
                assistant_type
            )
        return self._instance_cache[assistant_id]

    def _clear_instance_cache(self, assistant_id: str) -> None:
        self._instance_cache.pop(assistant_id, None)
