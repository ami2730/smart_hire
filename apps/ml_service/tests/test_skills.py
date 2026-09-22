"""
Tests for skill extraction, alias resolution, section parsing, and candidate analysis — Phase 3.
"""

from __future__ import annotations

import io
import json
from unittest.mock import MagicMock

import httpx
import pytest
import docx
import pymupdf as fitz
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import app
from app.nlp.section_parser import SectionParser, parse_sections
from app.services.candidate_service import CandidateService
from app.services.gemini_service import GeminiService
from app.services.skill_service import SkillService


# ---------------------------------------------------------------------------
# Gemini mock helper
# ---------------------------------------------------------------------------

class MockResponse:
    def __init__(self, status_code: int, json_data: dict) -> None:
        self.status_code = status_code
        self._json_data = json_data

    def json(self) -> dict:
        return self._json_data


def make_section_gemini(sections: dict) -> GeminiService:
    """Return a mocked GeminiService that returns the given sections."""
    settings = Settings(gemini_api_key="test-key", use_gemini_nlp=True)
    mock_client = MagicMock(spec=httpx.Client)
    mock_client.post.return_value = MockResponse(200, {
        "candidates": [{"content": {"parts": [{"text": json.dumps(sections)}]}}]
    })
    return GeminiService(settings=settings, client=mock_client)


@pytest.fixture(scope="module")
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture
def skill_service() -> SkillService:
    return SkillService()


@pytest.fixture
def section_parser() -> SectionParser:
    return SectionParser()


class TestSkillExtraction:
    """Tests for skill extraction and alias resolution."""

    def test_extract_exact_canonical_skills(self, skill_service: SkillService) -> None:
        text = "Experienced with Python, Django, FastAPI, PostgreSQL, and Docker."
        skills = skill_service.extract_skills(text)
        assert "Python" in skills
        assert "Django" in skills
        assert "FastAPI" in skills
        assert "PostgreSQL" in skills
        assert "Docker" in skills

    def test_resolve_skill_aliases(self, skill_service: SkillService) -> None:
        text = "Worked with nodejs, postgres db, and machine-learning models using sklearn."
        skills = skill_service.extract_skills(text)
        assert "Node.js" in skills
        assert "PostgreSQL" in skills
        assert "Machine Learning" in skills
        assert "scikit-learn" in skills

    def test_deduplicates_skills_across_aliases(self, skill_service: SkillService) -> None:
        text = "I love Node.js, nodejs, and node js programming."
        skills = skill_service.extract_skills(text)
        # Should contain "Node.js" exactly once
        assert skills.count("Node.js") == 1

    def test_avoids_substring_false_positives(self, skill_service: SkillService) -> None:
        # 'go' should not match in 'category' or 'negotiation'
        # 'git' should not match in 'digital'
        text = "Led category management, digital transformation, and business negotiations."
        skills = skill_service.extract_skills(text)
        assert "Go" not in skills
        assert "Git" not in skills

    def test_all_initial_required_skills_supported(self, skill_service: SkillService) -> None:
        """Section 11 required initial skills."""
        required = [
            "Python", "Java", "JavaScript", "TypeScript", "React", "Next.js",
            "Node.js", "Django", "FastAPI", "PostgreSQL", "MySQL", "Docker",
            "Machine Learning", "TensorFlow", "scikit-learn", "REST API", "Git", "Linux"
        ]
        text = " ".join(required)
        extracted = skill_service.extract_skills(text)
        for req in required:
            assert req in extracted, f"Missing required skill: {req}"


class TestSectionParsing:
    """Tests for resume section parser — Gemini-powered."""

    def test_parse_standard_sections(self) -> None:
        resume_text = (
            "SUMMARY\n"
            "Passionate Senior Backend Developer with 5 years in cloud systems.\n\n"
            "TECHNICAL SKILLS\n"
            "Python, FastAPI, PostgreSQL, Docker, Kubernetes\n\n"
            "WORK EXPERIENCE\n"
            "Backend Lead at StartupXYZ (2021 - Present)\n"
            "Engineered scalable microservices.\n\n"
            "EDUCATION\n"
            "Bachelor of Science in Computer Science, University of Technology\n\n"
            "PROJECTS\n"
            "Built open-source ETL pipeline."
        )
        gem = make_section_gemini({
            "summary": "Passionate Senior Backend Developer with 5 years in cloud systems.",
            "skills": "Python, FastAPI, PostgreSQL, Docker, Kubernetes",
            "experience": "Backend Lead at StartupXYZ (2021 - Present)\nEngineered scalable microservices.",
            "education": "Bachelor of Science in Computer Science, University of Technology",
            "projects": "Built open-source ETL pipeline.",
            "certifications": None,
            "languages": None,
        })
        parser = SectionParser(gemini_service=gem)
        sections = parser.parse(resume_text)

        assert sections["summary"] is not None
        assert "Passionate Senior Backend Developer" in sections["summary"]
        assert sections["skills"] is not None
        assert "FastAPI, PostgreSQL" in sections["skills"]
        assert sections["experience"] is not None
        assert "StartupXYZ" in sections["experience"]
        assert sections["education"] is not None
        assert "Computer Science" in sections["education"]
        assert sections["projects"] is not None
        assert "ETL pipeline" in sections["projects"]
        assert sections["certifications"] is None
        assert sections["languages"] is None

    def test_missing_sections_return_none(self) -> None:
        text = "SKILLS\nPython, Docker"
        gem = make_section_gemini({
            "summary": None,
            "skills": "Python, Docker",
            "experience": None,
            "education": None,
            "projects": None,
            "certifications": None,
            "languages": None,
        })
        parser = SectionParser(gemini_service=gem)
        sections = parser.parse(text)
        assert sections["skills"] is not None
        assert sections["experience"] is None
        assert sections["education"] is None

    def test_no_gemini_returns_all_none(self) -> None:
        """Without Gemini configured, all sections return None."""
        parser = SectionParser(gemini_service=None)
        sections = parser.parse("SKILLS\nPython, Docker")
        assert all(v is None for v in sections.values())


