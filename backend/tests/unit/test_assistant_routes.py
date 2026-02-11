# tests/integration/test_assistant_routes.py
"""
Integration tests for assistant routes.
Tests the full HTTP layer: request → route → service → response
"""

from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi.testclient import TestClient

from backend.app.dependencies import get_assistant_service
from backend.app.main import app
from backend.schemas.assistant import AssistantResponse
from backend.services.assistant_service import (
    AssistantInactiveError,
    AssistantNotFoundError,
    AssistantValidationError,
)

# ── Fixtures ──────────────────────────────────────────────


@pytest.fixture
def sample_response():
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
def mock_service():
    return MagicMock()


@pytest.fixture
def client(mock_service):
    """TestClient with mocked service dependency"""
    app.dependency_overrides[get_assistant_service] = lambda: mock_service
    yield TestClient(app)
    app.dependency_overrides.clear()


# ── POST / (Create) ──────────────────────────────────────


class TestCreateAssistant:
    def test_returns_201_on_success(self, client, mock_service, sample_response):
        mock_service.create.return_value = sample_response

        response = client.post(
            "/assistants/",
            json={
                "name": "Test QA Bot",
                "type": "qa",
                "config": {
                    "llm_model": "gpt-4o-mini",
                    "llm_provider": "openai",
                    "knowledge_base_ids": [],
                    "references": [],
                },
            },
        )

        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Test QA Bot"
        assert data["type"] == "qa"

    def test_returns_400_on_validation_error(self, client, mock_service):
        mock_service.create.side_effect = AssistantValidationError("Unknown type")

        response = client.post(
            "/assistants/",
            json={
                "name": "Bot",
                "type": "bad_type",
                "config": {},
            },
        )

        assert response.status_code == 400
        assert "Unknown type" in response.json()["detail"]

    def test_returns_422_on_missing_fields(self, client):
        response = client.post("/assistants/", json={"name": "Bot"})

        assert response.status_code == 422


# ── GET / (List) ──────────────────────────────────────────


class TestListAssistants:
    def test_returns_list(self, client, mock_service, sample_response):
        mock_service.list_assistants.return_value = [sample_response]

        response = client.get("/assistants/")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["name"] == "Test QA Bot"

    def test_returns_empty_list(self, client, mock_service):
        mock_service.list_assistants.return_value = []

        response = client.get("/assistants/")

        assert response.status_code == 200
        assert response.json() == []

    def test_passes_filters(self, client, mock_service):
        mock_service.list_assistants.return_value = []

        client.get("/assistants/?type=qa&is_active=true")

        mock_service.list_assistants.assert_called_once_with(
            assistant_type="qa", is_active=True
        )


# ── GET /{id} (Get) ──────────────────────────────────────


class TestGetAssistant:
    def test_returns_assistant(self, client, mock_service, sample_response):
        mock_service.get.return_value = sample_response

        response = client.get("/assistants/507f1f77bcf86cd799439011")

        assert response.status_code == 200
        assert response.json()["id"] == "507f1f77bcf86cd799439011"

    def test_returns_404_when_not_found(self, client, mock_service):
        mock_service.get.side_effect = AssistantNotFoundError("nonexistent")

        response = client.get("/assistants/nonexistent")

        assert response.status_code == 404


# ── PUT /{id} (Update) ───────────────────────────────────


class TestUpdateAssistant:
    def test_returns_updated_assistant(self, client, mock_service, sample_response):
        updated = sample_response.model_copy(update={"name": "Updated"})
        mock_service.update.return_value = updated

        response = client.put(
            "/assistants/507f1f77bcf86cd799439011",
            json={
                "name": "Updated",
            },
        )

        assert response.status_code == 200
        assert response.json()["name"] == "Updated"

    def test_returns_404_when_not_found(self, client, mock_service):
        mock_service.update.side_effect = AssistantNotFoundError("nonexistent")

        response = client.put("/assistants/nonexistent", json={"name": "X"})

        assert response.status_code == 404

    def test_returns_400_on_invalid_config(self, client, mock_service):
        mock_service.update.side_effect = AssistantValidationError("bad config")

        response = client.put(
            "/assistants/507f1f77bcf86cd799439011",
            json={
                "config": {"bad": "config"},
            },
        )

        assert response.status_code == 400


# ── DELETE /{id} ──────────────────────────────────────────


class TestDeleteAssistant:
    def test_returns_204_on_success(self, client, mock_service):
        mock_service.delete.return_value = True

        response = client.delete("/assistants/507f1f77bcf86cd799439011")

        assert response.status_code == 204

    def test_returns_404_when_not_found(self, client, mock_service):
        mock_service.delete.side_effect = AssistantNotFoundError("nonexistent")

        response = client.delete("/assistants/nonexistent")

        assert response.status_code == 404


# ── POST /{id}/execute ────────────────────────────────────


class TestExecuteAssistant:
    def test_returns_execution_result(self, client, mock_service):
        mock_service.execute = AsyncMock(
            return_value={
                "status": "completed",
                "output": {"answer": "42"},
                "execution_time": 0.5,
                "error": None,
            }
        )

        response = client.post(
            "/assistants/507f1f77bcf86cd799439011/execute",
            json={"input_data": {"question": "What?"}},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "completed"
        assert data["output"]["answer"] == "42"

    def test_returns_404_when_not_found(self, client, mock_service):
        mock_service.execute = AsyncMock(
            side_effect=AssistantNotFoundError("nonexistent")
        )

        response = client.post(
            "/assistants/nonexistent/execute",
            json={"input_data": {"question": "What?"}},
        )

        assert response.status_code == 404

    def test_returns_400_when_inactive(self, client, mock_service):
        mock_service.execute = AsyncMock(side_effect=AssistantInactiveError("inactive"))

        response = client.post(
            "/assistants/507f1f77bcf86cd799439011/execute",
            json={"input_data": {"question": "What?"}},
        )

        assert response.status_code == 400


# ── Types & Schemas ───────────────────────────────────────


class TestTypes:
    def test_list_types(self, client, mock_service):
        mock_service.list_types.return_value = ["qa"]

        response = client.get("/assistants/types/list")

        assert response.status_code == 200
        assert response.json()["types"] == ["qa"]

    def test_get_schema(self, client, mock_service):
        mock_service.get_schemas.return_value = {
            "config_schema": {},
            "input_schema": {},
        }

        response = client.get("/assistants/types/qa/schema")

        assert response.status_code == 200
        assert "config_schema" in response.json()

    def test_get_schema_invalid_type(self, client, mock_service):
        mock_service.get_schemas.side_effect = AssistantValidationError("Unknown")

        response = client.get("/assistants/types/bad/schema")

        assert response.status_code == 400
