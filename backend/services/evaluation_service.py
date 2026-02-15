"""
Evaluation service — orchestrates dataset management and RAGAS evaluation.
"""

import logging
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


class EvaluationService:
    """Service for managing evaluation datasets and running evaluations."""

    def __init__(self, repo: EvaluationRepository):
        self.repo = repo

    # ── Dataset CRUD ──────────────────────────────────────

    def create_dataset(self, dataset_name: str, qa_pairs: list[dict]) -> dict:
        """Create a manually-defined dataset."""

        if self.repo.find_dataset_by_name(dataset_name):
            raise DatasetAlreadyExistsError(dataset_name)

        dataset = {
            "name": dataset_name,
            "source_collection": "manual",
            "generated_at": datetime.now(UTC).isoformat(),
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
        result = self.repo.update_dataset(dataset_id, update_data)
        if not result:
            raise DatasetNotFoundError(dataset_id)
        return result

    def delete_dataset(self, dataset_id: str) -> None:
        if not self.repo.delete_dataset(dataset_id):
            raise DatasetNotFoundError(dataset_id)

    # ── RAGAS dataset generation ──────────────────────────

    async def generate_ragas_dataset(
        self,
        collection_name: str,
        dataset_name: str,
        testset_size: int,
        model_name: str,
    ) -> dict:
        """Generate a synthetic QA dataset using RAGAS from a document collection."""

        from langchain_openai import ChatOpenAI
        from ragas.embeddings import LangchainEmbeddingsWrapper
        from ragas.llms import LangchainLLMWrapper
        from ragas.testset import TestsetGenerator
        from ragas.testset.synthesizers.single_hop.specific import (
            SingleHopSpecificQuerySynthesizer,
        )

        from backend.core.embeddings import get_embedding_config

        # Get source documents
        langchain_docs = self._get_langchain_docs(collection_name)

        # Setup RAGAS generator
        generator_llm = LangchainLLMWrapper(ChatOpenAI(model=model_name))

        # Use default embedding for RAGAS generation
        embedding_config = get_embedding_config("jina/jina-embeddings-v2-base-de")
        generator_embeddings = LangchainEmbeddingsWrapper(embedding_config.dense)

        generator = TestsetGenerator(
            llm=generator_llm, embedding_model=generator_embeddings
        )

        # Configure synthesizers
        distribution = [(SingleHopSpecificQuerySynthesizer(llm=generator_llm), 1.0)]

        for query, _ in distribution:
            prompts = await query.adapt_prompts("german", llm=generator_llm)
            query.set_prompts(**prompts)

        # Generate
        logger.info(f"Generating RAGAS dataset with size {testset_size}")
        ragas_dataset = generator.generate_with_langchain_docs(
            langchain_docs,
            testset_size=testset_size,
            query_distribution=distribution,
        )

        ragas_df = ragas_dataset.to_pandas()
        if ragas_df.empty:
            raise RuntimeError("RAGAS generated an empty dataset")

        # Convert to QA pairs
        qa_pairs = []
        for _, row in ragas_df.iterrows():
            qa_pairs.append(
                {
                    "question": row.get("user_input", ""),
                    "ground_truth": row.get("reference", ""),
                    "context": row.get("reference_contexts", []),
                    "source_doc": row.get("source", ""),
                }
            )

        # Store
        dataset = {
            "name": dataset_name,
            "source_collection": collection_name,
            "generated_at": datetime.now(UTC).isoformat(),
            "generator": "ragas",
            "model": model_name,
            "num_pairs": len(qa_pairs),
            "qa_pairs": qa_pairs,
        }

        dataset_id = self.repo.insert_dataset(dataset)
        dataset["_id"] = dataset_id

        return dataset

    # ── Assistant evaluation ──────────────────────────────

    async def evaluate_assistant(
        self,
        dataset_name: str,
        assistant_id: str,
        questions: list[str],
        ground_truths: list[str],
        answers: list[str],
        retrieved_contexts: list[list[str]],
        eval_llm_model: str,
        eval_llm_provider: str,
    ) -> dict:
        """
        Evaluate an assistant using RAGAS metrics.

        Returns evaluation results with per-question and aggregate metrics.
        """
        import pandas as pd
        from ragas import EvaluationDataset, evaluate
        from ragas.llms import LangchainLLMWrapper
        from ragas.metrics import (
            answer_relevancy,
            context_precision,
            context_recall,
            faithfulness,
        )

        # Create evaluation LLM
        eval_llm = get_chat_llm(model=eval_llm_model, provider=eval_llm_provider)
        evaluator_llm = LangchainLLMWrapper(eval_llm)

        logger.info(
            f"Evaluating assistant {assistant_id}: "
            f"{len(questions)} questions, model={eval_llm_model}"
        )

        # Build RAGAS dataset
        df = pd.DataFrame(
            {
                "user_input": questions,
                "response": answers,
                "reference": ground_truths,
                "retrieved_contexts": retrieved_contexts,
            }
        )

        evaluation_dataset = EvaluationDataset.from_pandas(df)

        # Run evaluation
        result = evaluate(
            dataset=evaluation_dataset,
            metrics=[faithfulness, context_recall, answer_relevancy, context_precision],
            llm=evaluator_llm,
        )

        result_df = result.to_pandas()

        # Compute aggregate metrics
        metrics = {}
        for metric_name in [
            "faithfulness",
            "context_recall",
            "answer_relevancy",
            "context_precision",
        ]:
            if metric_name in result_df.columns:
                metrics[metric_name] = float(result_df[metric_name].mean())
            else:
                metrics[metric_name] = None
                logger.warning(f"Metric {metric_name} not found in results")

        detailed_results = result_df.to_dict("records")

        # Store evaluation
        evaluation = {
            "dataset_name": dataset_name,
            "assistant_id": assistant_id,
            "eval_llm_model": eval_llm_model,
            "eval_llm_provider": eval_llm_provider,
            "metrics": metrics,
            "detailed_results": detailed_results,
            "created_at": datetime.now(UTC).isoformat(),
        }

        evaluation_id = self.repo.insert_evaluation(evaluation)
        evaluation["_id"] = evaluation_id

        return evaluation

    # ── Evaluation results ────────────────────────────────

    def get_evaluation(self, evaluation_id: str) -> dict:
        result = self.repo.find_evaluation_by_id(evaluation_id)
        if not result:
            raise EvaluationNotFoundError(evaluation_id)
        return result

    def list_evaluations(self) -> list[dict]:
        return self.repo.find_all_evaluations()

    def list_evaluations_by_dataset(self, dataset_name: str) -> list[dict]:
        return self.repo.find_evaluations_by_dataset(dataset_name)

    # ── Private helpers ───────────────────────────────────

    def _get_langchain_docs(self, collection_name: str) -> list[Document]:
        """Load documents from MongoDB and convert to LangChain format."""
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
