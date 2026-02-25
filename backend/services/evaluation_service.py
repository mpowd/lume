"""
Evaluation service — dataset management, metric CRUD, and LLM-as-judge evaluation.
"""

import logging
import re
from datetime import UTC, datetime

from langchain_core.documents import Document

from backend.app.exceptions import (
    DatasetAlreadyExistsError,
    DatasetNotFoundError,
    EvaluationNotFoundError,
)
from backend.core.llm import get_chat_llm
from backend.db.repositories.evaluation_repo import EvaluationRepository

logger = logging.getLogger(__name__)

BUILTIN_METRICS = [
    {
        "name": "Answer Relevancy",
        "description": "Measures how relevant the answer is to the question",
        "type": "llm_judge",
        "prompt_template": (
            "Rate how relevant the following answer is to the question "
            "on a scale from 0 (completely irrelevant) to 1 (perfectly relevant).\n\n"
            "Question: {question}\n"
            "Answer: {answer}\n\n"
            "Return only a single number between 0 and 1."
        ),
        "scale_min": 0.0,
        "scale_max": 1.0,
        "is_builtin": True,
        "requires_context": False,
        "requires_ground_truth": False,
    },
    {
        "name": "Faithfulness",
        "description": "Measures whether the answer is grounded in the retrieved context",
        "type": "llm_judge",
        "prompt_template": (
            "Rate how faithfully the following answer is grounded in the provided context "
            "on a scale from 0 (contains hallucinations / not grounded) to 1 (fully grounded).\n\n"
            "Context: {context}\n"
            "Answer: {answer}\n\n"
            "Return only a single number between 0 and 1."
        ),
        "scale_min": 0.0,
        "scale_max": 1.0,
        "is_builtin": True,
        "requires_context": True,
        "requires_ground_truth": False,
    },
    {
        "name": "Correctness",
        "description": "Measures whether the answer matches the ground truth",
        "type": "llm_judge",
        "prompt_template": (
            "Rate how correct the following answer is compared to the ground truth "
            "on a scale from 0 (completely wrong) to 1 (perfectly correct).\n\n"
            "Question: {question}\n"
            "Ground truth: {ground_truth}\n"
            "Answer: {answer}\n\n"
            "Return only a single number between 0 and 1."
        ),
        "scale_min": 0.0,
        "scale_max": 1.0,
        "is_builtin": True,
        "requires_context": False,
        "requires_ground_truth": True,
    },
]


