import os
from typing import Optional, List
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DEFAULT_STORAGE = os.path.abspath(os.path.join(BASE_DIR, "..", "storage"))

class Settings(BaseSettings):
    ENVIRONMENT: str = "production"
    DATABASE_URL: str = "sqlite:///./app.db"
    SECRET_KEY: str = "supersecretkey_ai_project_advisor_production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 1 week

    EMBEDDING_PROVIDER: str = "openai"
    EMBEDDING_MODEL: str = "text-embedding-3-small"
    EMBEDDING_API_KEY: Optional[str] = None
    
    MAX_UPLOAD_SIZE_MB: int = 10
    CHUNK_SIZE: int = 1000
    CHUNK_OVERLAP: int = 200

    STORAGE_DIR: str = os.getenv("STORAGE_DIR", DEFAULT_STORAGE)
    
    # Comma-separated list of allowed origins or "*"
    CORS_ORIGINS: str = "*"

    @property
    def cors_origins_list(self) -> List[str]:
        if not self.CORS_ORIGINS or self.CORS_ORIGINS.strip() == "*":
            return ["*"]
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

settings = Settings()
