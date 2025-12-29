"""
Service layer for assistant business logic
"""

from typing import Dict, Any, List, Optional
from backend.db.repositories.assistant_repo import AssistantRepository
from backend.core.assistants.registry import AssistantRegistry
from backend.core.assistants.base import BaseAssistant
import logging
import time

logger = logging.getLogger(__name__)


class AssistantService:
    """Service for managing and executing assistants"""

    def __init__(self):
        self.repository = AssistantRepository()
        self._assistant_instances = {}  # Cache for assistant instances

    def create_assistant(self, assistant_data: Dict[str, Any]) -> str:
        """Create a new assistant"""

        # Validate assistant type
        assistant_type = assistant_data.get("type")
        if assistant_type not in AssistantRegistry.list_types():
            raise ValueError(f"Unknown assistant type: {assistant_type}")

        # Validate configuration against schema
        assistant_class = AssistantRegistry.get(assistant_type)
        instance = assistant_class()

        config_schema = instance.get_config_schema()
        try:
            config_schema(**assistant_data.get("config", {}))
        except Exception as e:
            raise ValueError(f"Invalid configuration: {str(e)}")

        # Create in database
        assistant_id = self.repository.create(assistant_data)

        logger.info(f"Created assistant {assistant_id} of type {assistant_type}")

        return assistant_id

    def get_assistant(self, assistant_id: str) -> Optional[Dict[str, Any]]:
        """Get assistant by ID"""
        return self.repository.get_by_id(assistant_id)

    def list_assistants(
        self, assistant_type: Optional[str] = None, is_active: Optional[bool] = None
    ) -> List[Dict[str, Any]]:
        """List assistants with optional filters"""

        filter_query = {}
        if assistant_type:
            filter_query["type"] = assistant_type
        if is_active is not None:
            filter_query["is_active"] = is_active

        if filter_query:
            return self.repository.get_all(filter_query=filter_query)

        return self.repository.get_all()

    def update_assistant(self, assistant_id: str, update_data: Dict[str, Any]) -> bool:
        """Update an assistant"""

        # Get existing assistant
        existing = self.repository.get_by_id(assistant_id)
        if not existing:
            raise ValueError(f"Assistant {assistant_id} not found")

        # If config is being updated, validate it
        if "config" in update_data:
            assistant_type = existing["type"]
            assistant_class = AssistantRegistry.get(assistant_type)
            instance = assistant_class()

            config_schema = instance.get_config_schema()
            try:
                config_schema(**update_data["config"])
            except Exception as e:
                raise ValueError(f"Invalid configuration: {str(e)}")

        # Clear cached instance
        if assistant_id in self._assistant_instances:
            del self._assistant_instances[assistant_id]

        return self.repository.update(assistant_id, update_data)

    def delete_assistant(self, assistant_id: str) -> bool:
        """Delete an assistant"""

        # Clear cached instance
        if assistant_id in self._assistant_instances:
            del self._assistant_instances[assistant_id]

        return self.repository.delete(assistant_id)

    def get_assistant_instance(self, assistant_id: str) -> BaseAssistant:
        """Get or create assistant instance"""

        if assistant_id in self._assistant_instances:
            logger.info(f"Using cached instance for assistant {assistant_id}")
            return self._assistant_instances[assistant_id]

        # Get assistant configuration
        assistant_data = self.repository.get_by_id(assistant_id)
        if not assistant_data:
            raise ValueError(f"Assistant {assistant_id} not found")

        # Create instance
        assistant_type = assistant_data["type"]
        instance = AssistantRegistry.create_instance(assistant_type)

        # Cache instance
        self._assistant_instances[assistant_id] = instance

        logger.info(f"Created new instance for assistant {assistant_id}")

        return instance

    async def execute_assistant(
        self, assistant_id: str, input_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute an assistant"""

        start_time = time.time()

        try:
            # Get assistant data and instance
            assistant_data = self.repository.get_by_id(assistant_id)
            if not assistant_data:
                raise ValueError(f"Assistant {assistant_id} not found")

            if not assistant_data.get("is_active", True):
                raise ValueError(f"Assistant {assistant_id} is not active")

            instance = self.get_assistant_instance(assistant_id)

            # Validate input
            input_schema = instance.get_input_schema()
            try:
                validated_input = input_schema(**input_data)
            except Exception as e:
                raise ValueError(f"Invalid input: {str(e)}")

            # Parse config
            config_schema = instance.get_config_schema()
            config = config_schema(**assistant_data["config"])

            # Execute
            logger.info(f"Executing assistant {assistant_id}")
            result = await instance.execute(config, validated_input)

            execution_time = time.time() - start_time

            logger.info(
                f"Assistant {assistant_id} executed successfully "
                f"in {execution_time:.2f}s"
            )

            return {
                "status": "completed",
                "output": result.dict(),
                "execution_time": execution_time,
                "error": None,
            }

        except Exception as e:
            execution_time = time.time() - start_time

            logger.error(
                f"Error executing assistant {assistant_id}: {str(e)}", exc_info=True
            )

            return {
                "status": "failed",
                "output": {},
                "execution_time": execution_time,
                "error": str(e),
            }

    async def execute_assistant_stream(self, assistant_id, input_data):
        try:

            assistant_data = self.repository.get_by_id(assistant_id)

            if not assistant_data:
                raise ValueError(f"Assistant {assistant_id} not found")

            if not assistant_data.get("is_active", True):
                raise ValueError(f"ASsistant {assistant_id} is not active")

            instance = self.get_assistant_instance(assistant_id)
            input_schema = instance.get_input_schema()
            try:
                validated_input = input_schema(**input_data)
            except Exception as e:
                raise ValueError(f"Invalid Input: {str(e)}")

            config_schema = instance.get_config_schema()
            config = config_schema(**assistant_data["config"])

            async for chunk in instance.execute_stream(config, validated_input):
                yield chunk

        except Exception as e:
            logger.error(f"Error executing assistant: {str(e)}", exc_info=True)

    def get_assistant_schemas(self, assistant_type: str) -> Dict[str, Any]:
        """Get schemas for an assistant type"""
        return AssistantRegistry.get_schemas(assistant_type)

    def list_assistant_types(self) -> List[str]:
        """List all available assistant types"""
        return AssistantRegistry.list_types()


# Singleton instance
_service_instance = None


def get_assistant_service() -> AssistantService:
    """Get or create the assistant service singleton"""
    global _service_instance
    if _service_instance is None:
        _service_instance = AssistantService()
    return _service_instance
