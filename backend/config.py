import os
from typing import Literal


class Settings:
    DEPLOYMENT_MODE: Literal["light", "gpu"] = os.getenv("DEPLOYMENT_MODE")
    USE_GPU: bool = os.getenv("USE_GPU").lower() == "true"
    ENABLE_PHOENIX: bool = os.getenv("ENABLE_PHOENIX").lower() == "true"
    ENABLE_OLLAMA: bool = os.getenv("ENABLE_OLLAMA").lower() == "true"
    PHOENIX_ENDPOINT: str = os.getenv("PHOENIX_ENDPOINT", "")


settings = Settings()
