"""
Unit tests for GeminiService and LLM-assisted candidate extraction and explanations.
"""

from __future__ import annotations

import json
from unittest.mock import MagicMock

import httpx
import pytest

from app.core.config import Settings
from app.schemas.matching import (
    CandidateScoreResult,
    EducationMatchResult,
    ExperienceMatchResult,
    ScoringComponents,
    SkillMatchResult,
)
from app.services.candidate_service import CandidateService
from app.services.explanation_service import ExplanationService
from app.services.gemini_service import GeminiService


class MockResponse:
    """Mock httpx response for Gemini API."""

    def __init__(self, status_code: int, json_data: dict):
        self.status_code = status_code
        self._json_data = json_data
        self.text = json.dumps(json_data)

    def json(self):
        return self._json_data


def test_gemini_service_disabled_by_default():
    """Verify GeminiService is disabled when no API key is provided."""
    settings = Settings(gemini_api_key=None)
    service = GeminiService(settings=settings)
    assert not service.is_enabled
    assert service.extract_candidate_data("Sample resume text") is None
    assert service.generate_explanation("Dev", 80.0, "Good Match", [], [], 2.0, 3.0) is None


def test_gemini_service_extract_success():
    """Verify successful candidate entity extraction via Gemini."""
    settings = Settings(gemini_api_key="test-api-key")
    mock_client = MagicMock(spec=httpx.Client)

    gemini_payload = {
        "candidates": [
            {
                "content": {
                    "parts": [
                        {
                            "text": json.dumps({
                                "skills": ["python", "docker", "fastapi"],
                                "education": ["B.S. in Computer Science"],
                                "experience": ["Software Engineer at Acme (3 years)"],
                                "job_titles": ["Software Engineer"],
                                "sections": {
                                    "summary": "Experienced engineer",
                                    "skills": "python, docker, fastapi",
                                },
                            })
                        }
                    ]
                }
            }
        ]
    }
    mock_client.post.return_value = MockResponse(200, gemini_payload)

    service = GeminiService(settings=settings, client=mock_client)
    assert service.is_enabled

    data = service.extract_candidate_data("Raw resume text...")
    assert data is not None
    assert "python" in data["skills"]
    assert "fastapi" in data["skills"]
    assert "B.S. in Computer Science" in data["education"]
    assert "Software Engineer" in data["job_titles"]


def test_gemini_service_error_handling_graceful():
    """Verify GeminiService handles HTTP errors gracefully without raising exceptions."""
    settings = Settings(gemini_api_key="test-api-key")
    mock_client = MagicMock(spec=httpx.Client)
    mock_client.post.return_value = MockResponse(500, {"error": "Internal Google Error"})

    service = GeminiService(settings=settings, client=mock_client)
    result = service.extract_candidate_data("Some text")
    assert result is None


def test_candidate_service_uses_gemini_and_falls_back():
    """Verify CandidateService uses Gemini when available, and falls back to local NLP on failure."""
    settings = Settings(gemini_api_key="test-key")
    mock_client = MagicMock(spec=httpx.Client)

    # First call: Gemini succeeds
    gemini_payload = {
        "candidates": [
            {
                "content": {
                    "parts": [
                        {
                            "text": json.dumps({
                                "skills": ["python", "react"],
                                "education": ["M.S. in Software Engineering"],
                                "experience": ["Lead Developer (5 years)"],
                                "job_titles": ["Lead Developer"],
                                "sections": {"summary": "Lead developer"},
                            })
                        }
                    ]
                }
            }
        ]
    }
    mock_client.post.return_value = MockResponse(200, gemini_payload)
    gemini_svc = GeminiService(settings=settings, client=mock_client)

    candidate_svc = CandidateService(gemini_service=gemini_svc)
    profile = candidate_svc.analyze_resume_text("Python and React developer with 5 years experience.")
    assert "Python" in profile.skills
    assert "React" in profile.skills
    assert "Lead Developer" in profile.job_titles

    # Second call: Gemini fails with 500 error -> falls back to local NLP
    mock_client.post.return_value = MockResponse(500, {})
    profile_fallback = candidate_svc.analyze_resume_text(
        "Software Engineer with experience in python and fastapi.\nEducation: B.S. in Computer Science"
    )
    assert profile_fallback is not None
    assert "Python" in profile_fallback.skills


