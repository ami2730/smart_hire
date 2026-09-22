"""
Explanation Service.

Generates transparent, human-interpretable screening summaries and recommendations
strictly derived from verified scoring data.
"""

from __future__ import annotations

from typing import Any

from app.schemas.matching import CandidateScoreResult
from app.schemas.screening import RecommendationLabel, ScreeningExplanation
from app.services.gemini_service import GeminiService


class ExplanationService:
    """Service for constructing transparent score explanations and match recommendations."""

    def __init__(self, gemini_service: GeminiService | None = None) -> None:
        self.gemini_service = gemini_service or GeminiService()

    @staticmethod
    def get_recommendation(score: float) -> RecommendationLabel:
        """Map a composite score (0–100) to an AI-assisted recommendation label.

        Strictly advisory — never issues automated hire/reject decisions.
        """
        if score >= 85.0:
            return "strong_match"
        elif score >= 70.0:
            return "good_match"
        elif score >= 50.0:
            return "moderate_match"
        else:
            return "low_match"

    def build_explanation(
        self,
        score_result: CandidateScoreResult,
        job_title: str = "Position",
    ) -> ScreeningExplanation:
        """Construct a structured explanation from verified scoring data.

        Guarantees that generated narratives never contradict component numbers.
        """
        score = score_result.overall_score
        comps = score_result.components
        skill_res = score_result.skill_match
        exp_res = score_result.experience_match
        edu_res = score_result.education_match

        components_dict: dict[str, float] = {
            "skill_match": comps.skill_match,
            "experience_match": comps.experience_match,
            "education_match": comps.education_match,
            "semantic_similarity": comps.semantic_similarity,
        }

        experience_dict: dict[str, Any] = {
            "required": exp_res.required_years,
            "candidate": exp_res.candidate_years,
            "meets_requirement": exp_res.meets_requirement,
            "score": exp_res.score,
        }

        education_dict: dict[str, Any] = {
            "score": edu_res.score,
            "matched": edu_res.matched,
            "details": edu_res.details,
        }

        # Build narrative summary
        matched_count = len(skill_res.matched_skills)
        total_skills = matched_count + len(skill_res.missing_skills)

        skill_summary = (
            f"Matched {matched_count}/{total_skills} required skills ({comps.skill_match:.1f}%)."
            if total_skills > 0
            else "No specific technical skills required."
        )

        exp_status = "meets" if exp_res.meets_requirement else "does not meet"
        exp_summary = (
            f"Candidate has {exp_res.candidate_years} years experience, which {exp_status} "
            f"the {exp_res.required_years} years requirement."
            if exp_res.required_years > 0
            else "No minimum experience required."
        )

        recommendation = self.get_recommendation(score)
        rec_title = recommendation.replace("_", " ").title()

        # Generate narrative via Gemini if available, else use deterministic template
        gemini_narrative = None
        if self.gemini_service.is_enabled:
            gemini_narrative = self.gemini_service.generate_explanation(
                job_title=job_title,
                match_score=score,
                recommendation=rec_title,
                matched_skills=skill_res.matched_skills,
                missing_skills=skill_res.missing_skills,
                candidate_experience_years=exp_res.candidate_years,
                required_experience_years=exp_res.required_years,
            )

        summary_text = gemini_narrative or (
            f"Overall score: {score:.1f}/100 ({rec_title}). "
            f"{skill_summary} {exp_summary} "
            f"Semantic similarity score: {comps.semantic_similarity:.1f}/100. "
            f"Education: {edu_res.details}"
        )

        return ScreeningExplanation(
            overall_score=score,
            components=components_dict,
            matching_skills=skill_res.matched_skills,
            missing_skills=skill_res.missing_skills,
            experience=experience_dict,
            education=education_dict,
            summary_text=summary_text,
        )
