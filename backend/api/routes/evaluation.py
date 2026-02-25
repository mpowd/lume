"""
API routes for evaluation management.
"""

import logging

from fastapi import APIRouter, Depends

from backend.app.dependencies import get_evaluation_service
from backend.schemas.evaluation import (
    DatasetCreateRequest,
    DatasetListResponse,
    DatasetResponse,
    DatasetUpdateRequest,
    EvaluateAssistantRequest,
    EvaluationListResponse,
    EvaluationResponse,
    MetricCreateRequest,
    MetricListResponse,
    MetricResponse,
    MetricUpdateRequest,
)
from backend.services.evaluation_service import EvaluationService

logger = logging.getLogger(__name__)

router = APIRouter()


# ── Metric CRUD ───────────────────────────────────────────


@router.get(
    "/metrics",
    response_model=MetricListResponse,
    operation_id="listMetrics",
)
async def list_metrics(
    service: EvaluationService = Depends(get_evaluation_service),
):
    """Retrieve all metric definitions (built-in and custom)."""
    metrics = service.list_metrics()
    return MetricListResponse(metrics=[_to_metric_response(m) for m in metrics])


@router.post(
    "/metrics",
    response_model=MetricResponse,
    status_code=201,
    operation_id="createMetric",
)
async def create_metric(
    request: MetricCreateRequest,
    service: EvaluationService = Depends(get_evaluation_service),
):
    """Create a custom metric definition."""
    metric = service.create_metric(request.model_dump())
    return _to_metric_response(metric)


@router.put(
    "/metrics/{metric_id}",
    response_model=MetricResponse,
    operation_id="updateMetric",
)
async def update_metric(
    metric_id: str,
    request: MetricUpdateRequest,
    service: EvaluationService = Depends(get_evaluation_service),
):
    """Update a custom metric definition."""
    metric = service.update_metric(metric_id, request.model_dump(exclude_unset=True))
    return _to_metric_response(metric)


@router.delete(
    "/metrics/{metric_id}",
    status_code=204,
    operation_id="deleteMetric",
)
async def delete_metric(
    metric_id: str,
    service: EvaluationService = Depends(get_evaluation_service),
):
    """Delete a custom metric. Built-in metrics cannot be deleted."""
    service.delete_metric(metric_id)


# ── Dataset CRUD ──────────────────────────────────────────


@router.post(
    "/datasets",
    response_model=DatasetResponse,
    status_code=201,
    operation_id="createDataset",
)
async def create_dataset(
    request: DatasetCreateRequest,
    service: EvaluationService = Depends(get_evaluation_service),
):
    """Create a dataset with manually provided QA pairs."""
    dataset = service.create_dataset(request.dataset_name, request.qa_pairs)
    return _to_dataset_response(dataset)


@router.get(
    "/datasets",
    response_model=DatasetListResponse,
    operation_id="listDatasets",
)
async def list_datasets(
    service: EvaluationService = Depends(get_evaluation_service),
):
    """Retrieve all evaluation datasets."""
    datasets = service.list_datasets()
    return DatasetListResponse(datasets=[_to_dataset_response(d) for d in datasets])


@router.put(
    "/datasets/{dataset_id}",
    response_model=DatasetResponse,
    operation_id="updateDataset",
)
async def update_dataset(
    dataset_id: str,
    request: DatasetUpdateRequest,
    service: EvaluationService = Depends(get_evaluation_service),
):
    """Update an evaluation dataset."""
    result = service.update_dataset(dataset_id, request.model_dump(exclude_unset=True))
    return _to_dataset_response(result)


@router.delete(
    "/datasets/{dataset_id}",
    status_code=204,
    operation_id="deleteDataset",
)
async def delete_dataset(
    dataset_id: str,
    service: EvaluationService = Depends(get_evaluation_service),
):
    """Delete an evaluation dataset."""
    service.delete_dataset(dataset_id)


# ── Evaluation ────────────────────────────────────────────


async def _run_qa_assistant(assistant_id: str, question: str) -> dict:
    """
    Execute the QAAssistant for a single question and return a normalised
    {"answer": str, "contexts": list[str]} dict.

    QAAssistant.execute() is an async generator that yields either streaming
    tokens or, in non-streaming mode, a single QAAssistantOutput as its only
    item. We drain the generator without streaming and grab the output.
    """
    from backend.app.dependencies import get_db
    from backend.core.assistants.qa_assistant import (
        QAAssistant,
        QAAssistantConfig,
        QAAssistantInput,
    )
    from backend.db.repositories.assistant_repo import AssistantRepository

    # Load the assistant — find_by_id returns an AssistantResponse (Pydantic model)
    db = get_db()
    repo = AssistantRepository(db)
    assistant = repo.find_by_id(assistant_id)
    if not assistant:
        raise ValueError(f"Assistant '{assistant_id}' not found")

    # assistant.config is already a dict (stored as-is in MongoDB)
    config = QAAssistantConfig(**(assistant.config or {}))
    input_data = QAAssistantInput(question=question)

    qa = QAAssistant()
    output = None
    async for item in qa.execute(config=config, input_data=input_data, stream=False):
        output = item  # non-streaming: exactly one QAAssistantOutput

    if output is None:
        return {"answer": "", "contexts": []}

    return {
        "answer": output.answer or "",
        "contexts": output.contexts or [],
    }


