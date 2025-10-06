from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, HttpUrl

import logging
import os

from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from backend.db.mongodb import MongoDBClient
from langchain_ollama import ChatOllama, OllamaEmbeddings
from langchain_openai import ChatOpenAI
from langchain_core.output_parsers import StrOutputParser, PydanticOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnableLambda, RunnableBranch
from langchain_core.runnables.passthrough import RunnableAssign
from langchain_core.documents import Document
from langchain.document_transformers import LongContextReorder
from bson import ObjectId, json_util
from pydantic import BaseModel, Field
from typing import List
import json
from tqdm import tqdm

from ragas.testset import TestsetGenerator
from ragas.llms import LangchainLLMWrapper
from ragas.embeddings import LangchainEmbeddingsWrapper
from ragas.testset.synthesizers.single_hop.specific import (
    SingleHopSpecificQuerySynthesizer,
)
from langchain_openai import ChatOpenAI, OpenAIEmbeddings


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()
llm = ChatOpenAI(
    model="gpt-4o-mini", temperature=0, api_key=os.environ["OPENAI_API_KEY"]
)


def get_mongodb_docs(collection_name: str) -> List[str]:
    mongodb_client = MongoDBClient.get_instance()
    docs = mongodb_client.get_all_documents(collection_name=collection_name)

    if not docs or not isinstance(docs, list) or len(docs) == 0:
        raise HTTPException(
            status_code=404,
            detail=f"No documents found in collection {collection_name}",
        )
    markdown_contents = []
    for doc in docs:
        markdown = doc.get("markdown")
        if markdown:
            markdown_contents.append({"url": doc.get("url", ""), "markdown": markdown})
    return markdown_contents


class QAPair(BaseModel):
    question: str = Field(
        description="Eine realistische Frage eines Bürgers zum Dokument"
    )
    answer: str = Field(
        description="Eine faktenbasierte Antwort auf die Frage aus dem Dokument"
    )
    source_doc: str = Field(description="Die Quelle des Dokuments")


class DatasetCreationRequest(BaseModel):
    dataset_name: str = Field(description="Name of the dataset")
    qa_pairs: List[dict]


@router.post("/datasets")
async def create_dataset(request: DatasetCreationRequest):
    """
    Create a dataset with manually provided question-answer pairs.

    - name: Name of the dataset (as query parameter)
    - qa_pairs: List of question-answer pairs (as request body)
    """

    try:
        dataset_entry = {
            "name": request.dataset_name,
            "source_collection": "manual",
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "generator": "human",
            "model": "None",
            "num_pairs": len(request.qa_pairs),
            "qa_pairs": request.qa_pairs,
        }

        mongodb_client = MongoDBClient.get_instance()

        if mongodb_client.get_collection(
            collection_name="evaluation_datasets"
        ).find_one({"name": request.dataset_name}):
            return {
                "status": "error",
                "message": f"A dataset with the name '{request.dataset_name}' already exists. Please choose another name.",
            }

        inserted_id = mongodb_client.persist_docs(
            docs=[dataset_entry], collection_name="evaluation_datasets"
        )

        dataset_entry["_id"] = (
            str(inserted_id[0]) if isinstance(inserted_id, list) else str(inserted_id)
        )

        return {
            "status": "success",
            "dataset_id": dataset_entry["_id"],
            "response": dataset_entry,
        }
    except Exception as e:
        logger.error(f"Error creating dataset: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error creating dataset: {str(e)}")


@router.get("/datasets")
async def get_evaluation_datasets():
    """
    Retrieve all evaluation datasets.
    """
    try:
        mongodb_client = MongoDBClient.get_instance()
        evaluation_collection = mongodb_client.get_collection("evaluation_datasets")

        datasets = list(evaluation_collection.find({}))

        for dataset in datasets:
            dataset["_id"] = str(dataset["_id"])

        return {"status": "success", "datasets": datasets}
    except Exception as e:
        logger.error(f"Error retrieving evaluation datasets: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Error retrieving evaluation datasets: {str(e)}"
        )


