"""
End-to-End System Integration Tests — Phase 9.

Validates the full lifecycle:
1. Document upload & extraction (PDF/DOCX)
2. Resume analysis to generate candidate profile
3. Job analysis to generate job profile
4. Single candidate screening evaluation
5. Multi-candidate batch ranking
"""

from __future__ import annotations

import pymupdf as fitz
import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture(scope="module")
def client() -> TestClient:
    return TestClient(app)


def build_test_pdf(text: str) -> bytes:
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((50, 72), text)
    pdf_bytes = doc.write()
    doc.close()
    return pdf_bytes


class TestEndToEndScreeningLifecycle:
    """Complete end-to-end workflow validation."""

    def test_full_recruitment_pipeline(self, client: TestClient) -> None:
        # Step 1: Candidate uploads PDF resume
        resume_content = (
            "SUMMARY\n"
            "Senior Backend Engineer with 5 years experience building scalable web APIs.\n\n"
            "TECHNICAL SKILLS\n"
            "Python, Django, FastAPI, PostgreSQL, REST API, Docker, AWS\n\n"
            "WORK EXPERIENCE\n"
            "Senior Software Engineer at CloudTech (5 years of experience)\n"
            "Engineered high-throughput microservices in Python and PostgreSQL.\n\n"
            "EDUCATION\n"
            "Bachelor of Science in Computer Science, State University\n"
        )
        pdf_bytes = build_test_pdf(resume_content)

        extract_resp = client.post(
            "/api/v1/resume/extract",
            files={"file": ("resume.pdf", pdf_bytes, "application/pdf")},
        )
        assert extract_resp.status_code == 200
        extracted_data = extract_resp.json()
        assert extracted_data["success"] is True
        assert extracted_data["document_type"] == "pdf"
        assert "Python" in extracted_data["text"]

        # Step 2: Analyze resume to generate structured candidate profile
        analyze_resp = client.post(
            "/api/v1/resume/analyze",
            files={"file": ("resume.pdf", pdf_bytes, "application/pdf")},
        )
        assert analyze_resp.status_code == 200
        profile_data = analyze_resp.json()["candidate_profile"]
        assert "Python" in profile_data["skills"]
        assert "PostgreSQL" in profile_data["skills"]
        assert "Docker" in profile_data["skills"]
        assert "AWS" in profile_data["skills"]
        # sections require live Gemini API key — validate structure only
        assert isinstance(profile_data["sections"], dict)

        # Step 3: Recruiter submits job requirement
        job_payload = {
            "job_title": "Senior Python Backend Engineer",
            "description": "Seeking experienced Python engineer with PostgreSQL and Docker.",
            "required_skills": ["Python", "PostgreSQL", "Docker", "AWS"],
            "education": ["Bachelor in Computer Science"],
            "minimum_experience_years": 4.0,
        }
        job_resp = client.post("/api/v1/job/analyze", json=job_payload)
        assert job_resp.status_code == 200
        job_profile = job_resp.json()["job_profile"]
        assert "Python" in job_profile["skills"]
        assert job_profile["experience_requirements"]["minimum_years"] == 4.0

        # Step 4: Evaluate candidate screening
        screening_payload = {
            "job": {
                "title": job_payload["job_title"],
                "description": job_payload["description"],
                "required_skills": job_payload["required_skills"],
                "minimum_experience_years": job_payload["minimum_experience_years"],
                "education_requirements": job_payload["education"],
            },
            "candidate": {
                "id": "cand_e2e_01",
                "resume_text": profile_data["raw_text"],
                "skills": profile_data["skills"],
                "experience": profile_data["experience"],
                "education": profile_data["education"],
            },
        }
        eval_resp = client.post("/api/v1/screening/evaluate", json=screening_payload)
        assert eval_resp.status_code == 200
        eval_result = eval_resp.json()
        assert eval_result["candidate_id"] == "cand_e2e_01"
        assert eval_result["recommendation"] in ("strong_match", "good_match")
        assert eval_result["match_score"] >= 75.0
        assert eval_result["components"]["skill_match"] == 100.0
        assert eval_result["components"]["experience_match"] == 100.0
        assert eval_result["explanation"]["experience"]["meets_requirement"] is True

        # Step 5: Batch rank alongside competing candidates
        competing_candidates = [
            screening_payload["candidate"],
            {
                "id": "cand_junior",
                "resume_text": "Junior developer with 1 year Python and Git.",
                "skills": ["Python", "Git"],
                "experience": ["1 year of experience"],
                "education": [],
            },
            {
                "id": "cand_irrelevant",
                "resume_text": "Marketing lead with social media skills.",
                "skills": ["Marketing"],
                "experience": [],
                "education": [],
            },
        ]
        batch_payload = {
            "job_id": "job_e2e_99",
            "job": screening_payload["job"],
            "candidates": competing_candidates,
        }
        rank_resp = client.post("/api/v1/screening/rank", json=batch_payload)
        assert rank_resp.status_code == 200
        ranked_data = rank_resp.json()
        assert ranked_data["job_id"] == "job_e2e_99"
        ranked_list = ranked_data["candidates"]
        assert len(ranked_list) == 3
        # Candidate 1 must be top rank
        assert ranked_list[0]["candidate_id"] == "cand_e2e_01"
        assert ranked_list[0]["rank"] == 1
        assert ranked_list[0]["score"] > ranked_list[1]["score"]
        assert ranked_list[1]["rank"] == 2
        assert ranked_list[2]["rank"] == 3