class EvaluationService:
    """Service for managing evaluation datasets, metrics, and running evaluations."""

    def __init__(self, repo: EvaluationRepository):
        self.repo = repo
        self._seed_builtin_metrics()

    # ── Metric CRUD ───────────────────────────────────────

    def _seed_builtin_metrics(self) -> None:
        """
        Upsert built-in metrics using a single atomic MongoDB update_one with
        upsert=True, keyed on `name`. Safe across multiple workers and repeated
        restarts — guaranteed never to create duplicate documents.
        """
        now = datetime.now(UTC).isoformat()
        for m in BUILTIN_METRICS:
            self.repo.upsert_builtin_metric(m, now)

    def list_metrics(self) -> list[dict]:
        return self.repo.find_all_metrics()

    def get_metric(self, metric_id: str) -> dict:
        metric = self.repo.find_metric_by_id(metric_id)
        if not metric:
            raise ValueError(f"Metric '{metric_id}' not found")
        return metric

    def create_metric(self, data: dict) -> dict:
        now = datetime.now(UTC).isoformat()
        doc = {**data, "created_at": now, "updated_at": now}
        metric_id = self.repo.insert_metric(doc)
        doc["_id"] = metric_id
        return doc

    def update_metric(self, metric_id: str, update_data: dict) -> dict:
        update_data["updated_at"] = datetime.now(UTC).isoformat()
        result = self.repo.update_metric(metric_id, update_data)
        if not result:
            raise ValueError(f"Metric '{metric_id}' not found")
        return result

    def delete_metric(self, metric_id: str) -> None:
        metric = self.repo.find_metric_by_id(metric_id)
        if not metric:
            raise ValueError(f"Metric '{metric_id}' not found")
        if metric.get("is_builtin"):
            raise ValueError("Built-in metrics cannot be deleted")
        self.repo.delete_metric(metric_id)

    # ── Dataset CRUD ──────────────────────────────────────

    def create_dataset(self, dataset_name: str, qa_pairs: list[dict]) -> dict:
        if self.repo.find_dataset_by_name(dataset_name):
            raise DatasetAlreadyExistsError(dataset_name)

        now = datetime.now(UTC).isoformat()
        dataset = {
            "name": dataset_name,
            "source_collection": "manual",
            "generated_at": now,
            "generator": "human",
            "model": "None",
            "num_pairs": len(qa_pairs),
            "qa_pairs": qa_pairs,
        }
        dataset_id = self.repo.insert_dataset(dataset)
        dataset["_id"] = dataset_id
        return dataset

    def list_datasets(self) -> list[dict]:
        return self.repo.find_all_datasets()

    def update_dataset(self, dataset_id: str, update_data: dict) -> dict:
        if "qa_pairs" in update_data:
            update_data["num_pairs"] = len(update_data["qa_pairs"])
        result = self.repo.update_dataset(dataset_id, update_data)
        if not result:
            raise DatasetNotFoundError(dataset_id)
        return result

    def delete_dataset(self, dataset_id: str) -> None:
        if not self.repo.delete_dataset(dataset_id):
            raise DatasetNotFoundError(dataset_id)

    # ── LLM-as-judge evaluation ───────────────────────────

    async def evaluate_assistant(
        self,
        assistant_id: str,
        assistant_name: str,
        metric_ids: list[str],
        questions: list[dict],
        answers: list[dict],
        eval_llm_model: str,
        eval_llm_provider: str,
        dataset_id: str | None,
        dataset_name: str | None,
    ) -> dict:
        metrics = self.repo.find_metrics_by_ids(metric_ids)
        if not metrics:
            raise ValueError("No valid metrics found for the provided IDs")

        eval_llm = get_chat_llm(model=eval_llm_model, provider=eval_llm_provider)

        logger.info(
            f"Evaluating assistant '{assistant_id}' on {len(questions)} questions "
            f"with {len(metrics)} metrics using {eval_llm_model}"
        )

        results: list[dict] = []
        summary_accumulator: dict[str, list[float]] = {m["name"]: [] for m in metrics}

        for q_data, a_data in zip(questions, answers):
            question = q_data.get("question", "")
            ground_truth = q_data.get("ground_truth") or ""
            answer = a_data.get("answer", "")
            context_chunks = a_data.get("context", []) or a_data.get("contexts", [])
            context_str = "\n\n".join(context_chunks) if context_chunks else ""

            row_scores: dict[str, float] = {}

            for metric in metrics:
                prompt = metric.get("prompt_template", "")
                if not prompt:
                    continue

                rendered = prompt.replace("{question}", question)
                rendered = rendered.replace("{answer}", answer)
                rendered = rendered.replace("{ground_truth}", ground_truth)
                rendered = rendered.replace("{context}", context_str)

                try:
                    response = await eval_llm.ainvoke(rendered)
                    score = self._parse_score(
                        response.content,
                        metric["scale_min"],
                        metric["scale_max"],
                    )
                    row_scores[metric["name"]] = score
                    summary_accumulator[metric["name"]].append(score)
                except Exception as exc:
                    logger.warning(
                        f"Metric '{metric['name']}' failed for question "
                        f"'{question[:60]}…': {exc}"
                    )

            results.append(
                {
                    "question": question,
                    "answer": answer,
                    "ground_truth": ground_truth or None,
                    "context": context_chunks,
                    "scores": row_scores,
                }
            )

        summary = {
            name: (sum(scores) / len(scores)) if scores else None
            for name, scores in summary_accumulator.items()
        }

        evaluation = {
            "assistant_id": assistant_id,
            "assistant_name": assistant_name,
            "dataset_id": dataset_id,
            "dataset_name": dataset_name,
            "eval_llm_model": eval_llm_model,
            "eval_llm_provider": eval_llm_provider,
            "metric_ids": metric_ids,
            "summary": summary,
            "results": results,
            "created_at": datetime.now(UTC).isoformat(),
        }

        evaluation_id = self.repo.insert_evaluation(evaluation)
        evaluation["_id"] = evaluation_id
        return evaluation

    # ── Evaluation result queries ─────────────────────────

    def get_evaluation(self, evaluation_id: str) -> dict:
        result = self.repo.find_evaluation_by_id(evaluation_id)
        if not result:
            raise EvaluationNotFoundError(evaluation_id)
        return result

    def list_evaluations(self) -> list[dict]:
        return self.repo.find_all_evaluations()

    # ── Private helpers ───────────────────────────────────

    @staticmethod
    def _parse_score(text: str, scale_min: float, scale_max: float) -> float:
        text = text.strip().replace(",", ".")
        match = re.search(r"-?\d+(?:\.\d+)?", text)
        if not match:
            raise ValueError(f"No numeric score found in LLM response: {text!r}")
        value = float(match.group())
        return max(scale_min, min(scale_max, value))

    def _get_langchain_docs(self, collection_name: str) -> list[Document]:
        docs = self.repo.get_collection_documents(collection_name)
        if not docs:
            raise RuntimeError(f"No documents found in collection '{collection_name}'")

        langchain_docs = []
        for doc in docs:
            markdown = doc.get("markdown")
            if markdown:
                langchain_docs.append(
                    Document(
                        page_content=markdown,
                        metadata={
                            "url": doc.get("url", ""),
                            "source": doc.get("url", ""),
                        },
                    )
                )

        if not langchain_docs:
            raise RuntimeError(
                f"No documents with markdown content in '{collection_name}'"
            )
        return langchain_docs