@router.put("/datasets/{dataset_id}")
async def update_evaluation_dataset(dataset_id: str, update_data: dict):
    """
    Update an evaluation dataset.

    - dataset_id: ID of the dataset to update
    - update_data: New data to apply to the dataset
    """
    try:
        from bson.objectid import ObjectId

        mongodb_client = MongoDBClient.get_instance()
        evaluation_collection = mongodb_client.get_collection("evaluation_datasets")

        result = evaluation_collection.update_one(
            {"_id": ObjectId(dataset_id)}, {"$set": update_data}
        )

        if result.modified_count == 0:
            raise HTTPException(
                status_code=404, detail=f"Dataset with ID {dataset_id} not found"
            )

        updated_dataset = evaluation_collection.find_one({"_id": ObjectId(dataset_id)})
        updated_dataset["_id"] = str(updated_dataset["_id"])

        return {"status": "success", "dataset": updated_dataset}
    except Exception as e:
        logger.error(f"Error updating evaluation dataset: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Error updating evaluation dataset: {str(e)}"
        )


class RagasDatasetGenerationRequest(BaseModel):
    collection_name: str
    dataset_name: str
    testset_size: int = Field(default=1, description="Number of test cases to generate")
    model_name: str = Field(
        default="gpt-4o-mini", description="LLM model to use for generation"
    )


def get_mongodb_docs_as_langchain(collection_name: str) -> List[Document]:
    """
    Retrieve documents from MongoDB and convert them to Langchain Document format
    """
    mongodb_client = MongoDBClient.get_instance()
    docs = mongodb_client.get_all_documents(collection_name=collection_name)

    if not docs or not isinstance(docs, list) or len(docs) == 0:
        raise HTTPException(
            status_code=404,
            detail=f"No documents found in collection {collection_name}",
        )

    langchain_docs = []
    for doc in docs:
        markdown = doc.get("markdown")
        if markdown:
            langchain_docs.append(
                Document(
                    page_content=markdown,
                    metadata={"url": doc.get("url", ""), "source": doc.get("url", "")},
                )
            )
    return langchain_docs


@router.post("/ragas")
async def generate_ragas_dataset(request: RagasDatasetGenerationRequest):
    try:
        logger.info(f"Starting RAGAS dataset generation for {request.collection_name}")

        langchain_docs = get_mongodb_docs_as_langchain(request.collection_name)
        logger.info(f"Retrieved {len(langchain_docs)} documents")

        generator_llm = LangchainLLMWrapper(ChatOpenAI(model=request.model_name))
        ollama_embeddings = OllamaEmbeddings(
            model="jina/jina-embeddings-v2-base-de",
            base_url="http://host.docker.internal:11434",
        )

        generator_embeddings = LangchainEmbeddingsWrapper(ollama_embeddings)
        generator = TestsetGenerator(
            llm=generator_llm, embedding_model=generator_embeddings
        )

        distribution = [(SingleHopSpecificQuerySynthesizer(llm=generator_llm), 1.0)]

        for query, _ in distribution:
            logger.info("Adapting prompts for German")
            prompts = await query.adapt_prompts("german", llm=generator_llm)
            query.set_prompts(**prompts)
            logger.info("Prompts adapted successfully")

        logger.info(f"Generating RAGAS dataset with size {request.testset_size}")
        ragas_dataset = generator.generate_with_langchain_docs(
            langchain_docs,
            testset_size=request.testset_size,
            query_distribution=distribution,
        )

        ragas_data = ragas_dataset.to_pandas()
        logger.info(f"RAGAS dataset columns: {ragas_data.columns.tolist()}")
        logger.info(f"RAGAS dataset shape: {ragas_data.shape}")
        logger.info(
            f"First row sample: {ragas_data.iloc[0].to_dict() if not ragas_data.empty else 'Empty'}"
        )

        if ragas_data.empty:
            logger.error("RAGAS dataset is empty!")
            raise ValueError("RAGAS generated an empty dataset")

        qa_pairs = []
        for idx, row in ragas_data.iterrows():
            pair = {
                "question": row.get("user_input", ""),
                "ground_truth": row.get("reference", ""),
                "context": row.get("reference_contexts", []),
                "source_doc": row.get("source", ""),
            }
            qa_pairs.append(pair)

        dataset_entry = {
            "name": request.dataset_name,
            "source_collection": request.collection_name,
            "generated_at": datetime.now().isoformat(),
            "generator": "ragas",
            "model": request.model_name,
            "num_pairs": len(qa_pairs),
            "qa_pairs": qa_pairs,
        }

        mongodb_client = MongoDBClient.get_instance()
        inserted_id = mongodb_client.persist_docs(
            docs=[dataset_entry], collection_name="evaluation_datasets"
        )

        dataset_entry["_id"] = str(inserted_id)

        return {
            "status": "success",
            "dataset_id": str(inserted_id),
            "response": dataset_entry,
        }

    except Exception as e:
        logger.error(f"Error generating RAGAS dataset: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Error generating RAGAS dataset: {str(e)}"
        )


