"""
Matching and Scoring Schemas.

Data models for component matching (skill, experience, education) and final composite scoring.
"""

from __future__ import annotations

from typing import Any
from pydantic import BaseModel, Field


class SkillMatchResult(BaseModel):
    """Result of comparing candidate skills against job required skills."""

    matched_skills: list[str] = Field(
        default_factory=list,
        description="Skills present in both candidate profile and job requirements.",
    )
    missing_skills: list[str] = Field(
        default_factory=list,
        description="Required skills that the candidate lacks.",
    )
    score: float = Field(
        ...,
        ge=0.0,
        le=100.0,
        description="Skill match score normalized to 0–100.",
    )

    model_config = {
        "json_schema_extra": {
            "example": {
                "matched_skills": ["Python", "Django", "PostgreSQL", "Docker"],
                "missing_skills": ["Kubernetes"],
                "score": 80.0
            }
        }
    }


class ExperienceMatchResult(BaseModel):
    """Result of comparing candidate experience against job requirements."""

    required_years: float = Field(..., ge=0.0, description="Minimum required years of experience.")
    candidate_years: float = Field(..., ge=0.0, description="Estimated/verified years of candidate experience.")
    score: float = Field(..., ge=0.0, le=100.0, description="Experience match score normalized to 0–100.")
    meets_requirement: bool = Field(..., description="True if candidate meets or exceeds required years.")

    model_config = {
        "json_schema_extra": {
            "example": {
                "required_years": 3.0,
                "candidate_years": 4.0,
                "score": 100.0,
                "meets_requirement": True
            }
        }
    }


class EducationMatchResult(BaseModel):
    """Result of comparing candidate educational qualifications against requirements."""

    matched: bool = Field(..., description="True if candidate education fulfills requirements.")
    score: float = Field(..., ge=0.0, le=100.0, description="Education match score normalized to 0–100.")
    details: str = Field(..., description="Transparent explanation of the education evaluation.")

    model_config = {
        "json_schema_extra": {
            "example": {
                "matched": True,
                "score": 90.0,
                "details": "Candidate degree (B.S. in Computer Science) matches requirement."
            }
        }
    }


class ScoringComponents(BaseModel):
    """Individual normalized 0–100 scores for all scoring dimensions."""

    skill_match: float = Field(..., ge=0.0, le=100.0, description="Skill match component score (50% weight).")
    experience_match: float = Field(..., ge=0.0, le=100.0, description="Experience match component score (25% weight).")
    education_match: float = Field(..., ge=0.0, le=100.0, description="Education match component score (15% weight).")
    semantic_similarity: float = Field(..., ge=0.0, le=100.0, description="Semantic TF-IDF similarity (10% weight).")


class CandidateScoreResult(BaseModel):
    """Composite screening and scoring result for a candidate."""

    overall_score: float = Field(..., ge=0.0, le=100.0, description="Weighted composite score (0–100).")
    components: ScoringComponents = Field(..., description="Breakdown of normalized component scores.")
    skill_match: SkillMatchResult = Field(..., description="Detailed skill match results.")
    experience_match: ExperienceMatchResult = Field(..., description="Detailed experience match results.")
    education_match: EducationMatchResult = Field(..., description="Detailed education match results.")