class TestCandidateServiceAndEndpoints:
    """Integration tests for candidate profile analysis and skill endpoints."""

    def test_analyze_resume_text_with_gemini(self) -> None:
        """Verify CandidateService extracts profile data via mocked Gemini."""
        from app.core.config import Settings
        from app.services.gemini_service import GeminiService

        sample_text = (
            "PROFESSIONAL SUMMARY\n"
            "Backend Developer with 4 years of experience building APIs.\n\n"
            "SKILLS\n"
            "Python, PostgreSQL, REST API, Docker\n\n"
            "EXPERIENCE\n"
            "Software Engineer at ACME Corp (4 years of experience)\n\n"
            "EDUCATION\n"
            "B.S. in Computer Science"
        )

        settings = Settings(gemini_api_key="test-key", use_gemini_nlp=True)
        mock_client = MagicMock(spec=httpx.Client)
        mock_client.post.return_value = MockResponse(200, {
            "candidates": [{
                "content": {"parts": [{"text": json.dumps({
                    "skills": ["Python", "PostgreSQL", "REST API", "Docker"],
                    "job_titles": ["Software Engineer", "Backend Developer"],
                    "education": ["B.S. in Computer Science"],
                    "experience": ["Software Engineer at ACME Corp (4 years)"],
                    "sections": {
                        "summary": "Backend Developer with 4 years of experience.",
                        "skills": "Python, PostgreSQL, REST API, Docker",
                        "experience": "Software Engineer at ACME Corp (4 years)",
                        "education": "B.S. in Computer Science",
                        "projects": None,
                        "certifications": None,
                        "languages": None,
                    },
                })}]}
            }]
        })
        gem = GeminiService(settings=settings, client=mock_client)
        service = CandidateService(gemini_service=gem)
        profile = service.analyze_resume_text(sample_text)

        assert "Python" in profile.skills
        assert "PostgreSQL" in profile.skills
        assert "REST API" in profile.skills
        assert "Docker" in profile.skills
        assert len(profile.job_titles) > 0
        assert any("Software Engineer" in t or "Backend" in t for t in profile.job_titles)
        assert len(profile.education) > 0
        assert profile.sections["summary"] is not None
        assert profile.raw_text == sample_text

    def test_api_list_skills(self, client: TestClient) -> None:
        res = client.get("/api/v1/skills")
        assert res.status_code == 200
        body = res.json()
        assert body["count"] > 15
        assert "Python" in body["skills"]

    def test_api_extract_skills(self, client: TestClient) -> None:
        payload = {"text": "Expert in nextjs and postgres"}
        res = client.post("/api/v1/skills/extract", json=payload)
        assert res.status_code == 200
        body = res.json()
        assert "Next.js" in body["skills"]
        assert "PostgreSQL" in body["skills"]

    def test_api_analyze_resume_endpoint(self, client: TestClient) -> None:
        # Create a sample PDF resume
        doc = fitz.open()
        page = doc.new_page()
        resume_content = (
            "SUMMARY\n"
            "Senior Backend Engineer with 5 years experience.\n\n"
            "SKILLS\n"
            "Python, Django, FastAPI, PostgreSQL, Docker\n\n"
            "EXPERIENCE\n"
            "Backend Engineer at CloudCorp\n\n"
            "EDUCATION\n"
            "B.S. Computer Science\n"
        )
        page.insert_text((50, 72), resume_content)
        pdf_bytes = doc.write()
        doc.close()

        files = {"file": ("senior_resume.pdf", pdf_bytes, "application/pdf")}
        response = client.post("/api/v1/resume/analyze", files=files)

        assert response.status_code == 200
        data = response.json()
        assert "candidate_profile" in data
        prof = data["candidate_profile"]
        # Skills are extracted via canonical dictionary (does not require Gemini API key)
        assert "Python" in prof["skills"]
        assert "FastAPI" in prof["skills"]
        assert "PostgreSQL" in prof["skills"]
        assert "Docker" in prof["skills"]
        # sections and processed_text require live Gemini — not asserted here
        assert isinstance(prof["sections"], dict)

