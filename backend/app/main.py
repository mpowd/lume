"""
Main FastAPI application
"""

from backend.config import settings
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
from pathlib import Path
from dotenv import load_dotenv
import os

env_path = Path(__file__).parent.parent.parent / ".env.dev"
if not env_path.exists():
    env_path = Path(__file__).parent.parent.parent / ".env"
load_dotenv(env_path)

print(f"🔍 Loading env from: {env_path}")
print(f"🔍 QDRANT_HOST: {os.getenv('QDRANT_HOST')}")
print(f"🔍 MONGODB_URL: {os.getenv('MONGODB_URL')}")

# Import to register all assistants
import backend.core.assistants

# Import routes
from backend.api.routes import (
    assistants,
    executions,
    knowledge_base,
    evaluation,
    ollama,
)
from backend.api.routes.sources import website
from backend.api.routes.sources import file


logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)

logger = logging.getLogger(__name__)

# configure the Phoenix tracer
if settings.ENABLE_PHOENIX:
    from phoenix.otel import register

    logger.info("no" * 100)
    tracer_provider = register(
        project_name="lume",
        auto_instrument=True,
    )


app = FastAPI(
    title="AI Assistant Platform",
    description="Platform for creating and managing AI assistants",
    version="2.0.0",
)

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
app.include_router(executions.router, prefix="/execute", tags=["executions"])
app.include_router(
    knowledge_base.router, prefix="/knowledge_base", tags=["knowledge_base"]
)
app.include_router(website.router, prefix="/website", tags=["website"])
app.include_router(file.router, prefix="/file", tags=["file"])
app.include_router(evaluation.router, prefix="/evaluation", tags=["evaluation"])
app.include_router(ollama.router, prefix="/ollama", tags=["ollama"])


@app.on_event("startup")
async def startup_event():
    """Application startup"""
    logger.info("=" * 60)
    logger.info(
        f"Registered assistant types: {backend.core.assistants.AssistantRegistry.list_types()}"
    )


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "message": "AI Assistant Platform is running",
        "version": "2.0.0",
        "assistant_types": backend.core.assistants.AssistantRegistry.list_types(),
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}