class EvaluationRequest(BaseModel):
    dataset_name: str = Field(description="Name of the evaluation dataset")
    qag_triplets: List[dict]


class EvaluationRequest(BaseModel):
    dataset_name: str = Field(description="Name of the evaluation dataset")
    questions: List[str] = Field(description="Questions that are evaluated")
    ground_truths: List[str] = Field(
        description="Ground truth answers for the questions"
    )
    answers: List[str] = Field(
        description="Answers from the RAG system for the questions"
    )
    retrieved_contexts: List[str] = Field(
        description="Retrieved context chunks for the questions from the RAG system"
    )


class EvaluationRequest(BaseModel):
    dataset_name: str = Field(description="Name of the evaluation dataset")
    questions: List[str] = Field(description="Questions that are evaluated")
    ground_truths: List[str] = Field(
        description="Ground truth answers for the questions"
    )
    answers: List[str] = Field(
        description="Answers from the RAG system for the questions"
    )
    retrieved_contexts: List[List[str]] = Field(
        description="Retrieved context chunks for the questions from the RAG system, each question has a list of context chunks"
    )


@router.post("/evaluate")
async def evaluate(request: EvaluationRequest):
    """
    Evaluate the RAG system using multiple Ragas metrics including faithfulness and context recall.
    """
    try:
        from ragas import EvaluationDataset
        from ragas import evaluate
        from ragas.llms import LangchainLLMWrapper
        from langchain_openai import ChatOpenAI
        from ragas.metrics import (
            faithfulness,
            context_recall,
            answer_relevancy,
            context_precision,
        )
        from datetime import datetime, timezone
        import pandas as pd

        llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
        evaluator_llm = LangchainLLMWrapper(llm)

        logger.info(f"Number of questions: {len(request.questions)}")
        logger.info(f"Number of context lists: {len(request.retrieved_contexts)}")
        for i, ctx_list in enumerate(request.retrieved_contexts):
            if i < 2:
                logger.info(f"Question {i}: '{request.questions[i]}'")
                logger.info(f"Context list {i} has {len(ctx_list)} segments")
                for j, ctx in enumerate(ctx_list[:2]):
                    logger.info(f"  Context {j} (first 100 chars): {ctx[:100]}...")

        df = pd.DataFrame(
            {
                "user_input": request.questions,
                "response": request.answers,
                "ground_truth": request.ground_truths,
                "reference": request.ground_truths,
                "retrieved_contexts": request.retrieved_contexts,
            }
        )

        logger.info(f"DataFrame columns: {df.columns.tolist()}")
        if len(df) > 0:
            sample_row = df.iloc[0].to_dict()
            logger.info(f"Sample row user_input: {sample_row['user_input']}")
            logger.info(
                f"Sample row retrieved_contexts type: {type(sample_row['retrieved_contexts'])}"
            )
            if isinstance(sample_row["retrieved_contexts"], list):
                logger.info(
                    f"Sample row retrieved_contexts length: {len(sample_row['retrieved_contexts'])}"
                )
                if len(sample_row["retrieved_contexts"]) > 0:
                    logger.info(
                        f"First context type: {type(sample_row['retrieved_contexts'][0])}"
                    )

        evaluation_dataset = EvaluationDataset.from_pandas(df)

        result = evaluate(
            dataset=evaluation_dataset,
            metrics=[faithfulness, context_recall, answer_relevancy, context_precision],
            llm=evaluator_llm,
        )

        result_df = result.to_pandas()

        metrics_summary = {}
        for metric in [
            "faithfulness",
            "context_recall",
            "answer_relevancy",
            "context_precision",
        ]:
            if metric in result_df.columns:
                metrics_summary[metric] = float(result_df[metric].mean())
            else:
                metrics_summary[metric] = 0.0
                logger.warning(f"Metric {metric} not found in evaluation results")

        evaluations = result_df.to_dict("records")

        evaluation_results = {
            "name": f"{request.dataset_name}_{datetime.now(timezone.utc).isoformat()}",
            "dataset_name": request.dataset_name,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "questions": request.questions,
            "ground_truths": request.ground_truths,
            "answers": request.answers,
            "retrieved_contexts": request.retrieved_contexts,
            "metrics_summary": metrics_summary,
            "evaluations": evaluations,
        }

        mongodb_client = MongoDBClient.get_instance()

        inserted_id = mongodb_client.persist_docs(
            docs=[evaluation_results], collection_name="evaluation_results"
        )

        evaluation_results["_id"] = (
            str(inserted_id[0]) if isinstance(inserted_id, list) else str(inserted_id)
        )

        return {
            "status": "success",
            "evaluation_id": evaluation_results["_id"],
            "metrics_summary": metrics_summary,
            "evaluations": evaluations,
            "response": evaluation_results,
        }
    except Exception as e:
        logger.error(f"Error evaluating dataset: {str(e)}")
        import traceback

        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=500, detail=f"Error evaluating dataset: {str(e)}"
        )


