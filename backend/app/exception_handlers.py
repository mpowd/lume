from fastapi import Request
from fastapi.responses import JSONResponse

from backend.services.assistant_service import (
    AssistantInactiveError,
    AssistantNotFoundError,
    AssistantValidationError,
)


def register_exception_handlers(app):
    @app.exception_handler(AssistantNotFoundError)
    async def not_found_handler(request: Request, exc: AssistantNotFoundError):
        return JSONResponse(status_code=404, content={"detail": str(exc)})

    @app.exception_handler(AssistantValidationError)
    async def validation_handler(request: Request, exc: AssistantValidationError):
        return JSONResponse(status_code=400, content={"detail": str(exc)})

    @app.exception_handler(AssistantInactiveError)
    async def inactive_handler(request: Request, exc: AssistantInactiveError):
        return JSONResponse(status_code=400, content={"detail": str(exc)})
