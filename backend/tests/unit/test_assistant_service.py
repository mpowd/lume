# tests/unit/test_assistant_service.py
from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from backend.schemas.assistant import (
    AssistantCreateRequest,
    AssistantResponse,
    AssistantUpdateRequest,
)
from backend.services.assistant_service import (
    AssistantInactiveError,
    AssistantNotFoundError,
    AssistantService,
    AssistantValidationError,
)

# ── Fixtures ──────────────────────────────────────────────


@pytest.fixture
def mock_repo():
    return MagicMock()


@pytest.fixture
def service(mock_repo):
    return AssistantService(repo=mock_repo)


@pytest.fixture
def sample_response():
    """A typical AssistantResponse as returned by the repo"""
    return AssistantResponse(
        id="507f1f77bcf86cd799439011",
        name="Test QA Bot",
        description="A test assistant",
        type="qa",
        config={
            "llm_model": "gpt-4o-mini",
            "llm_provider": "openai",
            "knowledge_base_ids": [],
            "references": [],
        },
        created_by="system",
        created_at=datetime(2025, 1, 1, tzinfo=UTC),
        updated_at=datetime(2025, 1, 1, tzinfo=UTC),
        is_active=True,
    )


@pytest.fixture
def inactive_response(sample_response):
    """An inactive assistant"""
    return sample_response.model_copy(update={"is_active": False})


# ── Create ────────────────────────────────────────────────


class TestCreate:
    @patch("backend.services.assistant_service.AssistantRegistry")
    def test_creates_valid_assistant(
        self, mock_registry, service, mock_repo, sample_response
    ):
        mock_registry.list_types.return_value = ["qa"]
        mock_instance = MagicMock()
        mock_registry.create_instance.return_value = mock_instance
        mock_repo.insert.return_value = sample_response

        request = AssistantCreateRequest(
            name="Test QA Bot",
            type="qa",
            config={
                "llm_model": "gpt-4o-mini",
                "llm_provider": "openai",
                "knowledge_base_ids": [],
                "references": [],
            },
        )

        result = service.create(request)

        assert isinstance(result, AssistantResponse)
        assert result.name == "Test QA Bot"
        mock_repo.insert.assert_called_once()

    @patch("backend.services.assistant_service.AssistantRegistry")
    def test_rejects_unknown_type(self, mock_registry, service):
        mock_registry.list_types.return_value = ["qa"]

        request = AssistantCreateRequest(name="Bot", type="nonexistent", config={})

        with pytest.raises(AssistantValidationError, match="Unknown assistant type"):
            service.create(request)

    @patch("backend.services.assistant_service.AssistantRegistry")
    def test_rejects_invalid_config(self, mock_registry, service):
        mock_registry.list_types.return_value = ["qa"]
        mock_instance = MagicMock()
        mock_instance.get_config_schema.return_value = MagicMock(
            side_effect=ValueError("missing field")
        )
        mock_registry.create_instance.return_value = mock_instance

        request = AssistantCreateRequest(
            name="Bot", type="qa", config={"bad": "config"}
        )

        with pytest.raises(AssistantValidationError, match="Invalid configuration"):
            service.create(request)


# ── Get ───────────────────────────────────────────────────


class TestGet:
    def test_returns_assistant(self, service, mock_repo, sample_response):
        mock_repo.find_by_id.return_value = sample_response

        result = service.get("507f1f77bcf86cd799439011")

        assert result.id == "507f1f77bcf86cd799439011"
        assert result.name == "Test QA Bot"

    def test_raises_when_not_found(self, service, mock_repo):
        mock_repo.find_by_id.return_value = None

        with pytest.raises(AssistantNotFoundError):
            service.get("nonexistent_id")


# ── List ──────────────────────────────────────────────────


class TestListAssistants:
    def test_returns_all(self, service, mock_repo, sample_response):
        mock_repo.find_all.return_value = [sample_response, sample_response]

        result = service.list_assistants()

        assert len(result) == 2
        mock_repo.find_all.assert_called_once_with(assistant_type=None, is_active=None)

    def test_passes_filters_to_repo(self, service, mock_repo):
        mock_repo.find_all.return_value = []

        service.list_assistants(assistant_type="qa", is_active=True)

        mock_repo.find_all.assert_called_once_with(assistant_type="qa", is_active=True)

    def test_returns_empty_list(self, service, mock_repo):
        mock_repo.find_all.return_value = []

        result = service.list_assistants()

        assert result == []


# ── Update ────────────────────────────────────────────────


