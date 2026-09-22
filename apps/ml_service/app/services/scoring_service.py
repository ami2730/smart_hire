"""
Candidate Scoring Service.

Coordinates component evaluations (skill match, experience match, education match,
and semantic similarity) into a final weighted score.
"""

from __future__ import annotations

from typing import Any

from app.core.config import Settings, get_settings
from app.core.logging import get_logger
from app.ml.scoring import (
    calculate_education_match,
    calculate_experience_match,
    calculate_final_score,
    calculate_skill_match,
    estimate_candidate_experience_years,
)
from app.schemas.candidate import CandidateProfile
from app.schemas.job import JobProfile
from app.schemas.matching import CandidateScoreResult
from app.services.similarity_service import SimilarityService

logger = get_logger(__name__)


class ScoringService:
    """Service for computing multi-criteria candidate screening scores."""

    def __init__(
        self,
        similarity_service: SimilarityService | None = None,
        settings: Settings | None = None,
    ) -> None:
        self.similarity_service = similarity_service or SimilarityService()
        self.settings = settings or get_settings()

    @property
    def weights(self) -> dict[str, float]:
        """Return configurable scoring weights from settings."""
        return {
            "skill": self.settings.weight_skill_match,
            "experience": self.settings.weight_experience_match,
            "education": self.settings.weight_education_match,
            "semantic": self.settings.weight_semantic_similarity,
        }

    def score_candidate(
        self,
        candidate_skills: list[str],
        candidate_experience: list[str],
        candidate_education: list[str],
        candidate_processed_text: str,
        job_skills: list[str],
        job_required_years: float,
        job_education: list[str],
        job_processed_text: str,
        candidate_raw_text: str = "",
        semantic_similarity: float | None = None,
    ) -> CandidateScoreResult:
        """Calculate complete multi-criteria scores for a candidate against a job requirement."""
        # 1. Skill Match (50% default weight)
        skill_res = calculate_skill_match(
            candidate_skills=candidate_skills,
            required_skills=job_skills,
        )

        # 2. Experience Match (25% default weight)
        cand_years = estimate_candidate_experience_years(
            experience_items=candidate_experience,
            raw_text=candidate_raw_text,
        )
        exp_res = calculate_experience_match(
            candidate_years=cand_years,
            required_years=job_required_years,
        )

        # 3. Education Match (15% default weight)
        resolved_cand_edu = list(candidate_education) if candidate_education else []
        resolved_job_edu = list(job_education) if job_education else []

        if not resolved_cand_edu and candidate_raw_text:
            try:
                from app.nlp.entity_extractor import EntityExtractor
                resolved_cand_edu = EntityExtractor().extract_education(candidate_raw_text)
            except Exception:
                pass

        if not resolved_job_edu and job_processed_text:
            try:
                from app.nlp.entity_extractor import EntityExtractor
                resolved_job_edu = EntityExtractor().extract_education(job_processed_text)
            except Exception:
                pass

        edu_res = calculate_education_match(
            candidate_education=resolved_cand_edu,
            required_education=resolved_job_edu,
        )

        # 4. Semantic Similarity (10% default weight)
        if semantic_similarity is None:
            semantic_sim = self.similarity_service.calculate_similarity(
                candidate_text=candidate_processed_text,
                job_text=job_processed_text,
            )
        else:
            semantic_sim = semantic_similarity

        # 5. Final Composite Weighted Score
        final_score, components = calculate_final_score(
            skill_score=skill_res.score,
            experience_score=exp_res.score,
            education_score=edu_res.score,
            semantic_similarity=semantic_sim,
            weights=self.weights,
        )

        logger.info(
            "Scored candidate | final=%.2f | skill=%.1f | exp=%.1f | edu=%.1f | sem=%.1f",
            final_score,
            components.skill_match,
            components.experience_match,
            components.education_match,
            components.semantic_similarity,
        )

        return CandidateScoreResult(
            overall_score=final_score,
            components=components,
            skill_match=skill_res,
            experience_match=exp_res,
            education_match=edu_res,
        )

    def score_candidate_profile(
        self,
        candidate_profile: CandidateProfile,
        job_profile: JobProfile,
    ) -> CandidateScoreResult:
        """Convenience method to score structured candidate and job profiles."""
        min_years = float(job_profile.experience_requirements.get("minimum_years", 0.0))

        return self.score_candidate(
            candidate_skills=candidate_profile.skills,
            candidate_experience=candidate_profile.experience,
            candidate_education=candidate_profile.education,
            candidate_processed_text=candidate_profile.processed_text,
            job_skills=job_profile.skills,
            job_required_years=min_years,
            job_education=job_profile.education,
            job_processed_text=job_profile.processed_text,
            candidate_raw_text=candidate_profile.raw_text,
        )
