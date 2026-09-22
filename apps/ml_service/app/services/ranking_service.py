"""
Ranking Service.

Orchestrates batch candidate scoring, explanation generation, and deterministic ranking.
Supports batch vectorization optimization and handles candidate errors gracefully.
"""

from __future__ import annotations

from typing import Any

from app.core.logging import get_logger
from app.ml.ranking import rank_candidates
from app.schemas.job import JobAnalysisRequest
from app.schemas.screening import (
    BatchRankResponse,
    CandidateScreeningInput,
    JobScreeningInput,
    RankedCandidateItem,
)
from app.services.explanation_service import ExplanationService
from app.services.job_service import JobService
from app.services.preprocessing_service import PreprocessingService
from app.services.scoring_service import ScoringService
from app.services.similarity_service import SimilarityService
from app.services.skill_service import SkillService

logger = get_logger(__name__)


class RankingService:
    """Service for scoring and ranking multiple candidates against a job requirement."""

    def __init__(
        self,
        scoring_service: ScoringService | None = None,
        explanation_service: ExplanationService | None = None,
        job_service: JobService | None = None,
        skill_service: SkillService | None = None,
        preprocessing_service: PreprocessingService | None = None,
        similarity_service: SimilarityService | None = None,
    ) -> None:
        self.scoring_service = scoring_service or ScoringService()
        self.explanation_service = explanation_service or ExplanationService()
        self.job_service = job_service or JobService()
        self.skill_service = skill_service or SkillService()
        self.preprocessing_service = preprocessing_service or PreprocessingService()
        self.similarity_service = similarity_service or SimilarityService()

    def rank_candidates_for_job(
        self,
        job_id: str,
        job_input: JobScreeningInput,
        candidates_input: list[CandidateScreeningInput],
    ) -> BatchRankResponse:
        """Process, score, and rank a batch of candidates against a job requirement.

        Args:
            job_id: ID of the job posting.
            job_input: Job requirements and description.
            candidates_input: List of candidate inputs to be evaluated and ranked.

        Returns:
            BatchRankResponse with deterministically ranked candidates and explanations.
        """
        if not candidates_input:
            return BatchRankResponse(job_id=job_id, candidates=[])

        # 1. Normalize job requirements
        job_analysis = self.job_service.analyze_job(
            JobAnalysisRequest(
                job_title=job_input.title,
                description=job_input.description,
                required_skills=job_input.required_skills,
                education=job_input.education_requirements,
                minimum_experience_years=job_input.minimum_experience_years,
            )
        )

        # 2. Preprocess candidate texts for batch similarity
        processed_candidates: list[dict[str, Any]] = []
        texts_for_similarity: list[str] = []

        for cand in candidates_input:
            cand_skills = set(cand.skills)
            if cand.resume_text:
                extracted = self.skill_service.extract_skills(cand.resume_text)
                cand_skills.update(extracted)

            cand_processed_text = (
                self.preprocessing_service.preprocess_text(cand.resume_text)
                if cand.resume_text
                else " ".join(cand_skills)
            )

            processed_candidates.append({
                "candidate": cand,
                "skills": sorted(cand_skills),
                "processed_text": cand_processed_text,
            })
            texts_for_similarity.append(cand_processed_text)

        # 3. Batch semantic similarity calculation (efficient single vectorization)
        batch_similarities = self.similarity_service.calculate_batch_similarity(
            candidate_texts=texts_for_similarity,
            job_text=job_analysis.processed_text,
        )

        candidates_data: list[dict[str, Any]] = []

        # 4. Score each candidate with precomputed similarity
        for idx, item in enumerate(processed_candidates):
            cand: CandidateScreeningInput = item["candidate"]
            sim_score = batch_similarities[idx] if idx < len(batch_similarities) else 0.0

            try:
                score_result = self.scoring_service.score_candidate(
                    candidate_skills=item["skills"],
                    candidate_experience=cand.experience,
                    candidate_education=cand.education,
                    candidate_processed_text=item["processed_text"],
                    job_skills=job_analysis.skills,
                    job_required_years=job_input.minimum_experience_years,
                    job_education=job_input.education_requirements,
                    job_processed_text=job_analysis.processed_text,
                    candidate_raw_text=cand.resume_text,
                    semantic_similarity=sim_score,
                )

                explanation = self.explanation_service.build_explanation(score_result)
                recommendation = self.explanation_service.get_recommendation(score_result.overall_score)

                candidates_data.append({
                    "candidate_id": cand.id,
                    "score": score_result.overall_score,
                    "skill_score": score_result.components.skill_match,
                    "recommendation": recommendation,
                    "explanation": explanation.model_dump(),
                })
            except Exception as exc:
                logger.error(
                    "Error scoring candidate %s: %s. Continuing with remaining candidates.",
                    cand.id,
                    exc,
                )
                # Graceful degradation: individual failure does not abort the entire batch
                candidates_data.append({
                    "candidate_id": cand.id,
                    "score": 0.0,
                    "skill_score": 0.0,
                    "recommendation": "low_match",
                    "explanation": {
                        "error": "Failed to process candidate data.",
                        "details": str(exc),
                    },
                })

        # 5. Deterministic ranking
        ranked_dicts = rank_candidates(candidates_data)

        ranked_items = [
            RankedCandidateItem(
                candidate_id=r["candidate_id"],
                rank=r["rank"],
                score=r["score"],
                recommendation=r["recommendation"],
                explanation=r["explanation"],
            )
            for r in ranked_dicts
        ]

        logger.info(
            "Batch screening completed | job_id=%s | total_candidates=%d",
            job_id,
            len(ranked_items),
        )

        return BatchRankResponse(
            job_id=job_id,
            candidates=ranked_items,
        )
