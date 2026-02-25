"""
Pydantic schemas for evaluation endpoints.
"""

from enum import Enum

from pydantic import BaseModel, Field

# ── Metrics ───────────────────────────────────────────────


class MetricType(str, Enum):
    """
    llm_judge: LLM scores the answer using a custom prompt template.
    exact_match: Simple string equality check (case-insensitive).
    """

    llm_judge = "llm_judge"
    exact_match = "exact_match"


class MetricVariable(str, Enum):
    """Variables available for interpolation inside a metric prompt."""

    question = "{question}"
    answer = "{answer}"
    ground_truth = "{ground_truth}"
    context = "{context}"


class MetricCreateRequest(BaseModel):
    name: str = Field(description="Display name, e.g. 'Grammar'")
    description: str | None = Field(
        default=None, description="Short description of what this metric measures"
    )
    type: MetricType = Field(default=MetricType.llm_judge)
    prompt_template: str | None = Field(
        default=None,
        description=(
            "Prompt sent to the evaluator LLM. "
            "Use {question}, {answer}, {ground_truth}, {context} as placeholders. "
            "The model must return a single number."
        ),
    )
    scale_min: float = Field(default=0.0, description="Minimum score value")
    scale_max: float = Field(default=1.0, description="Maximum score value")
    is_builtin: bool = Field(
        default=False,
        description="True for pre-defined metrics shipped with the platform",
    )
    requires_context: bool = Field(
        default=False,
        description="If True, retrieval context must be available to use this metric",
    )
    requires_ground_truth: bool = Field(
        default=False,
        description="If True, ground truth must be provided in the dataset",
    )


class MetricUpdateRequest(BaseModel):
    name: str | None = None
    description: str | None = None
    prompt_template: str | None = None
    scale_min: float | None = None
    scale_max: float | None = None
    requires_context: bool | None = None
    requires_ground_truth: bool | None = None


class MetricResponse(BaseModel):
    id: str
    name: str
    description: str | None
    type: MetricType
    prompt_template: str | None
    scale_min: float
    scale_max: float
    is_builtin: bool
    requires_context: bool
    requires_ground_truth: bool
    created_at: str
    updated_at: str


class MetricListResponse(BaseModel):
    metrics: list[MetricResponse]


# ── Datasets ──────────────────────────────────────────────


class QAPair(BaseModel):
    question: str
    ground_truth: str | None = None


class DatasetCreateRequest(BaseModel):
    dataset_name: str = Field(description="Name of the dataset")
    qa_pairs: list[dict] = Field(description="List of question-answer pair dicts")


class DatasetUpdateRequest(BaseModel):
    """Partial update for a dataset. All fields optional."""

    name: str | None = None
    qa_pairs: list[dict] | None = None


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


# ── Evaluation run ────────────────────────────────────────


class EvaluationQuestionInput(BaseModel):
    """A single question supplied inline (without a saved dataset)."""

    question: str
    ground_truth: str | None = None


class EvaluateAssistantRequest(BaseModel):
    assistant_id: str = Field(description="ID of the assistant to evaluate")
    metric_ids: list[str] = Field(
        description="IDs of MetricDefinition documents to run"
    )

    # Questions source — one of the two must be provided
    dataset_id: str | None = Field(
        default=None, description="ID of a saved evaluation dataset"
    )
    inline_questions: list[EvaluationQuestionInput] | None = Field(
        default=None,
        description="Ad-hoc questions when no saved dataset is used",
    )

    eval_llm_model: str = Field(default="gpt-4o-mini")
    eval_llm_provider: str = Field(default="openai")


# ── Evaluation results ────────────────────────────────────


class QuestionResult(BaseModel):
    question: str
    answer: str
    ground_truth: str | None
    context: list[str]
    scores: dict[str, float] = Field(description="Metric name → numeric score")


class EvaluationResponse(BaseModel):
    id: str
    assistant_id: str
    assistant_name: str
    dataset_id: str | None
    dataset_name: str | None
    eval_llm_model: str
    eval_llm_provider: str
    metric_ids: list[str]
    # Aggregated averages: metric_name → mean score
    summary: dict[str, float]
    results: list[QuestionResult]
    created_at: str


class EvaluationListResponse(BaseModel):
    evaluations: list[EvaluationResponse]
