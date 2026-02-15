"""
Application settings
"""

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # ── Database ──────────────────────────────────────────
    QDRANT_HOST: str = "localhost"
    QDRANT_PORT: int = 6333
    MONGODB_URL: str = "mongodb://localhost:27017"
    MONGODB_NAME: str = "Lume"

    # ── API Keys ──────────────────────────────────────────
    OPENAI_API_KEY: SecretStr = SecretStr("")
    COHERE_API_KEY: SecretStr = SecretStr("")
    LLAMA_CLOUD_API_KEY: SecretStr = SecretStr("")
    TAVILY_API_KEY: SecretStr = SecretStr("")

    # ── External Services ─────────────────────────────────
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    PHOENIX_COLLECTOR_ENDPOINT: str = "http://localhost:6006"

    # ── Feature Flags ─────────────────────────────────────
    USE_GPU: bool = False
    ENABLE_PHOENIX: bool = False
    ENABLE_OLLAMA: bool = False
    DEPLOYMENT_MODE: str = "dev"

    # ── Misc ──────────────────────────────────────────────
    TZ: str = "Europe/Berlin"

    @property
    def qdrant_url(self) -> str:
        return f"http://{self.QDRANT_HOST}:{self.QDRANT_PORT}"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()
