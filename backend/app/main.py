"""
Main FastAPI application
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import to register all assistants
import backend.core.assistants

# Import routes
from backend.api.routes import (
    assistants,
    evaluation,
    knowledge_base,
    ollama,
)
from backend.api.routes.sources import file, website
from backend.app.exception_handlers import register_exception_handlers
from backend.config import settings

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)

logger = logging.getLogger(__name__)

# configure the Phoenix tracer
if settings.ENABLE_PHOENIX:
    from phoenix.otel import register

    tracer_provider = register(
        project_name="lume",
        auto_instrument=True,
    )


app = FastAPI(
    title="AI Assistant Platform",
    description="Platform for creating and managing AI assistants",
    version="2.0.0",
)
register_exception_handlers(app)


# CORS middleware
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

# Include routers
app.include_router(assistants.router, prefix="/assistants", tags=["assistants"])
app.include_router(
    knowledge_base.router, prefix="/knowledge_base", tags=["knowledge_base"]
)
app.include_router(website.router, prefix="/website", tags=["website"])
app.include_router(file.router, prefix="/file", tags=["file"])
app.include_router(evaluation.router, prefix="/evaluation", tags=["evaluation"])
app.include_router(ollama.router, prefix="/ollama", tags=["ollama"])


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Code before the yield is executed before the application starts
    logger.info("=" * 60)
    logger.info("Application startup")
    logger.info(
        f"Registered assistant types: {backend.core.assistants.AssistantRegistry.list_types()}"
    )
    yield
    # Code after the yield is executed after the application has finished
    logger.info("=" * 60)
    logger.info("Application shutdown")


@app.get("/")
async def root():
    return {
        "message": "AI Assistant Platform is running",
        "version": "2.0.0",
        "assistant_types": backend.core.assistants.AssistantRegistry.list_types(),
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}
