"""
Question Answering Assistant with RAG
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from .base import BaseAssistant, AssistantConfig, AssistantInput, AssistantOutput
from .registry import AssistantRegistry
import logging

logger = logging.getLogger(__name__)


class QAAssistantConfig(AssistantConfig):
    """Configuration for QA Assistant"""

    type: str = "qa"
    knowledge_base_ids: List[str]
    llm_model: str = "gpt-4o-mini"
    llm_provider: str = "openai"  # openai or ollama

    # Retrieval settings
    hybrid_search: bool = True
    top_k: int = 10
    use_hyde: bool = False
    hyde_prompt: Optional[str] = None

    # Reranking settings
    reranking: bool = False
    reranker_provider: Optional[str] = "cohere"  # cohere or huggingface
    reranker_model: Optional[str] = "rerank-v3.5"
    top_n: Optional[int] = None

    # Generation settings
    rag_prompt: Optional[str] = None
    precise_citation: bool = False


class QAAssistantInput(AssistantInput):
    """Input for QA Assistant"""

    question: str
    context: Optional[Dict[str, Any]] = Field(default_factory=dict)


class QAAssistantOutput(AssistantOutput):
    """Output from QA Assistant"""

    answer: str
    sources: List[Dict[str, Any]] = Field(default_factory=list)
    contexts: List[str] = Field(default_factory=list)


@AssistantRegistry.register("qa")
class QAAssistant(BaseAssistant):
    """Question Answering Assistant with RAG"""

    assistant_type = "qa"

    def __init__(self):
        from backend.core.components.retrievers.hybrid_retriever import HybridRetriever
        from backend.core.components.generators.llm_generator import LLMGenerator

        self.retriever = HybridRetriever()
        self.generator = LLMGenerator()

    def get_config_schema(self) -> type[BaseModel]:
        return QAAssistantConfig

    def get_input_schema(self) -> type[BaseModel]:
        return QAAssistantInput

    async def execute(
        self, config: QAAssistantConfig, input_data: QAAssistantInput
    ) -> QAAssistantOutput:
        """Execute QA with RAG"""

        try:
            logger.info(f"Executing QA Assistant with question: {input_data.question}")

            # Step 1: Retrieve relevant documents
            logger.info(
                f"Retrieving documents from knowledge bases: {config.knowledge_base_ids}"
            )
            retrieved_docs = await self.retriever.retrieve(
                query=input_data.question,
                knowledge_base_ids=config.knowledge_base_ids,
                config={
                    "hybrid_search": config.hybrid_search,
                    "top_k": config.top_k,
                    "use_hyde": config.use_hyde,
                    "hyde_prompt": config.hyde_prompt,
                    "llm_model": config.llm_model,
                    "llm_provider": config.llm_provider,
                    "reranking": config.reranking,
                    "reranker_provider": config.reranker_provider,
                    "reranker_model": config.reranker_model,
                    "top_n": config.top_n,
                },
            )

            logger.info(f"Retrieved {len(retrieved_docs)} documents")

            # Step 2: Generate answer
            logger.info(f"Generating answer with LLM: {config.llm_model}")
            generation_result = await self.generator.generate(
                query=input_data.question,
                documents=retrieved_docs,
                config={
                    "llm_model": config.llm_model,
                    "llm_provider": config.llm_provider,
                    "rag_prompt": config.rag_prompt,
                    "precise_citation": config.precise_citation,
                    "reranking": config.reranking,
                },
            )

            logger.info(f"Successfully generated answer")

            return QAAssistantOutput(
                result=generation_result["answer"],
                answer=generation_result["answer"],
                sources=generation_result.get("sources", []),
                contexts=generation_result.get("contexts", []),
                metadata={
                    "retrieved_docs_count": len(retrieved_docs),
                    "llm_model": config.llm_model,
                },
            )

        except Exception as e:
            logger.error(f"Error executing QA Assistant: {str(e)}", exc_info=True)
            raise

    def supports_evaluation(self) -> bool:
        return True