def test_explanation_service_with_gemini():
    """Verify ExplanationService uses Gemini narrative when enabled and falls back when not."""
    settings = Settings(gemini_api_key="test-key")
    mock_client = MagicMock(spec=httpx.Client)

    mock_client.post.return_value = MockResponse(200, {
        "candidates": [
            {
                "content": {
                    "parts": [
                        {"text": "Candidate Jane Doe is an exceptional match with robust Python expertise."}
                    ]
                }
            }
        ]
    })
    gemini_svc = GeminiService(settings=settings, client=mock_client)
    explanation_svc = ExplanationService(gemini_service=gemini_svc)

    score_result = CandidateScoreResult(
        overall_score=88.0,
        components=ScoringComponents(
            skill_match=90.0,
            experience_match=85.0,
            education_match=100.0,
            semantic_similarity=80.0,
        ),
        skill_match=SkillMatchResult(
            score=90.0,
            matched_skills=["python", "fastapi"],
            missing_skills=[],
        ),
        experience_match=ExperienceMatchResult(
            score=85.0,
            required_years=3.0,
            candidate_years=4.0,
            meets_requirement=True,
        ),
        education_match=EducationMatchResult(
            score=100.0,
            matched=True,
            details="Degree matches",
        ),
    )

    explanation = explanation_svc.build_explanation(score_result, job_title="Senior Backend Engineer")
    assert "exceptional match" in explanation.summary_text
    assert explanation.overall_score == 88.0


def test_entity_extractor_with_gemini():
    """Verify EntityExtractor utilizes Gemini for titles, education, and experience."""
    from app.nlp.entity_extractor import EntityExtractor

    settings = Settings(gemini_api_key="test-key")
    mock_client = MagicMock(spec=httpx.Client)

    # Mock responses for job titles, education, experience
    mock_client.post.return_value = MockResponse(200, {
        "candidates": [
            {
                "content": {
                    "parts": [
                        {
                            "text": json.dumps({
                                "job_titles": ["Principal Cloud Architect"],
                                "education": ["Ph.D. in Computer Engineering, MIT"],
                                "experience": ["Principal Cloud Architect at CloudCorp (6 years)"],
                            })
                        }
                    ]
                }
            }
        ]
    })

    gemini_svc = GeminiService(settings=settings, client=mock_client)
    extractor = EntityExtractor(gemini_service=gemini_svc)

    titles = extractor.extract_job_titles("Some text about Principal Cloud Architect")
    assert "Principal Cloud Architect" in titles

    edu = extractor.extract_education("Graduated with Ph.D. in Computer Engineering from MIT")
    assert any("MIT" in e or "Ph.D." in e for e in edu)

    exp = extractor.extract_experience("6 years of experience as Principal Cloud Architect at CloudCorp")
    assert any("CloudCorp" in x or "6 years" in x for x in exp)


def test_section_parser_with_gemini():
    """Verify SectionParser utilizes Gemini for semantic section segmentation."""
    from app.nlp.section_parser import SectionParser

    settings = Settings(gemini_api_key="test-key")
    mock_client = MagicMock(spec=httpx.Client)

    mock_client.post.return_value = MockResponse(200, {
        "candidates": [
            {
                "content": {
                    "parts": [
                        {
                            "text": json.dumps({
                                "summary": "Senior Architect with 10 years experience",
                                "skills": "Python, Go, Kubernetes",
                                "experience": "Senior Architect at Tech Inc",
                                "education": "BS in CS",
                                "projects": "SmartHire ML Service",
                                "certifications": "AWS Solutions Architect",
                                "languages": "English, German",
                            })
                        }
                    ]
                }
            }
        ]
    })

    gemini_svc = GeminiService(settings=settings, client=mock_client)
    parser = SectionParser(gemini_service=gemini_svc)

    sections = parser.parse("Nonstandard resume format text...")
    assert sections["summary"] == "Senior Architect with 10 years experience"
    assert sections["skills"] == "Python, Go, Kubernetes"
    assert sections["certifications"] == "AWS Solutions Architect"


