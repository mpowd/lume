"""
Pydantic schemas for evaluation endpoints.
"""

from pydantic import BaseModel, Field

# ── Datasets ──────────────────────────────────────────────


class DatasetCreateRequest(BaseModel):
    dataset_name: str = Field(description="Name of the dataset")
    qa_pairs: list[dict] = Field(description="List of question-answer pair dicts")


class DatasetResponse(BaseModel):
    id: str
    name: str
    source_collection: str
    generated_at: str
    generator: str
    model: str
    num_pairs: int
    qa_pairs: list[dict]


class DatasetListResponse(BaseModel):
    datasets: list[DatasetResponse]


class DatasetUpdateRequest(BaseModel):
    """Partial update for a dataset. All fields optional."""

    name: str | None = None
    qa_pairs: list[dict] | None = None


# ── RAGAS dataset generation ──────────────────────────────


class RagasGenerationRequest(BaseModel):
    collection_name: str
    dataset_name: str
    testset_size: int = Field(default=1, description="Number of test cases to generate")
    model_name: str = Field(
        default="gpt-4o-mini", description="LLM model for generation"
    )


# ── Evaluation ────────────────────────────────────────────


class EvaluateAssistantRequest(BaseModel):
    dataset_name: str = Field(description="Name of the evaluation dataset")
    assistant_id: str = Field(description="ID of the assistant being evaluated")
    questions: list[str]
    ground_truths: list[str]
    answers: list[str]
    retrieved_contexts: list[list[str]] = Field(
        description="Retrieved context chunks per question"
    )
    eval_llm_model: str = Field(default="gpt-4o-mini")
    eval_llm_provider: str = Field(default="openai")


class MetricsSummary(BaseModel):
    faithfulness: float | None = None
    context_recall: float | None = None
    answer_relevancy: float | None = None
    context_precision: float | None = None


class EvaluationResponse(BaseModel):
    id: str
    dataset_name: str
    assistant_id: str
    eval_llm_model: str
    eval_llm_provider: str
    metrics: MetricsSummary
    detailed_results: list[dict]
    created_at: str


class EvaluationListResponse(BaseModel):
    evaluations: list[EvaluationResponse]
