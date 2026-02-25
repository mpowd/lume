"""
Question Answering Assistant with RAG + optional conversation memory.
"""

import logging
from typing import Any

from pydantic import BaseModel, Field

from .base import AssistantConfig, AssistantInput, AssistantOutput, BaseAssistant
from .registry import AssistantRegistry

logger = logging.getLogger(__name__)

TITLE_PROMPT = """Based on this conversation, write a short title (max 6 words).
Return ONLY the title text — no quotes, no punctuation at the end, no explanation.
Use the same language as the conversation.

User: {question}
Assistant: {answer}

Title:"""


class QAAssistantConfig(AssistantConfig):
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

    # Memory
    memory_enabled: bool = False
    memory_window_k: int = 10


class QAAssistantInput(AssistantInput):
    question: str
    context: dict[str, Any] | None = Field(default_factory=dict)
    session_id: str | None = None
    memory_enabled: bool | None = None  # per-request override


class QAAssistantOutput(AssistantOutput):
    answer: str
    sources: list[dict[str, Any]] = Field(default_factory=list)
    contexts: list[str] = Field(default_factory=list)


@AssistantRegistry.register("qa")
class QAAssistant(BaseAssistant):
    assistant_type = "qa"

    def get_config_schema(self) -> type[BaseModel]:
        return QAAssistantConfig

    def get_input_schema(self) -> type[BaseModel]:
        return QAAssistantInput

    def _use_memory(
        self, config: QAAssistantConfig, input_data: QAAssistantInput
    ) -> bool:
        """Per-request flag wins; falls back to assistant config default."""
        if input_data.memory_enabled is not None:
            return input_data.memory_enabled
        return config.memory_enabled

    def _extract_assistant_id(self, session_id: str) -> str | None:
        """Extract assistant_id from session_id (format: '{assistantId}-{timestamp}')."""
        parts = session_id.rsplit("-", 1)
        return parts[0] if len(parts) == 2 else None

    async def _generate_title(
        self, config: QAAssistantConfig, question: str, answer: str
    ) -> str:
        """Ask the same LLM to produce a short conversation title."""
        try:
            from langchain_core.messages import HumanMessage

            from backend.core.llm import get_chat_llm

            llm = get_chat_llm(model=config.llm_model, provider=config.llm_provider)
            prompt = TITLE_PROMPT.format(question=question, answer=answer[:500])
            response = await llm.ainvoke([HumanMessage(content=prompt)])
            title = response.content.strip().strip('"').strip("'")
            return title or "New conversation"
        except Exception as e:
            logger.warning(f"Title generation failed: {e}")
            return "New conversation"

    async def execute(
        self,
        config: QAAssistantConfig,
        input_data: QAAssistantInput,
        stream: bool = False,
        conversation_repo=None,
    ):
        from ..generator import generate, generate_stream
        from ..retriever import retrieve

        try:
            logger.info(f"Executing QA (stream={stream}): {input_data.question}")

            use_memory = self._use_memory(config, input_data)
            session_id = input_data.session_id
            assistant_id = (
                self._extract_assistant_id(session_id) if session_id else None
            )

            # ── Load history for LLM context (only when memory is on) ─────────
            chat_history = []
            is_first_exchange = True
            if session_id and conversation_repo is not None:
                raw = conversation_repo.get_messages(session_id)
                is_first_exchange = len(raw) == 0
                if use_memory:
                    windowed = raw[-(config.memory_window_k * 2) :]
                    chat_history = _to_langchain_messages(windowed)
                    logger.info(
                        f"Loaded {len(chat_history)} history messages for session {session_id}"
                    )

            # ── Retrieve ──────────────────────────────────────────────────────
            retrieved_docs = []
            if config.knowledge_base_ids:
                retrieved_docs = await retrieve(
                    query=input_data.question,
                    knowledge_base_ids=config.knowledge_base_ids,
                    config=config.model_dump(),
                )
            logger.info(f"Retrieved {len(retrieved_docs)} documents")

            config_dict = {**config.model_dump(), "chat_history": chat_history}

            # ── Stream ────────────────────────────────────────────────────────
            if stream:
                urls = [doc.metadata.get("source_url") for doc in retrieved_docs]
                contexts = [doc.page_content for doc in retrieved_docs]
                full_response: list[str] = []

                async for chunk in generate_stream(
                    query=input_data.question,
                    documents=retrieved_docs,
                    config=config_dict,
                ):
                    if isinstance(chunk, str):
                        full_response.append(chunk)
                        yield chunk
                    else:
                        urls = chunk.get("sources")
                        contexts = chunk.get("contexts")
                        yield chunk.get("answer")

                answer_text = "".join(full_response)

                # Always persist — memory toggle only affects LLM context, not storage
                if session_id and conversation_repo is not None:
                    conversation_repo.append_messages(
                        session_id,
                        assistant_id,
                        [
                            {"role": "human", "content": input_data.question},
                            {"role": "ai", "content": answer_text},
                        ],
                    )
                    if is_first_exchange:
                        title = await self._generate_title(
                            config, input_data.question, answer_text
                        )
                        conversation_repo.set_title(session_id, title)
                        yield {"conversation_title": title, "session_id": session_id}

                yield {"source_urls": urls, "contexts": contexts}

            # ── Non-stream ────────────────────────────────────────────────────
            else:
                result = await generate(
                    query=input_data.question,
                    documents=retrieved_docs,
                    config=config_dict,
                )

                # Always persist
                if session_id and conversation_repo is not None:
                    conversation_repo.append_messages(
                        session_id,
                        assistant_id,
                        [
                            {"role": "human", "content": input_data.question},
                            {"role": "ai", "content": result["answer"]},
                        ],
                    )
                    if is_first_exchange:
                        title = await self._generate_title(
                            config, input_data.question, result["answer"]
                        )
                        conversation_repo.set_title(session_id, title)

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


# ── Helpers ───────────────────────────────────────────────────────────────────


def _to_langchain_messages(raw: list[dict]):
    from langchain_core.messages import AIMessage, HumanMessage

    mapping = {"human": HumanMessage, "ai": AIMessage}
    return [
        mapping[msg["role"]](content=msg["content"])
        for msg in raw
        if msg.get("role") in mapping
    ]
