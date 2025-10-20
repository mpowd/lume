"""
API routes for assistant execution
"""

from fastapi import APIRouter, HTTPException
from backend.schemas.assistant import ExecutionRequest, ExecutionResponse
from backend.services.assistant_service import get_assistant_service
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/", response_model=ExecutionResponse)
async def execute_assistant(request: ExecutionRequest):
    """Execute an assistant with input data"""
    try:
        logger.info(f"Executing assistant {request.assistant_id}")

        service = get_assistant_service()

        result = await service.execute_assistant(
            assistant_id=request.assistant_id, input_data=request.input_data
        )

        return ExecutionResponse(**result)

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error executing assistant: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/qa")
async def execute_qa_assistant(assistant_id: str, question: str):
    """
    Convenience endpoint for QA assistants
    Backwards compatible with old chat endpoint
    """
    try:
        service = get_assistant_service()

        # Check if assistant exists and is QA type
        assistant = service.get_assistant(assistant_id)
        if not assistant:
            raise HTTPException(status_code=404, detail="Assistant not found")

        if assistant["type"] != "qa":
            raise HTTPException(
                status_code=400,
                detail=f"Assistant is of type '{assistant['type']}', not 'qa'",
            )

        # Execute
        result = await service.execute_assistant(
            assistant_id=assistant_id, input_data={"question": question}
        )

        if result["status"] == "failed":
            raise HTTPException(status_code=500, detail=result["error"])

        # Extract QA-specific fields
        output = result["output"]

        return {
            "response": output.get("answer", ""),
            "contexts": output.get("contexts", []),
            "source_urls": output.get("sources", []),
            "execution_time": result.get("execution_time"),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in QA execution: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
