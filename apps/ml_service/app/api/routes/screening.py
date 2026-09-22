"""
Screening Routes.

Endpoints:
- POST /api/v1/screening/evaluate: Evaluates a single candidate against job requirements.
- POST /api/v1/screening/rank: Ranks multiple candidates deterministically (Phase 8).
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, status

from app.schemas.job import JobAnalysisRequest
from app.schemas.screening import (
    BatchRankRequest,
    BatchRankResponse,
    SingleScreeningRequest,
    SingleScreeningResponse,
)
from app.services.explanation_service import ExplanationService
from app.services.job_service import JobService
from app.services.preprocessing_service import PreprocessingService
from app.services.ranking_service import RankingService
from app.services.scoring_service import ScoringService
from app.services.skill_service import SkillService

router = APIRouter(prefix="/api/v1/screening", tags=["Screening"])


def get_scoring_service() -> ScoringService:
    return ScoringService()


def get_explanation_service() -> ExplanationService:
    return ExplanationService()


def get_job_service() -> JobService:
    return JobService()


def get_skill_service() -> SkillService:
    return SkillService()


def get_preprocessing_service() -> PreprocessingService:
    return PreprocessingService()


def get_ranking_service() -> RankingService:
    return RankingService()


@router.post(
    "/evaluate",
    response_model=SingleScreeningResponse,
    status_code=status.HTTP_200_OK,
    summary="Evaluate Single Candidate Screening",
    description=(
        "Evaluates a single candidate against a job description. "
        "Calculates multi-criteria scores (skill, experience, education, semantic similarity), "
        "produces a transparent breakdown, and assigns an advisory recommendation label "
        "(strong_match, good_match, moderate_match, low_match)."
    ),
)
async def evaluate_candidate(
    payload: SingleScreeningRequest,
    scoring_service: ScoringService = Depends(get_scoring_service),
    explanation_service: ExplanationService = Depends(get_explanation_service),
    job_service: JobService = Depends(get_job_service),
    skill_service: SkillService = Depends(get_skill_service),
    preprocessing_service: PreprocessingService = Depends(get_preprocessing_service),
) -> SingleScreeningResponse:
    """Evaluate a candidate's fit for a job posting."""
    job = payload.job
    candidate = payload.candidate

    # 1. Normalize job requirements
    job_profile = job_service.analyze_job(
        JobAnalysisRequest(
            job_title=job.title,
            description=job.description,
            required_skills=job.required_skills,
            education=job.education_requirements,
            minimum_experience_years=job.minimum_experience_years,
        )
    )

    # 2. Extract / normalize candidate skills
    cand_skills = set(candidate.skills)
    if candidate.resume_text:
        extracted_skills = skill_service.extract_skills(candidate.resume_text)
        cand_skills.update(extracted_skills)

    cand_processed_text = (
        preprocessing_service.preprocess_text(candidate.resume_text)
        if candidate.resume_text
        else " ".join(cand_skills)
    )

    # 3. Calculate multi-criteria scores
    score_result = scoring_service.score_candidate(
        candidate_skills=sorted(cand_skills),
        candidate_experience=candidate.experience,
        candidate_education=candidate.education,
        candidate_processed_text=cand_processed_text,
        job_skills=job_profile.skills,
        job_required_years=job.minimum_experience_years,
        job_education=job.education_requirements,
        job_processed_text=job_profile.processed_text,
        candidate_raw_text=candidate.resume_text,
    )

    # 4. Generate structured transparent explanation
    explanation = explanation_service.build_explanation(score_result, job_title=job.title)
    recommendation = explanation_service.get_recommendation(score_result.overall_score)

    components_map = {
        "skill_match": score_result.components.skill_match,
        "experience_match": score_result.components.experience_match,
        "education_match": score_result.components.education_match,
        "semantic_similarity": score_result.components.semantic_similarity,
    }

    return SingleScreeningResponse(
        candidate_id=candidate.id,
        match_score=score_result.overall_score,
        recommendation=recommendation,
        components=components_map,
        matching_skills=score_result.skill_match.matched_skills,
        missing_skills=score_result.skill_match.missing_skills,
        explanation=explanation,
    )


@router.post(
    "/rank",
    response_model=BatchRankResponse,
    status_code=status.HTTP_200_OK,
    summary="Batch Candidate Ranking",
    description="Scores and deterministically ranks a batch of candidates against a single job posting.",
)
async def rank_candidates_batch(
    payload: BatchRankRequest,
    ranking_service: RankingService = Depends(get_ranking_service),
) -> BatchRankResponse:
    """Rank multiple candidates for a job posting."""
    return ranking_service.rank_candidates_for_job(
        job_id=payload.job_id,
        job_input=payload.job,
        candidates_input=payload.candidates,
    )
