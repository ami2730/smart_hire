"""
Tests for Skill, Experience, Education, and Final Scoring — Phase 6.
"""

from __future__ import annotations

import pytest

from app.ml.scoring import (
    calculate_education_match,
    calculate_experience_match,
    calculate_final_score,
    calculate_skill_match,
    estimate_candidate_experience_years,
)
from app.schemas.candidate import CandidateProfile
from app.schemas.job import JobProfile
from app.services.scoring_service import ScoringService


class TestSkillMatching:
    """Unit tests for calculate_skill_match (Section 16)."""

    def test_partial_skill_match_example(self) -> None:
        """Section 16 example: 4 of 5 matched = 80.0%."""
        candidate_skills = ["Python", "Django", "FastAPI", "PostgreSQL", "Docker"]
        job_skills = ["Python", "Django", "PostgreSQL", "Docker", "Kubernetes"]

        result = calculate_skill_match(candidate_skills, job_skills)

        assert result.score == 80.0
        assert set(result.matched_skills) == {"Python", "Django", "PostgreSQL", "Docker"}
        assert result.missing_skills == ["Kubernetes"]

    def test_full_skill_match(self) -> None:
        skills = ["Python", "PostgreSQL", "REST API"]
        result = calculate_skill_match(skills, skills)
        assert result.score == 100.0
        assert len(result.missing_skills) == 0

    def test_empty_required_skills_returns_full_score(self) -> None:
        result = calculate_skill_match(["Python", "React"], [])
        assert result.score == 100.0
        assert len(result.missing_skills) == 0

    def test_zero_match(self) -> None:
        cand = ["Java", "Spring"]
        job = ["Python", "Django"]
        result = calculate_skill_match(cand, job)
        assert result.score == 0.0
        assert len(result.matched_skills) == 0
        assert len(result.missing_skills) == 2


class TestExperienceMatching:
    """Unit tests for calculate_experience_match (Section 17)."""

    def test_candidate_exceeds_requirement(self) -> None:
        """Section 17 example: Required 3 years, Candidate 4 years -> score 100, meets=True."""
        result = calculate_experience_match(candidate_years=4.0, required_years=3.0)
        assert result.score == 100.0
        assert result.meets_requirement is True
        assert result.required_years == 3.0
        assert result.candidate_years == 4.0

    def test_candidate_below_requirement(self) -> None:
        result = calculate_experience_match(candidate_years=2.0, required_years=4.0)
        assert result.score == 50.0
        assert result.meets_requirement is False

    def test_zero_experience_required(self) -> None:
        result = calculate_experience_match(candidate_years=0.0, required_years=0.0)
        assert result.score == 100.0
        assert result.meets_requirement is True

    def test_experience_estimation_from_text(self) -> None:
        text = "Backend Developer with 4 years of experience in Python."
        years = estimate_candidate_experience_years([], raw_text=text)
        assert years == 4.0

    def test_experience_estimation_from_date_ranges(self) -> None:
        items = ["Software Engineer (2019 - 2024)"]
        years = estimate_candidate_experience_years(items)
        assert years == 5.0


class TestEducationMatching:
    """Unit tests for calculate_education_match (Section 18)."""

    def test_candidate_meets_degree_requirement(self) -> None:
        cand_edu = ["B.S. in Computer Science"]
        job_edu = ["Bachelor degree in relevant field"]
        result = calculate_education_match(cand_edu, job_edu)
        assert result.matched is True
        assert result.score == 100.0

    def test_candidate_exceeds_degree_requirement(self) -> None:
        cand_edu = ["Master of Science in Software Engineering"]
        job_edu = ["Bachelor of Science required"]
        result = calculate_education_match(cand_edu, job_edu)
        assert result.matched is True
        assert result.score == 100.0

    def test_candidate_adjacent_degree(self) -> None:
        cand_edu = ["Bachelor in Information Systems"]
        job_edu = ["Master degree required"]
        result = calculate_education_match(cand_edu, job_edu)
        assert result.matched is False
        assert result.score == 75.0

    def test_no_education_required(self) -> None:
        result = calculate_education_match(["Some degree"], [])
        assert result.matched is True
        assert result.score == 100.0


class TestFinalScoringFormula:
    """Unit tests for calculate_final_score (Section 20)."""

    def test_weighted_formula_default_weights(self) -> None:
        """Section 20 formula verification:
        Final = 0.50*skill + 0.25*exp + 0.15*edu + 0.10*sem
        Skill=92, Exp=80, Edu=90, Sem=87
        0.50*92 + 0.25*80 + 0.15*90 + 0.10*87 = 46.0 + 20.0 + 13.5 + 8.7 = 88.2
        """
        final_score, components = calculate_final_score(
            skill_score=92.0,
            experience_score=80.0,
            education_score=90.0,
            semantic_similarity=87.0,
        )
        assert final_score == 88.2
        assert components.skill_match == 92.0
        assert components.experience_match == 80.0
        assert components.education_match == 90.0
        assert components.semantic_similarity == 87.0

    def test_custom_weights(self) -> None:
        custom_weights = {
            "skill": 0.70,
            "experience": 0.30,
            "education": 0.0,
            "semantic": 0.0,
        }
        final_score, _ = calculate_final_score(
            skill_score=100.0,
            experience_score=50.0,
            education_score=0.0,
            semantic_similarity=0.0,
            weights=custom_weights,
        )
        # 0.70 * 100 + 0.30 * 50 = 70 + 15 = 85.0
        assert final_score == 85.0


class TestScoringServiceIntegration:
    """Integration test based on Section 29 benchmark specification."""

    def test_realistic_screening_scenario(self) -> None:
        """Section 29 realistic test case:
        Resume: Backend Developer with 4 years of experience using Python, Django, PostgreSQL, REST APIs and Docker.
        Job: Backend Software Engineer requiring Python, PostgreSQL, REST API and 3 years of experience.
        Expected: High skill match, high experience match, high semantic similarity, high overall score.
        """
        service = ScoringService()

        cand_profile = CandidateProfile(
            skills=["Python", "Django", "PostgreSQL", "REST API", "Docker"],
            experience=["Backend Developer with 4 years of experience using Python and PostgreSQL"],
            education=["B.S. in Computer Science"],
            job_titles=["Backend Developer"],
            sections={"summary": "Backend Developer with 4 years of experience"},
            raw_text="Backend Developer with 4 years of experience using Python, Django, PostgreSQL, REST APIs and Docker.",
            processed_text="backend developer with 4 years of experience using python django postgresql rest api and docker",
        )

        job_profile = JobProfile(
            job_title="Backend Software Engineer",
            skills=["Python", "PostgreSQL", "REST API"],
            education=["Bachelor degree"],
            experience_requirements={"minimum_years": 3.0},
            processed_text="backend software engineer requiring python postgresql rest api and 3 years of experience",
        )

        result = service.score_candidate_profile(cand_profile, job_profile)

        # Candidate has all 3 required skills (Python, PostgreSQL, REST API)
        assert result.skill_match.score == 100.0
        # Candidate has 4 years, requires 3 years
        assert result.experience_match.score == 100.0
        assert result.experience_match.meets_requirement is True
        # Candidate has B.S. in CS
        assert result.education_match.score == 100.0
        # High overall composite score
        assert result.overall_score > 85.0
