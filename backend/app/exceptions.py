"""
Domain exceptions for the application.
"""


# ── Base ──────────────────────────────────────────────────


class NotFoundError(Exception):
    """Resource not found"""

    def __init__(self, resource: str, identifier: str):
        self.resource = resource
        self.identifier = identifier
        super().__init__(f"{resource} '{identifier}' not found")


class ValidationError(Exception):
    """Invalid input or configuration"""

    pass


# ── Assistant ─────────────────────────────────────────────


class AssistantNotFoundError(NotFoundError):
    def __init__(self, assistant_id: str):
        super().__init__("Assistant", assistant_id)


class AssistantValidationError(ValidationError):
    pass


class AssistantInactiveError(Exception):
    def __init__(self, assistant_id: str):
        self.assistant_id = assistant_id
        super().__init__(f"Assistant '{assistant_id}' is not active")


# ── Knowledge Base ────────────────────────────────────────


class CollectionNotFoundError(NotFoundError):
    def __init__(self, collection_name: str):
        super().__init__("Collection", collection_name)


class CollectionAlreadyExistsError(Exception):
    def __init__(self, collection_name: str):
        self.collection_name = collection_name
        super().__init__(f"Collection '{collection_name}' already exists")


class CollectionConfigError(ValidationError):
    pass


class UnsupportedEmbeddingModelError(ValidationError):
    def __init__(self, model_name: str):
        super().__init__(f"Unsupported embedding model: {model_name}")


# ── Evaluation ────────────────────────────────────────────


class DatasetNotFoundError(NotFoundError):
    def __init__(self, identifier: str):
        super().__init__("Dataset", identifier)


class DatasetAlreadyExistsError(Exception):
    def __init__(self, dataset_name: str):
        self.dataset_name = dataset_name
        super().__init__(f"Dataset '{dataset_name}' already exists")


class EvaluationNotFoundError(NotFoundError):
    def __init__(self, evaluation_id: str):
        super().__init__("Evaluation", evaluation_id)
