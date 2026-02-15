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
    RagasGenerationRequest,
)
from backend.services.evaluation_service import EvaluationService

logger = logging.getLogger(__name__)

router = APIRouter()


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


# ── RAGAS generation ──────────────────────────────────────


@router.post(
    "/ragas",
    response_model=DatasetResponse,
    status_code=201,
    operation_id="generateRagasDataset",
)
async def generate_ragas_dataset(
    request: RagasGenerationRequest,
    service: EvaluationService = Depends(get_evaluation_service),
):
    """Generate a synthetic QA dataset using RAGAS."""
    dataset = await service.generate_ragas_dataset(
        collection_name=request.collection_name,
        dataset_name=request.dataset_name,
        testset_size=request.testset_size,
        model_name=request.model_name,
    )
    return _to_dataset_response(dataset)


# ── Evaluation ────────────────────────────────────────────


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
    """Evaluate an assistant's performance using RAGAS metrics."""
    result = await service.evaluate_assistant(
        dataset_name=request.dataset_name,
        assistant_id=request.assistant_id,
        questions=request.questions,
        ground_truths=request.ground_truths,
        answers=request.answers,
        retrieved_contexts=request.retrieved_contexts,
        eval_llm_model=request.eval_llm_model,
        eval_llm_provider=request.eval_llm_provider,
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


@router.get(
    "/datasets/{dataset_name}/evaluations",
    response_model=EvaluationListResponse,
    operation_id="listEvaluationsByDataset",
)
async def list_evaluations_by_dataset(
    dataset_name: str,
    service: EvaluationService = Depends(get_evaluation_service),
):
    """Get all evaluations for a specific dataset."""
    evaluations = service.list_evaluations_by_dataset(dataset_name)
    return EvaluationListResponse(
        evaluations=[_to_evaluation_response(e) for e in evaluations]
    )


# ── Response mappers ──────────────────────────────────────


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
    metrics = doc.get("metrics", {})
    return EvaluationResponse(
        id=doc.get("_id", ""),
        dataset_name=doc.get("dataset_name", ""),
        assistant_id=doc.get("assistant_id", ""),
        eval_llm_model=doc.get("eval_llm_model", ""),
        eval_llm_provider=doc.get("eval_llm_provider", ""),
        metrics=metrics,
        detailed_results=doc.get("detailed_results", []),
        created_at=doc.get("created_at", ""),
    )
