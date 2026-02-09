from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional
from pathlib import Path
import os

# Suche nach .env.dev oder .env
env_file = Path(__file__).parent.parent / ".env.dev"
if not env_file.exists():
    env_file = Path(__file__).parent.parent / ".env"

print(f"🔍 Config file: {env_file}")
print(f"🔍 Exists: {env_file.exists()}")

class Settings(BaseSettings):
    QDRANT_HOST: str
    QDRANT_PORT: int
    MONGODB_URL: str
    
    # API Keys
    OPENAI_API_KEY: str = ""
    COHERE_API_KEY: str = ""
    LLAMA_CLOUD_API_KEY: str = ""
    TAVILY_API_KEY: str = ""
    
    # Config
    USE_GPU: bool = False
    ENABLE_PHOENIX: bool = False
    ENABLE_OLLAMA: bool = False
    DEPLOYMENT_MODE: str = "dev"
    
    # URLs
    PHOENIX_COLLECTOR_ENDPOINT: str = "http://localhost:6006"
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    
    # Timezone
    TZ: str = "Europe/Berlin"
    
    model_config = SettingsConfigDict(
        env_file=str(env_file) if env_file.exists() else None,
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )

settings = Settings()

# Debug output
print(f"✅ Settings loaded:")
print(f"   QDRANT_HOST: {settings.QDRANT_HOST}")
print(f"   MONGODB_URL: {settings.MONGODB_URL}")