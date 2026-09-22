"""
Job and Matching routes.

Endpoints:
- POST /api/v1/job/analyze: Analyzes and normalizes job requirements into a JobProfile.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, status

from app.schemas.job import JobAnalysisRequest, JobAnalysisResponse
from app.services.job_service import JobService

router = APIRouter(prefix="/api/v1/job", tags=["Job Requirements"])


def get_job_service() -> JobService:
    """Dependency injection provider for JobService."""
    return JobService()


@router.post(
    "/analyze",
    response_model=JobAnalysisResponse,
    status_code=status.HTTP_200_OK,
    summary="Analyze Job Requirements",
    description=(
        "Normalizes job requirements using the same NLP pipeline as resumes. "
        "Extracts and canonicalizes required skills, normalizes text, "
        "and produces a structured job profile ready for similarity and scoring engines."
    ),
)
async def analyze_job_requirements(
    payload: JobAnalysisRequest,
    job_service: JobService = Depends(get_job_service),
) -> JobAnalysisResponse:
    """Analyze job posting inputs and return normalized JobProfile."""
    profile = job_service.analyze_job(payload)
    return JobAnalysisResponse(job_profile=profile)
