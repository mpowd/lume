"""
Main FastAPI application
"""

import logging
from contextlib import asynccontextmanager

import colorlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.exception_handlers import register_exception_handlers
from backend.config import settings


def setup_logging() -> None:
    handler = colorlog.StreamHandler()
    handler.setFormatter(
        colorlog.ColoredFormatter(
            "%(log_color)s%(asctime)s - %(name)s - %(levelname)s - %(message)s",
            log_colors={
                "DEBUG": "cyan",
                "INFO": "green",
                "WARNING": "yellow",
                "ERROR": "red",
                "CRITICAL": "bold_red",
            },
        )
    )

    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)
    root_logger.handlers.clear()
    root_logger.addHandler(handler)

    logging.getLogger("backend").setLevel(logging.DEBUG)


setup_logging()
logger = logging.getLogger(__name__)

if settings.ENABLE_PHOENIX:
    from phoenix.otel import register

    tracer_provider = register(project_name="lume", auto_instrument=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    import backend.core.assistants  # noqa: F401 — triggers @register decorators

    logger.info("Application startup")
    logger.info(
        f"Registered assistant types: {backend.core.assistants.AssistantRegistry.list_types()}"
    )
    yield
    logger.info("Application shutdown")


app = FastAPI(
    title="Lume - AI Assistant Platform",
    description="Platform for creating and managing AI assistants with RAG",
    version="2.0.0",
    lifespan=lifespan,
)

register_exception_handlers(app)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)


# ── Routers ───────────────────────────────────────────────

from backend.api.routes import (  # noqa: E402
    assistants,
    evaluation,
    knowledge_base,
    ollama,
)

app.include_router(assistants.router, prefix="/assistants", tags=["assistants"])
app.include_router(
    knowledge_base.router, prefix="/knowledge-base", tags=["knowledge-base"]
)
app.include_router(evaluation.router, prefix="/evaluation", tags=["evaluation"])
app.include_router(ollama.router, prefix="/integrations/ollama", tags=["integrations"])


@app.get("/health", operation_id="healthCheck")
async def health_check():
    return {"status": "healthy"}
