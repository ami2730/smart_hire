"""
Candidate Schemas.

Pydantic models for candidate profiles, extracted entities, and analysis responses.
"""

from __future__ import annotations

from pydantic import BaseModel, Field


class CandidateProfile(BaseModel):
    """Structured candidate profile extracted from a resume document."""

    skills: list[str] = Field(
        default_factory=list,
        description="Canonical skills identified in the candidate's resume.",
    )
    education: list[str] = Field(
        default_factory=list,
        description="Educational qualifications, degrees, and academic backgrounds.",
    )
    experience: list[str] = Field(
        default_factory=list,
        description="Work experience entries, roles, or career milestones.",
    )
    job_titles: list[str] = Field(
        default_factory=list,
        description="Extracted professional job titles.",
    )
    sections: dict[str, str | None] = Field(
        default_factory=dict,
        description="Parsed resume sections (e.g., summary, skills, experience, education).",
    )
    raw_text: str = Field(..., description="Original plain text extracted from the document.")
    processed_text: str = Field(..., description="Cleaned and normalized text representation.")

    model_config = {
        "json_schema_extra": {
            "example": {
                "skills": ["Python", "FastAPI", "PostgreSQL", "Docker"],
                "education": ["B.S. in Computer Science"],
                "experience": ["Backend Engineer at TechCorp (4 years)"],
                "job_titles": ["Backend Engineer", "Software Engineer"],
                "sections": {
                    "summary": "Experienced backend developer...",
                    "skills": "Python, FastAPI, PostgreSQL, Docker",
                    "experience": "Backend Engineer at TechCorp...",
                    "education": "B.S. in Computer Science...",
                    "projects": "SmartHire ML Service..."
                },
                "raw_text": "...",
                "processed_text": "..."
            }
        }
    }


class CandidateAnalysisResponse(BaseModel):
    """Response payload for POST /api/v1/resume/analyze."""

    candidate_profile: CandidateProfile