def test_gemini_service_disabled_when_flag_false():
    """Verify GeminiService is disabled when use_gemini_nlp=False."""
    settings = Settings(gemini_api_key="test-key", use_gemini_nlp=False)
    service = GeminiService(settings=settings)
    assert not service.is_enabled


def test_gemini_service_extract_skills_success():
    """Verify GeminiService.extract_skills extracts skills via JSON API."""
    settings = Settings(gemini_api_key="test-key", use_gemini_nlp=True)
    mock_client = MagicMock(spec=httpx.Client)
    mock_client.post.return_value = MockResponse(200, {
        "candidates": [
            {
                "content": {
                    "parts": [
                        {"text": json.dumps({"skills": ["Python", "FastAPI", "PostgreSQL", "Docker"]})}
                    ]
                }
            }
        ]
    })
    service = GeminiService(settings=settings, client=mock_client)
    skills = service.extract_skills("Experienced backend developer working with Python, FastAPI, Docker.")
    assert skills == ["Python", "FastAPI", "PostgreSQL", "Docker"]


def test_entity_extractor_strictly_uses_gemini():
    """Verify EntityExtractor returns exclusively Gemini results without regex contamination."""
    from app.nlp.entity_extractor import EntityExtractor

    settings = Settings(gemini_api_key="test-key", use_gemini_nlp=True)
    mock_client = MagicMock(spec=httpx.Client)
    # Return a unique custom job title from Gemini; text contains "software engineer" which local regex would find
    mock_client.post.return_value = MockResponse(200, {
        "candidates": [
            {
                "content": {
                    "parts": [
                        {"text": json.dumps({"job_titles": ["Chief AI Architect"]})}
                    ]
                }
            }
        ]
    })
    gemini_svc = GeminiService(settings=settings, client=mock_client)
    extractor = EntityExtractor(gemini_service=gemini_svc)

    text = "Software Engineer with 10 years experience as Chief AI Architect."
    titles = extractor.extract_job_titles(text)
    # Strictly contains Gemini's extracted title, not regex-added "Software Engineer"
    assert titles == ["Chief AI Architect"]


def test_skill_service_with_gemini():
    """Verify SkillService uses Gemini NLP to extract skills and resolves them to canonical names."""
    from app.services.skill_service import SkillService

    settings = Settings(gemini_api_key="test-key", use_gemini_nlp=True)
    mock_client = MagicMock(spec=httpx.Client)
    mock_client.post.return_value = MockResponse(200, {
        "candidates": [
            {
                "content": {
                    "parts": [
                        {"text": json.dumps({"skills": ["py", "reactjs", "postgres", "fastapi"]})}
                    ]
                }
            }
        ]
    })
    gemini_svc = GeminiService(settings=settings, client=mock_client)
    skill_service = SkillService(gemini_service=gemini_svc)

    resolved = skill_service.extract_skills_with_gemini("Text with aliases: py, reactjs, postgres.")
    # py -> Python, reactjs -> React, postgres -> PostgreSQL, fastapi -> FastAPI
    assert "Python" in resolved
    assert "React" in resolved
    assert "PostgreSQL" in resolved
    assert "FastAPI" in resolved


def test_job_service_with_gemini():
    """Verify JobService uses Gemini NLP for skill and education extraction from job postings."""
    from app.schemas.job import JobAnalysisRequest
    from app.services.job_service import JobService

    settings = Settings(gemini_api_key="test-key", use_gemini_nlp=True)
    mock_client = MagicMock(spec=httpx.Client)
    # Gemini returns skills and education for job
    mock_client.post.return_value = MockResponse(200, {
        "candidates": [
            {
                "content": {
                    "parts": [
                        {"text": json.dumps({
                            "skills": ["python", "docker"],
                            "education": ["Master of Science in Computer Science"],
                        })}
                    ]
                }
            }
        ]
    })
    gemini_svc = GeminiService(settings=settings, client=mock_client)
    job_service = JobService(gemini_service=gemini_svc)

    req = JobAnalysisRequest(
        job_title="Senior Python Backend Developer",
        description="Looking for an engineer with skills in Python and Docker. Required: Master of Science in Computer Science.",
        required_skills=["Python"],
        education=[],
        minimum_experience_years=4.0,
    )
    profile = job_service.analyze_job(req)
    assert "Python" in profile.skills
    assert "Docker" in profile.skills
    assert "Master of Science in Computer Science" in profile.education