class EnhancedEvaluationRequest(BaseModel):
    dataset_name: str = Field(description="Name of the evaluation dataset")
    chatbot_id: str = Field(description="ID of the chatbot used for evaluation")
    questions: List[str] = Field(description="Questions that are evaluated")
    ground_truths: List[str] = Field(
        description="Ground truth answers for the questions"
    )
    answers: List[str] = Field(
        description="Answers from the RAG system for the questions"
    )
    retrieved_contexts: List[List[str]] = Field(
        description="Retrieved context chunks for the questions from the RAG system, each question has a list of context chunks"
    )


@router.post("/evaluate-chatbot")
async def evaluate_chatbot(request: EnhancedEvaluationRequest):
    """
    Evaluate the RAG system using multiple Ragas metrics including faithfulness and context recall.
    Also save chatbot information, dataset details, and evaluation results.
    """
    try:
        from ragas import EvaluationDataset
        from ragas import evaluate
        from ragas.llms import LangchainLLMWrapper
        from langchain_openai import ChatOpenAI
        from ragas.metrics import (
            faithfulness,
            context_recall,
            answer_relevancy,
            context_precision,
        )
        from datetime import datetime, timezone
        import pandas as pd
        from bson.objectid import ObjectId

        llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
        evaluator_llm = LangchainLLMWrapper(llm)

        logger.info(f"Number of questions: {len(request.questions)}")
        logger.info(f"Number of context lists: {len(request.retrieved_contexts)}")
        for i, ctx_list in enumerate(request.retrieved_contexts):
            if i < 2:
                logger.info(f"Question {i}: '{request.questions[i]}'")
                logger.info(f"Context list {i} has {len(ctx_list)} segments")

        df = pd.DataFrame(
            {
                "user_input": request.questions,
                "response": request.answers,
                "ground_truth": request.ground_truths,
                "reference": request.ground_truths,
                "retrieved_contexts": request.retrieved_contexts,
            }
        )

        logger.info(f"DataFrame columns: {df.columns.tolist()}")
        if len(df) > 0:
            sample_row = df.iloc[0].to_dict()
            logger.info(f"Sample row user_input: {sample_row['user_input']}")
            logger.info(
                f"Sample row retrieved_contexts type: {type(sample_row['retrieved_contexts'])}"
            )
            if isinstance(sample_row["retrieved_contexts"], list):
                logger.info(
                    f"Sample row retrieved_contexts length: {len(sample_row['retrieved_contexts'])}"
                )

        evaluation_dataset = EvaluationDataset.from_pandas(df)

        result = evaluate(
            dataset=evaluation_dataset,
            metrics=[faithfulness, context_recall, answer_relevancy, context_precision],
            llm=evaluator_llm,
        )

        result_df = result.to_pandas()

        metrics_summary = {}
        for metric in [
            "faithfulness",
            "context_recall",
            "answer_relevancy",
            "context_precision",
        ]:
            if metric in result_df.columns:
                metrics_summary[metric] = float(result_df[metric].mean())
            else:
                metrics_summary[metric] = 0.0
                logger.warning(f"Metric {metric} not found in evaluation results")

        evaluations = result_df.to_dict("records")

        mongodb_client = MongoDBClient.get_instance()

        chatbot_info = mongodb_client.get_docs(
            filter={"_id": ObjectId(request.chatbot_id)}, collection_name="chatbots"
        )

        if not chatbot_info:
            raise HTTPException(
                status_code=404,
                detail=f"Chatbot with ID {request.chatbot_id} not found",
            )

        chatbot_data = chatbot_info[0]

        dataset_info = mongodb_client.get_collection("evaluation_datasets").find_one(
            {"name": request.dataset_name}
        )

        eval_timestamp = datetime.now(timezone.utc)
        evaluation_results = {
            "name": f"{request.dataset_name}_{eval_timestamp.isoformat()}",
            "timestamp": eval_timestamp.isoformat(),
            "chatbot": {
                "id": str(chatbot_data.get("_id")),
                "name": chatbot_data.get("chatbot_name", "Unknown"),
                "workflow": chatbot_data.get("workflow", "linear"),
                "llm": chatbot_data.get("llm", "Unknown"),
                "collections": chatbot_data.get("collections", []),
                "hyde": chatbot_data.get("hyde", False),
                "hybrid_search": chatbot_data.get("hybrid_search", True),
                "top_k": chatbot_data.get("top_k", 10),
                "reranking": chatbot_data.get("reranking", False),
                "reranker": chatbot_data.get("reranker", ""),
            },
            "dataset": {
                "name": request.dataset_name,
                "id": str(dataset_info.get("_id")) if dataset_info else None,
                "source_collection": (
                    dataset_info.get("source_collection") if dataset_info else None
                ),
                "generated_at": (
                    dataset_info.get("generated_at") if dataset_info else None
                ),
                "generator": dataset_info.get("generator") if dataset_info else None,
                "num_questions": len(request.questions),
            },
            "evaluation": {
                "metrics_summary": metrics_summary,
                "metrics_details": evaluations,
                "question_answer_pairs": [
                    {"question": q, "ground_truth": gt, "answer": a, "contexts": ctx}
                    for q, gt, a, ctx in zip(
                        request.questions,
                        request.ground_truths,
                        request.answers,
                        request.retrieved_contexts,
                    )
                ],
            },
        }

        inserted_id = mongodb_client.persist_docs(
            docs=[evaluation_results], collection_name="evaluations"
        )

        evaluation_results["_id"] = (
            str(inserted_id[0]) if isinstance(inserted_id, list) else str(inserted_id)
        )

        return {
            "status": "success",
            "evaluation_id": evaluation_results["_id"],
            "metrics_summary": metrics_summary,
            "chatbot": evaluation_results["chatbot"],
            "dataset": evaluation_results["dataset"],
        }

    except Exception as e:
        logger.error(f"Error evaluating chatbot: {str(e)}")
        import traceback

        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=500, detail=f"Error evaluating chatbot: {str(e)}"
        )


