"""
Job Schemas.

Pydantic models for job requirement analysis requests and responses.
"""

from __future__ import annotations

from typing import Any
from pydantic import BaseModel, Field, field_validator


class JobAnalysisRequest(BaseModel):
    """Input payload for POST /api/v1/job/analyze."""

    job_title: str = Field(..., min_length=1, description="Title of the job posting.")
    description: str = Field(..., min_length=1, description="Full job description text.")
    required_skills: list[str] = Field(
        default_factory=list,
        description="Explicitly specified required skills.",
    )
    education: list[str] = Field(
        default_factory=list,
        description="Required or preferred educational degrees/backgrounds.",
    )
    minimum_experience_years: float = Field(
        default=0.0,
        ge=0.0,
        description="Minimum years of required professional experience.",
    )

    @field_validator("job_title", "description", mode="before")
    @classmethod
    def strip_text(cls, v: Any) -> str:
        if isinstance(v, str):
            stripped = v.strip()
            if not stripped:
                raise ValueError("Field cannot be empty or only whitespace.")
            return stripped
        return str(v)

    model_config = {
        "json_schema_extra": {
            "example": {
                "job_title": "Backend Software Engineer",
                "description": "Backend Software Engineer with knowledge of Python and databases.",
                "required_skills": [
                    "Python",
                    "PostgreSQL",
                    "REST API"
                ],
                "education": ["Bachelor in Computer Science"],
                "minimum_experience_years": 3.0
            }
        }
    }


class JobProfile(BaseModel):
    """Structured, normalized job requirement profile."""

    job_title: str = Field(..., description="Job title.")
    skills: list[str] = Field(
        default_factory=list,
        description="Canonical skills required for the job (combining explicit list and description).",
    )
    education: list[str] = Field(
        default_factory=list,
        description="Normalized education requirements.",
    )
    experience_requirements: dict[str, Any] = Field(
        default_factory=dict,
        description="Structured experience requirements including minimum_years.",
    )
    processed_text: str = Field(
        ...,
        description="Normalized text used for TF-IDF vectorization and semantic matching.",
    )

    model_config = {
        "json_schema_extra": {
            "example": {
                "job_title": "Backend Software Engineer",
                "skills": ["PostgreSQL", "Python", "REST API"],
                "education": ["Bachelor in Computer Science"],
                "experience_requirements": {
                    "minimum_years": 3.0
                },
                "processed_text": "backend software engineer with knowledge of python and databases postgresql rest api"
            }
        }
    }


class JobAnalysisResponse(BaseModel):
    """Response payload for POST /api/v1/job/analyze."""

    job_profile: JobProfile