def test_gemini_normalize_text():
    """Verify GeminiService.normalize_text cleans and normalizes text via Gemini."""
    settings = Settings(gemini_api_key="test-key", use_gemini_nlp=True)
    mock_client = MagicMock(spec=httpx.Client)
    mock_client.post.return_value = MockResponse(200, {
        "candidates": [
            {
                "content": {
                    "parts": [
                        {"text": json.dumps({"normalized_text": "C++ developer with Node.js and scikit-learn experience."})}
                    ]
                }
            }
        ]
    })
    service = GeminiService(settings=settings, client=mock_client)
    result = service.normalize_text("C++ developer with Node.js and scikit-learn experience.")
    assert result == "C++ developer with Node.js and scikit-learn experience."


def test_gemini_tokenize_text():
    """Verify GeminiService.tokenize_text tokenizes text via Gemini."""
    settings = Settings(gemini_api_key="test-key", use_gemini_nlp=True)
    mock_client = MagicMock(spec=httpx.Client)
    mock_client.post.return_value = MockResponse(200, {
        "candidates": [
            {
                "content": {
                    "parts": [
                        {"text": json.dumps({"tokens": ["C++", "developer", "Node.js", "scikit-learn"]})}
                    ]
                }
            }
        ]
    })
    service = GeminiService(settings=settings, client=mock_client)
    tokens = service.tokenize_text("C++ developer with Node.js and scikit-learn experience.")
    assert "C++" in tokens
    assert "Node.js" in tokens
    assert "scikit-learn" in tokens


def test_text_normalizer_uses_gemini():
    """Verify TextNormalizer delegates to Gemini when enabled."""
    from app.nlp.normalizer import TextNormalizer

    settings = Settings(gemini_api_key="test-key", use_gemini_nlp=True)
    mock_client = MagicMock(spec=httpx.Client)
    mock_client.post.return_value = MockResponse(200, {
        "candidates": [
            {
                "content": {
                    "parts": [
                        {"text": json.dumps({"normalized_text": "Python developer with C++ and Node.js expertise."})}
                    ]
                }
            }
        ]
    })
    gemini_svc = GeminiService(settings=settings, client=mock_client)
    normalizer = TextNormalizer(gemini_service=gemini_svc)

    result = normalizer.normalize("Python developer with C++ and Node.js expertise.")
    assert "node.js" in result  # lowercase=True by default
    assert "c++" in result


def test_technical_tokenizer_uses_gemini():
    """Verify TechnicalTokenizer delegates to Gemini when enabled."""
    from app.nlp.tokenizer import TechnicalTokenizer

    settings = Settings(gemini_api_key="test-key", use_gemini_nlp=True)
    mock_client = MagicMock(spec=httpx.Client)
    mock_client.post.return_value = MockResponse(200, {
        "candidates": [
            {
                "content": {
                    "parts": [
                        {"text": json.dumps({"tokens": ["Python", "developer", "C++", "Node.js", "scikit-learn"]})}
                    ]
                }
            }
        ]
    })
    gemini_svc = GeminiService(settings=settings, client=mock_client)
    tokenizer = TechnicalTokenizer(gemini_service=gemini_svc)

    tokens = tokenizer.tokenize("Python developer with C++ and Node.js and scikit-learn.")
    assert "C++" in tokens
    assert "Node.js" in tokens
    assert "scikit-learn" in tokens


