"""
Main FastAPI application
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import backend.core.assistants
from backend.api.routes import assistants, evaluation, knowledge_base, ollama
from backend.app.exception_handlers import register_exception_handlers
from backend.config import settings

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

if settings.ENABLE_PHOENIX:
    from phoenix.otel import register

    tracer_provider = register(project_name="lume", auto_instrument=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("=" * 60)
    logger.info("Application startup")
    logger.info(
        f"Registered assistant types: {backend.core.assistants.AssistantRegistry.list_types()}"
    )
    yield
    logger.info("=" * 60)
    logger.info("Application shutdown")


app = FastAPI(
    title="AI Assistant Platform",
    description="Platform for creating and managing AI assistants",
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
app.include_router(assistants.router, prefix="/assistants", tags=["assistants"])
app.include_router(
    knowledge_base.router, prefix="/knowledge-base", tags=["knowledge-base"]
)
app.include_router(evaluation.router, prefix="/evaluation", tags=["evaluation"])
app.include_router(ollama.router, prefix="/integrations/ollama", tags=["integrations"])


@app.get("/")
async def root():
    return {
        "message": "AI Assistant Platform is running",
        "version": "2.0.0",
        "assistant_types": backend.core.assistants.AssistantRegistry.list_types(),
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
