from fastapi import APIRouter, HTTPException
import httpx
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/models")
async def get_ollama_models():
    """Fetch available Ollama models from the host machine"""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get("http://host.docker.internal:11434/api/tags")
            response.raise_for_status()
            return response.json()
    except httpx.TimeoutException:
        logger.error("Timeout connecting to Ollama")
        raise HTTPException(
            status_code=504,
            detail="Ollama service timeout. Make sure Ollama is running on the host.",
        )
    except httpx.ConnectError:
        logger.error("Cannot connect to Ollama")
        raise HTTPException(
            status_code=503,
            detail="Cannot connect to Ollama. Make sure Ollama is running on the host.",
        )
    except Exception as e:
        logger.error(f"Error fetching Ollama models: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Failed to fetch Ollama models: {str(e)}"
        )