class TestUpdate:
    @patch("backend.services.assistant_service.AssistantRegistry")
    def test_updates_assistant(
        self, mock_registry, service, mock_repo, sample_response
    ):
        mock_repo.find_by_id.return_value = sample_response
        updated = sample_response.model_copy(update={"name": "Updated"})
        mock_repo.update.return_value = updated

        request = AssistantUpdateRequest(name="Updated")
        result = service.update("507f1f77bcf86cd799439011", request)

        assert result.name == "Updated"

    @patch("backend.services.assistant_service.AssistantRegistry")
    def test_validates_config_on_update(
        self, mock_registry, service, mock_repo, sample_response
    ):
        mock_repo.find_by_id.return_value = sample_response
        mock_registry.list_types.return_value = ["qa"]

        mock_instance = MagicMock()
        mock_instance.get_config_schema.return_value = MagicMock(
            side_effect=ValueError("bad config")
        )
        mock_registry.create_instance.return_value = mock_instance

        request = AssistantUpdateRequest(config={"bad": "config"})

        with pytest.raises(AssistantValidationError, match="Invalid configuration"):
            service.update("507f1f77bcf86cd799439011", request)

    def test_raises_when_not_found(self, service, mock_repo):
        mock_repo.find_by_id.return_value = None

        request = AssistantUpdateRequest(name="Updated")

        with pytest.raises(AssistantNotFoundError):
            service.update("nonexistent_id", request)

    def test_clears_instance_cache(self, service, mock_repo, sample_response):
        mock_repo.find_by_id.return_value = sample_response
        mock_repo.update.return_value = sample_response

        # Pre-populate cache
        service._instance_cache["507f1f77bcf86cd799439011"] = MagicMock()

        request = AssistantUpdateRequest(name="Updated")
        service.update("507f1f77bcf86cd799439011", request)

        assert "507f1f77bcf86cd799439011" not in service._instance_cache


# ── Delete ────────────────────────────────────────────────


class TestDelete:
    def test_deletes_assistant(self, service, mock_repo):
        mock_repo.delete.return_value = True

        result = service.delete("507f1f77bcf86cd799439011")

        assert result is True
        mock_repo.delete.assert_called_once_with("507f1f77bcf86cd799439011")

    def test_raises_when_not_found(self, service, mock_repo):
        mock_repo.delete.return_value = False

        with pytest.raises(AssistantNotFoundError):
            service.delete("nonexistent_id")

    def test_clears_instance_cache(self, service, mock_repo):
        mock_repo.delete.return_value = True
        service._instance_cache["507f1f77bcf86cd799439011"] = MagicMock()

        service.delete("507f1f77bcf86cd799439011")

        assert "507f1f77bcf86cd799439011" not in service._instance_cache


# ── Execute ───────────────────────────────────────────────


class TestExecute:
    @pytest.mark.asyncio
    @patch("backend.services.assistant_service.AssistantRegistry")
    async def test_executes_successfully(
        self, mock_registry, service, mock_repo, sample_response
    ):
        mock_repo.find_by_id.return_value = sample_response

        mock_instance = MagicMock()
        mock_instance.get_input_schema.return_value = MagicMock(
            return_value=MagicMock()
        )
        mock_instance.get_config_schema.return_value = MagicMock(
            return_value=MagicMock()
        )
        mock_instance.execute = AsyncMock(
            return_value=MagicMock(model_dump=lambda: {"answer": "42"})
        )
        mock_registry.create_instance.return_value = mock_instance

        result = await service.execute(
            "507f1f77bcf86cd799439011", {"question": "What?"}
        )

        assert result["status"] == "completed"
        assert result["output"]["answer"] == "42"
        assert result["execution_time"] > 0

    @pytest.mark.asyncio
    async def test_raises_when_not_found(self, service, mock_repo):
        mock_repo.find_by_id.return_value = None

        with pytest.raises(AssistantNotFoundError):
            await service.execute("nonexistent", {"question": "What?"})

    @pytest.mark.asyncio
    async def test_raises_when_inactive(self, service, mock_repo, inactive_response):
        mock_repo.find_by_id.return_value = inactive_response

        with pytest.raises(AssistantInactiveError):
            await service.execute("507f1f77bcf86cd799439011", {"question": "What?"})


# ── Schema / Types ────────────────────────────────────────


class TestSchemaQueries:
    @patch("backend.services.assistant_service.AssistantRegistry")
    def test_list_types(self, mock_registry, service):
        mock_registry.list_types.return_value = ["qa", "chat"]

        result = service.list_types()

        assert result == ["qa", "chat"]

    @patch("backend.services.assistant_service.AssistantRegistry")
    def test_get_schemas_valid_type(self, mock_registry, service):
        mock_registry.list_types.return_value = ["qa"]
        mock_registry.get_schemas.return_value = {
            "config_schema": {},
            "input_schema": {},
        }

        result = service.get_schemas("qa")

        assert "config_schema" in result

    @patch("backend.services.assistant_service.AssistantRegistry")
    def test_get_schemas_invalid_type(self, mock_registry, service):
        mock_registry.list_types.return_value = ["qa"]

        with pytest.raises(AssistantValidationError):
            service.get_schemas("nonexistent")
