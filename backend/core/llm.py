"""
LLM factory
"""

import logging

from langchain_core.language_models import BaseChatModel
from langchain_ollama import ChatOllama
from langchain_openai import ChatOpenAI

from backend.config import settings

logger = logging.getLogger(__name__)


def get_chat_llm(
    model: str = "gpt-4o",
    provider: str = "openai",
    temperature: float = 0,
    **kwargs,
) -> BaseChatModel:
    """
    Create a chat LLM instance.

    Args:
        model: Model name (e.g. "gpt-4o", "gpt-4o-mini", "llama3").
        provider: "openai" or "ollama".
        temperature: Sampling temperature.
        **kwargs: Additional provider-specific arguments.

    Returns:
        A LangChain chat model instance.

    Raises:
        ValueError: If the provider is not supported.
    """
    if provider == "openai":
        return ChatOpenAI(model=model, temperature=temperature, **kwargs)
    elif provider == "ollama":
        return ChatOllama(
            model=model,
            temperature=temperature,
            base_url=settings.OLLAMA_BASE_URL,
            **kwargs,
        )
    else:
        raise ValueError(
            f"Unsupported LLM provider: {provider}. Supported: openai, ollama"
        )
