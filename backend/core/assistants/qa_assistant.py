"""
Question Answering Assistant with RAG.

Orchestrates the retrieve → generate pipeline using core/ building blocks.
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

    def get_config_schema(self) -> type[BaseModel]:
        return QAAssistantConfig

    def get_input_schema(self) -> type[BaseModel]:
        return QAAssistantInput

    async def execute(
        self,
        config: QAAssistantConfig,
        input_data: QAAssistantInput,
        stream: bool = False,
    ):
        """
        Execute QA pipeline: retrieve → generate.

        When stream=False: yields a single QAAssistantOutput.
        When stream=True: yields str tokens, then a final metadata dict.
        """
        from ..generator import generate, generate_stream
        from ..retriever import retrieve

        try:
            logger.info(f"Executing QA (stream={stream}): {input_data.question}")

            # Step 1: Retrieve
            retrieved_docs = []
            if config.knowledge_base_ids:
                retrieved_docs = await retrieve(
                    query=input_data.question,
                    knowledge_base_ids=config.knowledge_base_ids,
                    config=config.model_dump(),
                )
            logger.info(f"Retrieved {len(retrieved_docs)} documents")

            config_dict = config.model_dump()

            if stream:
                # Streaming mode: yield tokens then metadata
                urls = [doc.metadata.get("source_url") for doc in retrieved_docs]
                contexts = [doc.page_content for doc in retrieved_docs]

                async for chunk in generate_stream(
                    query=input_data.question,
                    documents=retrieved_docs,
                    config=config_dict,
                ):
                    if isinstance(chunk, str):
                        yield chunk
                    else:
                        # Precise citation returns a dict
                        urls = chunk.get("sources")
                        contexts = chunk.get("contexts")
                        yield chunk.get("answer")

                yield {"source_urls": urls, "contexts": contexts}

            else:
                # Non-streaming mode: yield a single output
                result = await generate(
                    query=input_data.question,
                    documents=retrieved_docs,
                    config=config_dict,
                )

                yield QAAssistantOutput(
                    result=result["answer"],
                    answer=result["answer"],
                    sources=result.get("sources", []),
                    contexts=result.get("contexts", []),
                    metadata={
                        "retrieved_docs_count": len(retrieved_docs),
                        "llm_model": config.llm_model,
                    },
                )

        except Exception as e:
            logger.error(f"Error executing QA Assistant: {e}", exc_info=True)
            raise

    def supports_evaluation(self) -> bool:
        return True
