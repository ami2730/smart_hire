"""
Screening and Ranking Schemas.

Pydantic models for single candidate screening evaluations and batch candidate rankings.
"""

from __future__ import annotations

from typing import Any, Literal
from pydantic import BaseModel, Field


class JobScreeningInput(BaseModel):
    """Job specifications for screening evaluation."""

    title: str = Field(..., description="Job title.")
    description: str = Field(default="", description="Job description text.")
    required_skills: list[str] = Field(
        default_factory=list,
        description="Explicit required skills.",
    )
    minimum_experience_years: float = Field(
        default=0.0,
        ge=0.0,
        description="Minimum years of required experience.",
    )
    education_requirements: list[str] = Field(
        default_factory=list,
        description="Required educational degree levels or fields.",
    )


class CandidateScreeningInput(BaseModel):
    """Candidate details for screening evaluation."""

    id: str = Field(..., description="Unique identifier for the candidate.")
    resume_text: str = Field(default="", description="Extracted resume text.")
    skills: list[str] = Field(default_factory=list, description="Candidate skills.")
    experience: list[str] = Field(default_factory=list, description="Candidate experience milestones.")
    education: list[str] = Field(default_factory=list, description="Candidate education qualifications.")


class SingleScreeningRequest(BaseModel):
    """Request payload for POST /api/v1/screening/evaluate."""

    job: JobScreeningInput
    candidate: CandidateScreeningInput


class ScreeningExplanation(BaseModel):
    """Structured and transparent explanation of scoring components."""

    overall_score: float = Field(..., ge=0.0, le=100.0)
    components: dict[str, float]
    matching_skills: list[str]
    missing_skills: list[str]
    experience: dict[str, Any]
    education: dict[str, Any]
    summary_text: str = Field(..., description="Human-readable transparent summary narrative.")


RecommendationLabel = Literal["strong_match", "good_match", "moderate_match", "low_match"]


class SingleScreeningResponse(BaseModel):
    """Response payload for POST /api/v1/screening/evaluate."""

    candidate_id: str
    match_score: float = Field(..., ge=0.0, le=100.0)
    recommendation: RecommendationLabel
    components: dict[str, float]
    matching_skills: list[str]
    missing_skills: list[str]
    explanation: ScreeningExplanation


class RankedCandidateItem(BaseModel):
    """Ranked candidate entry within ranking response."""

    candidate_id: str
    rank: int = Field(..., ge=1)
    score: float = Field(..., ge=0.0, le=100.0)
    recommendation: RecommendationLabel
    explanation: dict[str, Any] | None = None


class BatchRankRequest(BaseModel):
    """Request payload for POST /api/v1/screening/rank."""

    job_id: str = Field(..., description="Unique job posting ID.")
    job: JobScreeningInput
    candidates: list[CandidateScreeningInput]


class BatchRankResponse(BaseModel):
    """Response payload for POST /api/v1/screening/rank."""

    job_id: str
    candidates: list[RankedCandidateItem]
