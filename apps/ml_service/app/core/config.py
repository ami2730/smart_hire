"""
SmartHire ML Service — Application Configuration.

All settings are loaded from environment variables (or .env file).
Never hardcode secrets or production values here.
"""

from __future__ import annotations

import os
from functools import lru_cache
from typing import Literal

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # -----------------------------------------------------------------
    # Service identity
    # -----------------------------------------------------------------
    service_name: str = "smarthire-ml-service"
    version: str = "1.0.0"

    # -----------------------------------------------------------------
    # Server
    # -----------------------------------------------------------------
    ml_service_host: str = "0.0.0.0"
    ml_service_port: int = 8000

    # -----------------------------------------------------------------
    # Environment
    # -----------------------------------------------------------------
    environment: Literal["development", "staging", "production"] = "development"
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = "INFO"

    # -----------------------------------------------------------------
    # File handling
    # -----------------------------------------------------------------
    max_file_size_mb: int = 10

    @property
    def max_file_size_bytes(self) -> int:
        """Return maximum upload size in bytes."""
        return self.max_file_size_mb * 1024 * 1024

    # -----------------------------------------------------------------
    # Model / data paths
    # -----------------------------------------------------------------
    model_dir: str = "./models"
    skills_file: str = "./app/data/skills/skills.json"
    skill_aliases_file: str = "./app/data/mappings/skill_aliases.json"

    # -----------------------------------------------------------------
    # Inter-service
    # -----------------------------------------------------------------
    node_backend_url: str = "http://localhost:3000"

    # -----------------------------------------------------------------
    # CORS
    # -----------------------------------------------------------------
    allowed_origins: list[str] = ["http://localhost:3000", "http://localhost:3001"]

    # -----------------------------------------------------------------
    # Gemini AI (Dedicated NLP, Extraction & Explanations Engine)
    # -----------------------------------------------------------------
    gemini_api_key: str | None = None
    gemini_model: str = "gemini-1.5-flash"
    use_gemini_nlp: bool = True

    # -----------------------------------------------------------------
    # Scoring weights  (must sum to 1.0)
    # -----------------------------------------------------------------
    weight_skill_match: float = 0.50
    weight_experience_match: float = 0.25
    weight_education_match: float = 0.15
    weight_semantic_similarity: float = 0.10

    @field_validator("weight_skill_match", "weight_experience_match",
                     "weight_education_match", "weight_semantic_similarity",
                     mode="before")
    @classmethod
    def weights_must_be_positive(cls, v: float) -> float:
        if float(v) < 0 or float(v) > 1:
            raise ValueError("Scoring weights must be between 0 and 1.")
        return float(v)

    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    @property
    def is_development(self) -> bool:
        return self.environment == "development"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return cached application settings (singleton)."""
    return Settings()
