"""
Maps domain exceptions to HTTP responses.
"""

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from backend.app.exceptions import (
    AssistantInactiveError,
    CollectionAlreadyExistsError,
    DatasetAlreadyExistsError,
    NotFoundError,
    ValidationError,
)


def register_exception_handlers(app: FastAPI) -> None:

    @app.exception_handler(NotFoundError)
    async def not_found_handler(request: Request, exc: NotFoundError):
        return JSONResponse(status_code=404, content={"detail": str(exc)})

    @app.exception_handler(ValidationError)
    async def validation_handler(request: Request, exc: ValidationError):
        return JSONResponse(status_code=400, content={"detail": str(exc)})

    @app.exception_handler(AssistantInactiveError)
    async def inactive_handler(request: Request, exc: AssistantInactiveError):
        return JSONResponse(status_code=409, content={"detail": str(exc)})

    @app.exception_handler(CollectionAlreadyExistsError)
    async def collection_exists_handler(
        request: Request, exc: CollectionAlreadyExistsError
    ):
        return JSONResponse(status_code=409, content={"detail": str(exc)})

    @app.exception_handler(DatasetAlreadyExistsError)
    async def dataset_exists_handler(request: Request, exc: DatasetAlreadyExistsError):
        return JSONResponse(status_code=409, content={"detail": str(exc)})
