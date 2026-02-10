from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    QDRANT_HOST: str = ""
    QDRANT_PORT: int = 0
    MONGODB_URL: str = ""

    # API Keys
    OPENAI_API_KEY: SecretStr = SecretStr("")
    COHERE_API_KEY: SecretStr = SecretStr("")
    LLAMA_CLOUD_API_KEY: SecretStr = SecretStr("")
    TAVILY_API_KEY: SecretStr = SecretStr("")

    # Config
    USE_GPU: bool = False
    ENABLE_PHOENIX: bool = False
    ENABLE_OLLAMA: bool = False
    DEPLOYMENT_MODE: str = "dev"

    # URLs
    PHOENIX_COLLECTOR_ENDPOINT: str = "http://localhost:6006"
    OLLAMA_BASE_URL: str = "http://localhost:11434"

    TZ: str = "Europe/Berlin"

    model_config = SettingsConfigDict(
        env_file=(".env"),
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()
