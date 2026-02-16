"""
API routes for Ollama integration
"""

import logging

import httpx
from fastapi import APIRouter, HTTPException

from backend.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/models", operation_id="listOllamaModels")
async def list_ollama_models():
    """Fetch available models from the Ollama instance."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{settings.OLLAMA_BASE_URL}/api/tags")
            response.raise_for_status()
            return response.json()
    except httpx.TimeoutException as e:
        logger.error("Timeout connecting to Ollama at %s", settings.OLLAMA_BASE_URL)
        raise HTTPException(
            status_code=504,
            detail="Ollama service timeout. Make sure Ollama is running.",
        ) from e
    except httpx.ConnectError as e:
        logger.error("Cannot connect to Ollama at %s", settings.OLLAMA_BASE_URL)
        raise HTTPException(
            status_code=503,
            detail="Cannot connect to Ollama. Make sure Ollama is running.",
        ) from e
    except httpx.HTTPStatusError as e:
        logger.error("Ollama returned %s: %s", e.response.status_code, e.response.text)
        raise HTTPException(
            status_code=e.response.status_code,
            detail=f"Ollama error: {e.response.text}",
        ) from e