@router.post(
    "/evaluate-assistant",
    response_model=EvaluationResponse,
    status_code=201,
    operation_id="evaluateAssistant",
)
async def evaluate_assistant(
    request: EvaluateAssistantRequest,
    service: EvaluationService = Depends(get_evaluation_service),
):
    """
    Evaluate an assistant using LLM-as-judge metrics.

    Requires at least one metric_id. Questions can come from a saved dataset
    (dataset_id) or be provided inline (inline_questions). At least one source
    must be supplied.
    """
    from fastapi import HTTPException

    if not request.dataset_id and not request.inline_questions:
        raise HTTPException(
            status_code=422,
            detail="Provide either dataset_id or inline_questions.",
        )

    # ── Resolve questions ─────────────────────────────────

    if request.dataset_id:
        dataset = service.repo.find_dataset_by_id(request.dataset_id)
        if not dataset:
            raise HTTPException(
                status_code=404,
                detail=f"Dataset '{request.dataset_id}' not found.",
            )
        questions = [
            {"question": p.get("question", ""), "ground_truth": p.get("ground_truth")}
            for p in dataset.get("qa_pairs", [])
        ]
        dataset_name = dataset.get("name")
    else:
        questions = [
            {"question": q.question, "ground_truth": q.ground_truth}
            for q in request.inline_questions
        ]
        dataset_name = None

    # ── Run assistant for each question ───────────────────

    answers: list[dict] = []
    for q in questions:
        try:
            result = await _run_qa_assistant(
                assistant_id=request.assistant_id,
                question=q["question"],
            )
            answers.append(result)
        except Exception as exc:
            logger.warning(
                f"Assistant execution failed for question '{q['question'][:60]}': {exc}"
            )
            answers.append({"answer": "", "contexts": []})

    # ── Resolve assistant display name ────────────────────

    assistant_name = request.assistant_id  # safe fallback
    try:
        from backend.app.dependencies import get_db
        from backend.db.repositories.assistant_repo import AssistantRepository

        db = get_db()
        repo = AssistantRepository(db)
        assistant = repo.find_by_id(request.assistant_id)
        if assistant:
            assistant_name = assistant.name
    except Exception:
        pass

    # ── Score with LLM-as-judge ───────────────────────────

    result = await service.evaluate_assistant(
        assistant_id=request.assistant_id,
        assistant_name=assistant_name,
        metric_ids=request.metric_ids,
        questions=questions,
        answers=answers,
        eval_llm_model=request.eval_llm_model,
        eval_llm_provider=request.eval_llm_provider,
        dataset_id=request.dataset_id,
        dataset_name=dataset_name,
    )

    return _to_evaluation_response(result)


# ── Evaluation results ────────────────────────────────────


@router.get(
    "/evaluations",
    response_model=EvaluationListResponse,
    operation_id="listEvaluations",
)
async def list_evaluations(
    service: EvaluationService = Depends(get_evaluation_service),
):
    """Retrieve all evaluation results."""
    evaluations = service.list_evaluations()
    return EvaluationListResponse(
        evaluations=[_to_evaluation_response(e) for e in evaluations]
    )


@router.get(
    "/evaluations/{evaluation_id}",
    response_model=EvaluationResponse,
    operation_id="getEvaluation",
)
async def get_evaluation(
    evaluation_id: str,
    service: EvaluationService = Depends(get_evaluation_service),
):
    """Retrieve a specific evaluation by ID."""
    return _to_evaluation_response(service.get_evaluation(evaluation_id))


# ── Response mappers ──────────────────────────────────────


def _to_metric_response(doc: dict) -> MetricResponse:
    return MetricResponse(
        id=doc.get("_id", ""),
        name=doc["name"],
        description=doc.get("description"),
        type=doc.get("type", "llm_judge"),
        prompt_template=doc.get("prompt_template"),
        scale_min=doc.get("scale_min", 0.0),
        scale_max=doc.get("scale_max", 1.0),
        is_builtin=doc.get("is_builtin", False),
        requires_context=doc.get("requires_context", False),
        requires_ground_truth=doc.get("requires_ground_truth", False),
        created_at=doc.get("created_at", ""),
        updated_at=doc.get("updated_at", ""),
    )


def _to_dataset_response(doc: dict) -> DatasetResponse:
    return DatasetResponse(
        id=doc.get("_id", ""),
        name=doc["name"],
        source_collection=doc.get("source_collection", ""),
        generated_at=doc.get("generated_at", ""),
        generator=doc.get("generator", ""),
        model=doc.get("model", ""),
        num_pairs=doc.get("num_pairs", 0),
        qa_pairs=doc.get("qa_pairs", []),
    )


def _to_evaluation_response(doc: dict) -> EvaluationResponse:
    from backend.schemas.evaluation import QuestionResult

    results = [
        QuestionResult(
            question=r.get("question", ""),
            answer=r.get("answer", ""),
            ground_truth=r.get("ground_truth"),
            context=r.get("context", []),
            scores=r.get("scores", {}),
        )
        for r in doc.get("results", [])
    ]

    return EvaluationResponse(
        id=doc.get("_id", ""),
        assistant_id=doc.get("assistant_id", ""),
        assistant_name=doc.get("assistant_name", ""),
        dataset_id=doc.get("dataset_id"),
        dataset_name=doc.get("dataset_name"),
        eval_llm_model=doc.get("eval_llm_model", ""),
        eval_llm_provider=doc.get("eval_llm_provider", ""),
        metric_ids=doc.get("metric_ids", []),
        summary=doc.get("summary", {}),
        results=results,
        created_at=doc.get("created_at", ""),
    )
