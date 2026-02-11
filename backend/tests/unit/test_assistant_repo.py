# tests/unit/test_assistant_repo.py
from datetime import UTC, datetime
from unittest.mock import MagicMock

import pytest
from bson import ObjectId

from backend.db.repositories.assistant_repo import AssistantRepository
from backend.schemas.assistant import AssistantResponse


@pytest.fixture
def mock_db():
    """Mock MongoDBClient with a fake collection"""
    db = MagicMock()
    collection = MagicMock()
    db.get_collection.return_value = collection
    return db, collection


@pytest.fixture
def repo(mock_db):
    db, _ = mock_db
    return AssistantRepository(db=db)


@pytest.fixture
def sample_doc():
    """A MongoDB document as it would come from pymongo"""
    return {
        "_id": ObjectId("507f1f77bcf86cd799439011"),
        "name": "Test QA Bot",
        "description": "A test assistant",
        "type": "qa",
        "config": {"llm_model": "gpt-4o-mini", "llm_provider": "openai"},
        "created_by": "system",
        "created_at": datetime(2025, 1, 1, tzinfo=UTC),
        "updated_at": datetime(2025, 1, 1, tzinfo=UTC),
        "is_active": True,
    }


class TestInsert:
    def test_insert_returns_response(self, repo, mock_db, sample_doc):
        _, collection = mock_db
        collection.insert_one.return_value = MagicMock(inserted_id=sample_doc["_id"])

        data = {
            "name": "Test QA Bot",
            "type": "qa",
            "config": {"llm_model": "gpt-4o-mini", "llm_provider": "openai"},
        }

        result = repo.insert(data)

        assert isinstance(result, AssistantResponse)
        assert result.name == "Test QA Bot"
        assert result.type == "qa"
        collection.insert_one.assert_called_once()

    def test_insert_sets_timestamps(self, repo, mock_db):
        _, collection = mock_db
        collection.insert_one.return_value = MagicMock(inserted_id=ObjectId())

        data = {"name": "Test", "type": "qa", "config": {}}
        repo.insert(data)

        inserted_data = collection.insert_one.call_args[0][0]
        assert "created_at" in inserted_data
        assert "updated_at" in inserted_data


class TestFindById:
    def test_returns_response_when_found(self, repo, mock_db, sample_doc):
        _, collection = mock_db
        collection.find_one.return_value = sample_doc

        result = repo.find_by_id("507f1f77bcf86cd799439011")

        assert isinstance(result, AssistantResponse)
        assert result.id == "507f1f77bcf86cd799439011"
        assert result.name == "Test QA Bot"

    def test_returns_none_when_not_found(self, repo, mock_db):
        _, collection = mock_db
        collection.find_one.return_value = None

        result = repo.find_by_id("507f1f77bcf86cd799439011")

        assert result is None


class TestFindAll:
    def test_returns_all_assistants(self, repo, mock_db, sample_doc):
        _, collection = mock_db
        collection.find.return_value = [sample_doc, sample_doc]

        result = repo.find_all()

        assert len(result) == 2
        assert all(isinstance(r, AssistantResponse) for r in result)

    def test_filters_by_type(self, repo, mock_db):
        _, collection = mock_db
        collection.find.return_value = []

        repo.find_all(assistant_type="qa")

        collection.find.assert_called_once_with({"type": "qa"})

    def test_filters_by_active_status(self, repo, mock_db):
        _, collection = mock_db
        collection.find.return_value = []

        repo.find_all(is_active=False)

        collection.find.assert_called_once_with({"is_active": False})

    def test_empty_list_when_none_found(self, repo, mock_db):
        _, collection = mock_db
        collection.find.return_value = []

        result = repo.find_all()

        assert result == []


class TestUpdate:
    def test_returns_updated_response(self, repo, mock_db, sample_doc):
        _, collection = mock_db
        updated_doc = {**sample_doc, "name": "Updated Name"}
        collection.find_one_and_update.return_value = updated_doc

        result = repo.update("507f1f77bcf86cd799439011", {"name": "Updated Name"})

        assert isinstance(result, AssistantResponse)
        assert result.name == "Updated Name"

    def test_returns_none_when_not_found(self, repo, mock_db):
        _, collection = mock_db
        collection.find_one_and_update.return_value = None

        result = repo.update("507f1f77bcf86cd799439011", {"name": "X"})

        assert result is None


class TestDelete:
    def test_returns_true_when_deleted(self, repo, mock_db):
        _, collection = mock_db
        collection.delete_one.return_value = MagicMock(deleted_count=1)

        assert repo.delete("507f1f77bcf86cd799439011") is True

    def test_returns_false_when_not_found(self, repo, mock_db):
        _, collection = mock_db
        collection.delete_one.return_value = MagicMock(deleted_count=0)

        assert repo.delete("507f1f77bcf86cd799439011") is False
