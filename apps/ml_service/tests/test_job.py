"""
Tests for Job Requirement Analysis — Phase 4.

Verifies:
- JobService unit behavior
- Canonical skill resolution for job requirements
- Skill extraction from job descriptions
- Text normalization alignment with resume preprocessing pipeline
- Experience requirements extraction
- REST API endpoint: POST /api/v1/job/analyze
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.schemas.job import JobAnalysisRequest
from app.services.job_service import JobService


@pytest.fixture(scope="module")
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture
def job_service() -> JobService:
    return JobService()


class TestJobService:
    """Unit tests for JobService."""

    def test_analyze_job_with_explicit_skills_and_aliases(self, job_service: JobService) -> None:
        req = JobAnalysisRequest(
            job_title="Backend Software Engineer",
            description="Looking for an engineer to build scalable APIs using databases.",
            required_skills=["Python", "postgres db", "REST API", "nodejs"],
            education=["B.S. in Computer Science"],
            minimum_experience_years=3.0,
        )
        profile = job_service.analyze_job(req)

        assert profile.job_title == "Backend Software Engineer"
        # Verify alias resolution
        assert "Python" in profile.skills
        assert "PostgreSQL" in profile.skills
        assert "REST API" in profile.skills
        assert "Node.js" in profile.skills
        assert profile.experience_requirements["minimum_years"] == 3.0
        assert "B.S. in Computer Science" in profile.education
        # Verify processed text contains normalized terms
        assert "python" in profile.processed_text
        assert "postgresql" in profile.processed_text

    def test_extract_skills_from_description_when_not_in_required_skills(
        self, job_service: JobService
    ) -> None:
        req = JobAnalysisRequest(
            job_title="Full Stack Developer",
            description="We build web applications using React, FastAPI, and Docker in Linux environments.",
            required_skills=[],
            education=[],
            minimum_experience_years=2.0,
        )
        profile = job_service.analyze_job(req)

        assert "React" in profile.skills
        assert "FastAPI" in profile.skills
        assert "Docker" in profile.skills
        assert "Linux" in profile.skills

    def test_experience_defaults_and_normalization(self, job_service: JobService) -> None:
        req = JobAnalysisRequest(
            job_title="Junior Python Developer",
            description="Entry level role for Python enthusiasts.",
            required_skills=["Python"],
            minimum_experience_years=0.0,
        )
        profile = job_service.analyze_job(req)
        assert profile.experience_requirements["minimum_years"] == 0.0


class TestJobAnalyzeEndpoint:
    """Integration tests for POST /api/v1/job/analyze."""

    def test_analyze_endpoint_success(self, client: TestClient) -> None:
        payload = {
            "job_title": "Backend Software Engineer",
            "description": "Backend Software Engineer with knowledge of Python and databases.",
            "required_skills": [
                "Python",
                "PostgreSQL",
                "REST API"
            ],
            "education": [],
            "minimum_experience_years": 3
        }
        response = client.post("/api/v1/job/analyze", json=payload)

        assert response.status_code == 200
        data = response.json()
        assert "job_profile" in data
        prof = data["job_profile"]
        assert prof["job_title"] == "Backend Software Engineer"
        assert "Python" in prof["skills"]
        assert "PostgreSQL" in prof["skills"]
        assert "REST API" in prof["skills"]
        assert prof["experience_requirements"]["minimum_years"] == 3.0
        assert "python" in prof["processed_text"]

    def test_analyze_endpoint_validation_error_on_empty_title(self, client: TestClient) -> None:
        payload = {
            "job_title": "",
            "description": "Some description",
            "required_skills": ["Python"],
        }
        response = client.post("/api/v1/job/analyze", json=payload)
        assert response.status_code == 422
