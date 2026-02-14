"""
Question Answering Assistant with RAG
"""

import logging
from typing import Any

from pydantic import BaseModel, Field

from .base import AssistantConfig, AssistantInput, AssistantOutput, BaseAssistant
from .registry import AssistantRegistry

logger = logging.getLogger(__name__)


class QAAssistantConfig(AssistantConfig):
    """Configuration for QA Assistant"""

    knowledge_base_ids: list[str] = []
    opening_message: str = ""
    references: list[dict] = []
    llm_model: str = "gpt-4o"
    llm_provider: str = "openai"

    # Retrieval
    hybrid_search: bool = True
    top_k: int = 10
    use_hyde: bool = False
    hyde_prompt: str | None = None

    # Reranking
    reranking: bool = False
    reranker_provider: str | None = None
    reranker_model: str | None = None
    top_n: int | None = None

    # Prompts
    system_prompt: str | None = None
    user_prompt: str | None = None
    precise_citation: bool = False
    precise_citation_system_prompt: str | None = None
    precise_citation_user_prompt: str | None = None

    # General
    local_only: bool = False
    tools: list[str] = []
    max_steps: int = 4
    workflow: str = "linear"
    agentic_system_prompt: str | None = None


class QAAssistantInput(AssistantInput):
    """Input for QA Assistant"""

    question: str
    context: dict[str, Any] | None = Field(default_factory=dict)


class QAAssistantOutput(AssistantOutput):
    """Output from QA Assistant"""

    answer: str
    sources: list[dict[str, Any]] = Field(default_factory=list)
    contexts: list[str] = Field(default_factory=list)


@AssistantRegistry.register("qa")
class QAAssistant(BaseAssistant):
    """Question Answering Assistant with RAG"""

    assistant_type = "qa"

    def __init__(self):
        from backend.core.components.generators.llm_generator import LLMGenerator
        from backend.core.components.retrievers.hybrid_retriever import HybridRetriever

        self.retriever = HybridRetriever()
        self.generator = LLMGenerator()

    def get_config_schema(self) -> type[BaseModel]:
        return QAAssistantConfig

    def get_input_schema(self) -> type[BaseModel]:
        return QAAssistantInput

    async def execute(
        self, config: QAAssistantConfig, input_data: QAAssistantInput
    ) -> QAAssistantOutput:
        """Execute QA"""

        try:
            logger.info(f"Executing QA Assistant with question: {input_data.question}")

            # Step 1: Retrieve relevant documents
            logger.info(
                f"Retrieving documents from knowledge bases: {config.knowledge_base_ids}"
            )
            retrieved_docs = []
            if config.knowledge_base_ids:
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
                    "system_prompt": config.system_prompt,
                    "user_prompt": config.user_prompt,
                    "precise_citation": config.precise_citation,
                    "precise_citation_system_prompt": config.precise_citation_system_prompt,
                    "precise_citation_user_prompt": config.precise_citation_user_prompt,
                    "reranking": config.reranking,
                },
            )

            logger.info("Successfully generated answer")

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

    async def execute_stream(
        self, config: QAAssistantConfig, input_data: QAAssistantInput
    ):

        try:
            logger.info(
                f"Executing QA Assistant in streaming mode with question: {input_data.question}"
            )

            # Step 1: Retrieve relevant documents
            logger.info(
                f"Retrieving documents from knowledge bases: {config.knowledge_base_ids}"
            )
            retrieved_docs = []
            if config.knowledge_base_ids:
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

            urls = [doc.metadata.get("source_url") for doc in retrieved_docs]
            contexts = [doc.page_content for doc in retrieved_docs]

            async for chunk in self.generator.generate_stream(
                query=input_data.question,
                documents=retrieved_docs,
                config={
                    "llm_model": config.llm_model,
                    "llm_provider": config.llm_provider,
                    "system_prompt": config.system_prompt,
                    "user_prompt": config.user_prompt,
                    "precise_citation": config.precise_citation,
                    "precise_citation_system_prompt": config.precise_citation_system_prompt,
                    "precise_citation_user_prompt": config.precise_citation_user_prompt,
                    "reranking": config.reranking,
                    "references": config.references,
                },
            ):
                if isinstance(chunk, str):
                    yield chunk
                else:
                    urls = chunk.get("sources")
                    contexts = chunk.get("contexts")
                    yield chunk.get("answer")

            yield {
                "source_urls": urls,
                "contexts": contexts,
            }

        except Exception as e:
            logger.error(f"Error executing QA Assistant: {str(e)}", exc_info=True)
            raise

    def supports_evaluation(self) -> bool:
        return True
