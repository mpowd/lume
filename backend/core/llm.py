# backend/core/llm.py
from functools import lru_cache

from langchain_core.language_models import BaseChatModel
from langchain_ollama import ChatOllama
from langchain_openai import ChatOpenAI

from backend.config import settings


@lru_cache
def get_chat_llm(
    provider: str = "openai", model: str = "gpt-4o-mini", temperature: float = 0
) -> BaseChatModel:

    if provider == "ollama":
        return ChatOllama(
            model=model, temperature=temperature, base_url=settings.OLLAMA_BASE_URL
        )
    return ChatOpenAI(
        model=model, temperature=temperature, api_key=settings.OPENAI_API_KEY
    )