@router.get("/evaluations")
async def get_evaluations():
    """
    Retrieve all evaluation results.
    """
    try:
        mongodb_client = MongoDBClient.get_instance()
        evaluations = list(mongodb_client.get_collection("evaluations").find({}))

        for eval in evaluations:
            eval["_id"] = str(eval["_id"])

            if "evaluation" in eval and "metrics_summary" in eval["evaluation"]:
                metrics = eval["evaluation"]["metrics_summary"]
                for key, value in metrics.items():
                    if isinstance(value, float) and (
                        math.isnan(value) or math.isinf(value)
                    ):
                        metrics[key] = None

            if "evaluation" in eval and "metrics_details" in eval["evaluation"]:
                for detail in eval["evaluation"]["metrics_details"]:
                    for key, value in list(detail.items()):
                        if isinstance(value, float) and (
                            math.isnan(value) or math.isinf(value)
                        ):
                            detail[key] = None

        return {"status": "success", "evaluations": evaluations}
    except Exception as e:
        logger.error(f"Error retrieving evaluations: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Error retrieving evaluations: {str(e)}"
        )


import math


@router.get("/evaluations/{evaluation_id}")
async def get_evaluation_by_id(evaluation_id: str):
    """
    Retrieve a specific evaluation by ID.
    """
    try:
        from bson.objectid import ObjectId

        mongodb_client = MongoDBClient.get_instance()
        evaluation = mongodb_client.get_collection("evaluations").find_one(
            {"_id": ObjectId(evaluation_id)}
        )

        if not evaluation:
            raise HTTPException(
                status_code=404, detail=f"Evaluation with ID {evaluation_id} not found"
            )

        evaluation["_id"] = str(evaluation["_id"])

        if "evaluation" in evaluation and "metrics_summary" in evaluation["evaluation"]:
            metrics = evaluation["evaluation"]["metrics_summary"]
            for key, value in metrics.items():
                if isinstance(value, float) and (
                    math.isnan(value) or math.isinf(value)
                ):
                    metrics[key] = None

        if "evaluation" in evaluation and "metrics_details" in evaluation["evaluation"]:
            for detail in evaluation["evaluation"]["metrics_details"]:
                for key, value in list(detail.items()):
                    if isinstance(value, float) and (
                        math.isnan(value) or math.isinf(value)
                    ):
                        detail[key] = None

        return {"status": "success", "evaluation": evaluation}
    except Exception as e:
        logger.error(f"Error retrieving evaluation: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Error retrieving evaluation: {str(e)}"
        )
