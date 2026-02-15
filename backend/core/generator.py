"""
LLM answer generator
"""

import logging
from collections.abc import AsyncIterator
from typing import Any

from langchain_core.documents import Document
from langchain_core.output_parsers import PydanticOutputParser, StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field

from backend.core.llm import get_chat_llm
from backend.core.utils import (
    extract_sources,
    format_context,
    format_context_with_indices,
)

logger = logging.getLogger(__name__)


# ── Default prompts ──────────────────────────────────────

DEFAULT_SYSTEM_PROMPT = """You are a helpful assistant that answers questions using only the provided context.
Answer conversationally without mentioning the context or chunks to the user."""

DEFAULT_USER_PROMPT = """Context:
{context}

Question: {question}"""

DEFAULT_PRECISE_CITATION_SYSTEM = """You are answering questions using provided context chunks.
Each chunk is numbered starting from 0. Track which chunks you use.

Instructions:
1. Answer using ONLY information from the chunks
2. Track which chunk numbers you actually used
3. Only include chunk indices you directly referenced
4. Do not include the used chunks in the answer

{format_instructions}"""

DEFAULT_PRECISE_CITATION_USER = """Context Chunks:
{context_with_indices}

Question: {question}"""


class CitedAnswer(BaseModel):
    """Structured output for precise citation mode."""

    answer: str = Field(description="The answer to the user's question")
    used_chunk_indices: list[int] = Field(
        description="List of chunk indices (0-based) used to generate the answer"
    )


async def generate(
    query: str,
    documents: list[Document],
    config: dict[str, Any],
) -> dict[str, Any]:
    """
    Generate an answer from retrieved documents.

    Args:
        query: The user's question.
        documents: Retrieved context documents.
        config: Assistant config dict with keys:
            - llm_model, llm_provider
            - system_prompt, user_prompt
            - precise_citation (bool)
            - precise_citation_system_prompt, precise_citation_user_prompt

    Returns:
        Dict with 'answer', 'sources', and 'contexts'.
    """
    llm = get_chat_llm(
        model=config.get("llm_model"),
        provider=config.get("llm_provider"),
    )

    if config.get("precise_citation", False):
        return _generate_precise(query, documents, config, llm)
    else:
        return _generate_standard(query, documents, config, llm)


def _generate_standard(
    query: str, documents: list[Document], config: dict[str, Any], llm
) -> dict[str, Any]:
    """Standard generation — stream-compatible chain."""
    system_prompt = config.get("system_prompt", DEFAULT_SYSTEM_PROMPT)
    user_prompt = config.get("user_prompt", DEFAULT_USER_PROMPT)

    prompt = ChatPromptTemplate.from_messages(
        [("system", system_prompt), ("user", user_prompt)]
    )

    chain = (
        {
            "context": lambda x: format_context(x["documents"]),
            "question": lambda x: x["question"],
        }
        | prompt
        | llm
        | StrOutputParser()
    )

    answer = chain.invoke({"documents": documents, "question": query})

    include_all = not config.get("reranking", False)
    return {
        "answer": answer,
        "sources": extract_sources(documents, include_without_scores=include_all),
        "contexts": [doc.page_content for doc in documents],
    }


def _generate_precise(
    query: str, documents: list[Document], config: dict[str, Any], llm
) -> dict[str, Any]:
    """Precise citation mode — returns answer with chunk indices."""
    logger.info("Using precise citation mode")
    parser = PydanticOutputParser(pydantic_object=CitedAnswer)

    system_prompt = config.get(
        "precise_citation_system_prompt", DEFAULT_PRECISE_CITATION_SYSTEM
    )
    user_prompt = config.get(
        "precise_citation_user_prompt", DEFAULT_PRECISE_CITATION_USER
    )

    prompt = ChatPromptTemplate.from_messages(
        [("system", system_prompt), ("user", user_prompt)]
    )

    chain = (
        {
            "context_with_indices": lambda x: format_context_with_indices(
                x["documents"]
            ),
            "question": lambda x: x["question"],
            "format_instructions": lambda x: parser.get_format_instructions(),
        }
        | prompt
        | llm
        | parser
    )

    result = chain.invoke({"documents": documents, "question": query})

    valid_indices = [i for i in result.used_chunk_indices if 0 <= i < len(documents)]
    if len(valid_indices) != len(result.used_chunk_indices):
        logger.warning("Model hallucinated some chunk indices")

    used_docs = [documents[i] for i in valid_indices]
    include_all = not config.get("reranking", False)

    return {
        "answer": result.answer,
        "sources": extract_sources(used_docs, include_without_scores=include_all),
        "contexts": [doc.page_content for doc in used_docs],
    }


async def generate_stream(
    query: str,
    documents: list[Document],
    config: dict[str, Any],
) -> AsyncIterator:
    """
    Stream answer tokens. Falls back to non-streaming for precise citation.

    Yields:
        str tokens for standard mode, or a dict result for precise citation.
    """
    llm = get_chat_llm(
        model=config.get("llm_model"),
        provider=config.get("llm_provider"),
    )

    if config.get("precise_citation", False):
        # Precise citation can't stream — yield the full result
        result = _generate_precise(query, documents, config, llm)
        yield result
    else:
        system_prompt = config.get("system_prompt", DEFAULT_SYSTEM_PROMPT)
        user_prompt = config.get("user_prompt", DEFAULT_USER_PROMPT)

        prompt = ChatPromptTemplate.from_messages(
            [("system", system_prompt), ("user", user_prompt)]
        )

        chain_input = {
            "context": lambda x: format_context(x["documents"]),
            "question": lambda x: x["question"],
        }

        # Inject reference text variables into the chain
        references = config.get("references", [])
        for ref in references:
            ref_name = ref.get("name")
            ref_text = ref.get("text")
            if ref_name and ref_text:
                chain_input[ref_name] = (lambda text: lambda x: text)(ref_text)

        chain = chain_input | prompt | llm | StrOutputParser()

        for token in chain.stream({"documents": documents, "question": query}):
            yield token
