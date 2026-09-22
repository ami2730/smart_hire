"""
Tests for Candidate Ranking, Explainable Screening, and Evaluation Endpoints — Phase 7 & 8.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.ml.ranking import rank_candidates
from app.schemas.matching import (
    CandidateScoreResult,
    EducationMatchResult,
    ExperienceMatchResult,
    ScoringComponents,
    SkillMatchResult,
)
from app.services.explanation_service import ExplanationService


@pytest.fixture(scope="module")
def client() -> TestClient:
    return TestClient(app)


class TestRankingEngine:
    """Unit tests for candidate ranking logic (Section 21)."""

    def test_deterministic_descending_ranking(self) -> None:
        """Section 21 example: Candidate A (91.4), B (87.9), C (81.3), D (74.6)."""
        candidates = [
            {"candidate_id": "C", "score": 81.3, "skill_score": 80.0},
            {"candidate_id": "A", "score": 91.4, "skill_score": 95.0},
            {"candidate_id": "D", "score": 74.6, "skill_score": 70.0},
            {"candidate_id": "B", "score": 87.9, "skill_score": 90.0},
        ]

        ranked = rank_candidates(candidates)

        assert len(ranked) == 4
        assert ranked[0]["candidate_id"] == "A"
        assert ranked[0]["rank"] == 1
        assert ranked[1]["candidate_id"] == "B"
        assert ranked[1]["rank"] == 2
        assert ranked[2]["candidate_id"] == "C"
        assert ranked[2]["rank"] == 3
        assert ranked[3]["candidate_id"] == "D"
        assert ranked[3]["rank"] == 4

    def test_ranking_tie_breaking(self) -> None:
        """Ties broken by skill score, then candidate_id."""
        candidates = [
            {"candidate_id": "cand_2", "score": 85.0, "skill_score": 80.0},
            {"candidate_id": "cand_1", "score": 85.0, "skill_score": 90.0},
        ]
        ranked = rank_candidates(candidates)
        assert ranked[0]["candidate_id"] == "cand_1"
        assert ranked[1]["candidate_id"] == "cand_2"


class TestExplanationService:
    """Unit tests for explanation generation (Section 22 & 23)."""

    def test_recommendation_labels(self) -> None:
        service = ExplanationService()
        assert service.get_recommendation(92.0) == "strong_match"
        assert service.get_recommendation(78.0) == "good_match"
        assert service.get_recommendation(65.0) == "moderate_match"
        assert service.get_recommendation(42.0) == "low_match"

    def test_explanation_matches_numerical_components(self) -> None:
        service = ExplanationService()
        score_result = CandidateScoreResult(
            overall_score=88.95,
            components=ScoringComponents(
                skill_match=92.0,
                experience_match=80.0,
                education_match=90.0,
                semantic_similarity=87.0,
            ),
            skill_match=SkillMatchResult(
                matched_skills=["Python", "PostgreSQL", "Docker"],
                missing_skills=["Kubernetes"],
                score=75.0,
            ),
            experience_match=ExperienceMatchResult(
                required_years=3.0,
                candidate_years=4.0,
                score=100.0,
                meets_requirement=True,
            ),
            education_match=EducationMatchResult(
                matched=True,
                score=90.0,
                details="Candidate holds B.S. in Computer Science.",
            ),
        )

        explanation = service.build_explanation(score_result)

        assert explanation.overall_score == 88.95
        assert explanation.components["skill_match"] == 92.0
        assert explanation.components["experience_match"] == 80.0
        assert explanation.components["education_match"] == 90.0
        assert explanation.components["semantic_similarity"] == 87.0
        assert explanation.matching_skills == ["Python", "PostgreSQL", "Docker"]
        assert explanation.missing_skills == ["Kubernetes"]
        assert explanation.experience["meets_requirement"] is True
        assert "89.0/100" in explanation.summary_text or "88.9" in explanation.summary_text


class TestScreeningAPIEndpoints:
    """Integration tests for POST /api/v1/screening/evaluate and /rank."""

    def test_evaluate_endpoint_strong_candidate(self, client: TestClient) -> None:
        payload = {
            "job": {
                "title": "Backend Software Engineer",
                "description": "Building backend APIs in Python with PostgreSQL databases.",
                "required_skills": ["Python", "PostgreSQL", "REST API", "Docker"],
                "minimum_experience_years": 3.0,
                "education_requirements": ["Bachelor in Computer Science"],
            },
            "candidate": {
                "id": "cand-001",
                "resume_text": "Senior Backend Developer with 5 years experience in Python, PostgreSQL, REST API, Docker.",
                "skills": ["Python", "PostgreSQL", "REST API", "Docker"],
                "experience": ["Backend Engineer at CloudCorp (5 years)"],
                "education": ["B.S. in Computer Science"],
            },
        }

        response = client.post("/api/v1/screening/evaluate", json=payload)
        assert response.status_code == 200

        data = response.json()
        assert data["candidate_id"] == "cand-001"
        assert data["match_score"] >= 85.0
        assert data["recommendation"] == "strong_match"
        assert "Python" in data["matching_skills"]
        assert "PostgreSQL" in data["matching_skills"]
        assert "components" in data
        assert data["explanation"]["experience"]["meets_requirement"] is True

    def test_rank_endpoint_multiple_candidates(self, client: TestClient) -> None:
        payload = {
            "job_id": "job-101",
            "job": {
                "title": "Python Developer",
                "description": "Python web developer with PostgreSQL and Docker skills.",
                "required_skills": ["Python", "PostgreSQL", "Docker"],
                "minimum_experience_years": 3.0,
                "education_requirements": [],
            },
            "candidates": [
                {
                    "id": "cand_low",
                    "resume_text": "Junior entry level developer with 0.5 years HTML and CSS experience.",
                    "skills": ["HTML", "CSS"],
                    "experience": [],
                    "education": [],
                },
                {
                    "id": "cand_high",
                    "resume_text": "Senior Python Engineer with 5 years experience using Python, PostgreSQL, Docker.",
                    "skills": ["Python", "PostgreSQL", "Docker"],
                    "experience": ["5 years of experience"],
                    "education": ["B.S. in Computer Science"],
                },
            ],
        }

        response = client.post("/api/v1/screening/rank", json=payload)
        assert response.status_code == 200

        data = response.json()
        assert data["job_id"] == "job-101"
        ranked = data["candidates"]
        assert len(ranked) == 2
        # cand_high must be rank 1 with higher score than cand_low
        assert ranked[0]["candidate_id"] == "cand_high"
        assert ranked[0]["rank"] == 1
        assert ranked[1]["candidate_id"] == "cand_low"
        assert ranked[1]["rank"] == 2
        assert ranked[0]["score"] > ranked[1]["score"]

    def test_rank_endpoint_empty_candidates_list(self, client: TestClient) -> None:
        payload = {
            "job_id": "job-empty",
            "job": {
                "title": "Software Engineer",
                "description": "General role.",
                "required_skills": ["Python"],
            },
            "candidates": [],
        }
        response = client.post("/api/v1/screening/rank", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["job_id"] == "job-empty"
        assert data["candidates"] == []

    def test_rank_endpoint_four_candidates_strict_order(self, client: TestClient) -> None:
        payload = {
            "job_id": "job-4cands",
            "job": {
                "title": "Senior Python Backend Engineer",
                "description": "Requires Python, Django, PostgreSQL, Docker, AWS and 4 years experience.",
                "required_skills": ["Python", "Django", "PostgreSQL", "Docker", "AWS"],
                "minimum_experience_years": 4.0,
                "education_requirements": ["Bachelor in Computer Science"],
            },
            "candidates": [
                {
                    "id": "cand_D",
                    "resume_text": "Marketing specialist with some HTML.",
                    "skills": ["HTML"],
                    "experience": [],
                    "education": [],
                },
                {
                    "id": "cand_B",
                    "resume_text": "Backend developer with 3 years Python, Django, PostgreSQL.",
                    "skills": ["Python", "Django", "PostgreSQL"],
                    "experience": ["3 years of experience"],
                    "education": ["B.S. in Computer Science"],
                },
                {
                    "id": "cand_A",
                    "resume_text": "Lead Python Engineer with 6 years experience in Python, Django, PostgreSQL, Docker, AWS.",
                    "skills": ["Python", "Django", "PostgreSQL", "Docker", "AWS"],
                    "experience": ["6 years of experience"],
                    "education": ["Master in Computer Science"],
                },
                {
                    "id": "cand_C",
                    "resume_text": "Junior Python programmer with 1 year Python and Git.",
                    "skills": ["Python", "Git"],
                    "experience": ["1 year of experience"],
                    "education": ["High school diploma"],
                },
            ],
        }

        response = client.post("/api/v1/screening/rank", json=payload)
        assert response.status_code == 200
        data = response.json()
        candidates = data["candidates"]
        assert len(candidates) == 4

        # Ranks must be strictly sequential 1, 2, 3, 4
        ranks = [c["rank"] for c in candidates]
        assert ranks == [1, 2, 3, 4]

        # Scores must be strictly descending
        scores = [c["score"] for c in candidates]
        assert scores == sorted(scores, reverse=True)

        # Cand A should be #1, Cand D should be #4
        assert candidates[0]["candidate_id"] == "cand_A"
        assert candidates[0]["recommendation"] in ("strong_match", "good_match")
        assert candidates[3]["candidate_id"] == "cand_D"
        assert candidates[3]["recommendation"] == "low_match"