def test_preprocessing_service_uses_gemini():
    """Verify PreprocessingService delegates normalize and tokenize to Gemini when enabled."""
    from app.services.preprocessing_service import PreprocessingService

    settings = Settings(gemini_api_key="test-key", use_gemini_nlp=True)
    mock_client = MagicMock(spec=httpx.Client)
    mock_client.post.return_value = MockResponse(200, {
        "candidates": [
            {
                "content": {
                    "parts": [
                        {"text": json.dumps({"normalized_text": "Senior software engineer with Node.js and C++ skills."})}
                    ]
                }
            }
        ]
    })
    gemini_svc = GeminiService(settings=settings, client=mock_client)
    preprocessor = PreprocessingService(gemini_service=gemini_svc)

    result = preprocessor.preprocess_text("Senior software engineer with Node.js and C++ skills.")
    assert "node.js" in result
    assert "c++" in result


def test_gemini_service_resolve_skill_aliases():
    """Verify GeminiService.resolve_skill_aliases and resolve_skill_alias standardize aliases."""
    settings = Settings(gemini_api_key="test-key", use_gemini_nlp=True)
    mock_client = MagicMock(spec=httpx.Client)
    mock_client.post.return_value = MockResponse(200, {
        "candidates": [
            {
                "content": {
                    "parts": [
                        {"text": json.dumps({"canonical_skills": ["Node.js", "Kubernetes", "PostgreSQL", "Python"]})}
                    ]
                }
            }
        ]
    })
    service = GeminiService(settings=settings, client=mock_client)
    resolved = service.resolve_skill_aliases(["nodejs", "k8s", "postgres", "py"])
    assert resolved == ["Node.js", "Kubernetes", "PostgreSQL", "Python"]


def test_gemini_service_resolve_single_skill_alias():
    """Verify GeminiService.resolve_skill_alias resolves single alias via Gemini."""
    settings = Settings(gemini_api_key="test-key", use_gemini_nlp=True)
    mock_client = MagicMock(spec=httpx.Client)
    mock_client.post.return_value = MockResponse(200, {
        "candidates": [
            {
                "content": {
                    "parts": [
                        {"text": json.dumps({"canonical_skills": ["Kubernetes"]})}
                    ]
                }
            }
        ]
    })
    service = GeminiService(settings=settings, client=mock_client)
    single = service.resolve_skill_alias("k8s")
    assert single == "Kubernetes"


def test_skill_service_extract_skills_uses_gemini():
    """Verify SkillService.extract_skills delegates both extraction and alias resolution to Gemini."""
    from app.services.skill_service import SkillService

    settings = Settings(gemini_api_key="test-key", use_gemini_nlp=True)
    mock_client = MagicMock(spec=httpx.Client)

    def side_effect(*args, **kwargs):
        payload = kwargs.get("json", {}) or {}
        prompt = ""
        if "contents" in payload:
            prompt = payload["contents"][0]["parts"][0].get("text", "")

        if "Standardize and resolve" in prompt:
            data = {"canonical_skills": ["Python", "FastAPI", "Docker", "PostgreSQL"]}
        else:
            data = {"skills": ["py", "fastapi", "docker", "postgres"]}

        return MockResponse(200, {
            "candidates": [{"content": {"parts": [{"text": json.dumps(data)}]}}]
        })

    mock_client.post.side_effect = side_effect
    gemini_svc = GeminiService(settings=settings, client=mock_client)
    skill_svc = SkillService(gemini_service=gemini_svc)

    skills = skill_svc.extract_skills("Experienced in py, fastapi, docker, postgres.")
    assert "Python" in skills
    assert "FastAPI" in skills
    assert "Docker" in skills
    assert "PostgreSQL" in skills


def test_skill_service_resolve_canonical_uses_gemini():
    """Verify SkillService.resolve_canonical uses Gemini for alias resolution."""
    from app.services.skill_service import SkillService

    settings = Settings(gemini_api_key="test-key", use_gemini_nlp=True)
    mock_client = MagicMock(spec=httpx.Client)
    mock_client.post.return_value = MockResponse(200, {
        "candidates": [
            {
                "content": {
                    "parts": [
                        {"text": json.dumps({"canonical_skills": ["scikit-learn"]})}
                    ]
                }
            }
        ]
    })
    gemini_svc = GeminiService(settings=settings, client=mock_client)
    skill_svc = SkillService(gemini_service=gemini_svc)

    canonical = skill_svc.resolve_canonical("sklearn")
    assert canonical == "scikit-learn"




