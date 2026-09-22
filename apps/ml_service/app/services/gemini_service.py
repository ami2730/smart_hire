"""
Gemini Service — LLM-Assisted Resume and Candidate Analysis.

Provides an optional, simplified extraction and natural language explanation
layer using the Google Gemini API (via HTTP REST).

Features:
  - Zero heavy extra dependencies (uses httpx).
  - Enforces structured JSON output mode (application/json).
  - Graceful degradation: seamlessly returns None on error or when no key is set,
    allowing caller to fall back to the deterministic local NLP engine.
"""

from __future__ import annotations

import json
from typing import Any

import httpx

from app.core.config import Settings, get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)

GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models"


class GeminiService:
    """Service for interacting with Google Gemini API for resume analysis and scoring."""

    def __init__(
        self,
        settings: Settings | None = None,
        client: httpx.Client | None = None,
    ) -> None:
        self.settings = settings or get_settings()
        self._client = client

    @property
    def is_enabled(self) -> bool:
        """Check if Gemini integration is configured and enabled."""
        key = self.settings.gemini_api_key
        return bool(key and key.strip() and self.settings.use_gemini_nlp)

    @property
    def model_name(self) -> str:
        return self.settings.gemini_model or "gemini-1.5-flash"

    def _get_client(self) -> httpx.Client:
        if self._client is not None:
            return self._client
        return httpx.Client(timeout=15.0)

    def extract_candidate_data(self, raw_text: str) -> dict[str, Any] | None:
        """Extract structured resume entities using Gemini with strict JSON mode.

        Returns a dictionary containing skills, education, experience, job_titles,
        and sections, or None if the request fails or is disabled.
        """
        if not self.is_enabled:
            return None

        prompt = (
            "You are an expert HR data parser. Extract candidate information from the "
            "following resume text into a strict JSON object with these exact keys:\n"
            "- skills: list of technical and professional skills (strings, lowercase canonical names where possible)\n"
            "- education: list of educational qualifications and degrees\n"
            "- experience: list of career positions, roles, and achievements with company and duration if available\n"
            "- job_titles: list of extracted job titles held by the candidate\n"
            "- sections: object mapping section names ('summary', 'skills', 'experience', 'education', 'projects') to their text\n\n"
            f"Resume Text:\n{raw_text[:8000]}"
        )

        url = f"{GEMINI_BASE_URL}/{self.model_name}:generateContent?key={self.settings.gemini_api_key}"
        payload = {
            "contents": [
                {
                    "parts": [{"text": prompt}]
                }
            ],
            "generationConfig": {
                "response_mime_type": "application/json",
                "temperature": 0.1,
            },
        }

        try:
            client = self._get_client()
            resp = client.post(url, json=payload)
            if resp.status_code != 200:
                logger.warning(
                    "Gemini API returned non-200 status %d: %s; falling back to local NLP",
                    resp.status_code,
                    resp.text[:200],
                )
                return None

            data = resp.json()
            candidates = data.get("candidates", [])
            if not candidates:
                return None

            content_text = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "{}")
            parsed: dict[str, Any] = json.loads(content_text)
            logger.info("Successfully extracted candidate profile data using Gemini (%s)", self.model_name)
            return parsed

        except Exception as exc:
            logger.warning("Gemini extraction error: %s; falling back to local NLP pipeline", exc)
            return None

    def generate_explanation(
        self,
        job_title: str,
        match_score: float,
        recommendation: str,
        matched_skills: list[str],
        missing_skills: list[str],
        candidate_experience_years: float,
        required_experience_years: float,
    ) -> str | None:
        """Generate a natural, transparent explanation of candidate scoring using Gemini."""
        if not self.is_enabled:
            return None

        prompt = (
            f"You are an AI recruiting assistant explaining a candidate's fit for the job: '{job_title}'.\n"
            f"Overall Match Score: {match_score:.1f}/100\n"
            f"Advisory Recommendation: {recommendation}\n"
            f"Matched Skills: {', '.join(matched_skills) if matched_skills else 'None'}\n"
            f"Missing Skills: {', '.join(missing_skills) if missing_skills else 'None'}\n"
            f"Candidate Experience: {candidate_experience_years:.1f} years (Required: {required_experience_years:.1f} years)\n\n"
            "Write a concise, professional, recruiter-facing paragraph (3 to 4 sentences) explaining "
            "the candidate's strengths, key gaps, and rationale for this recommendation. "
            "Never use discriminatory language or make autonomous hiring decisions."
        )

        url = f"{GEMINI_BASE_URL}/{self.model_name}:generateContent?key={self.settings.gemini_api_key}"
        payload = {
            "contents": [
                {
                    "parts": [{"text": prompt}]
                }
            ],
            "generationConfig": {
                "temperature": 0.2,
                "maxOutputTokens": 250,
            },
        }

        try:
            client = self._get_client()
            resp = client.post(url, json=payload)
            if resp.status_code != 200:
                return None

            data = resp.json()
            candidates = data.get("candidates", [])
            if not candidates:
                return None

            text = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "").strip()
            return text if text else None

        except Exception as exc:
            logger.warning("Gemini explanation generation error: %s", exc)
            return None

    def _generate_json(self, prompt: str) -> dict[str, Any] | None:
        """Helper to query Gemini with response_mime_type='application/json'."""
        if not self.is_enabled:
            return None

        url = f"{GEMINI_BASE_URL}/{self.model_name}:generateContent?key={self.settings.gemini_api_key}"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "response_mime_type": "application/json",
                "temperature": 0.1,
            },
        }

        try:
            client = self._get_client()
            resp = client.post(url, json=payload)
            if resp.status_code != 200:
                return None

            data = resp.json()
            candidates = data.get("candidates", [])
            if not candidates:
                return None

            raw_json = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "{}")
            return json.loads(raw_json)
        except Exception as exc:
            logger.warning("Gemini JSON request error: %s", exc)
            return None

    def parse_sections(self, text: str) -> dict[str, str | None] | None:
        """Segment resume or job description text into canonical sections using Gemini."""
        prompt = (
            "Segment the following resume text into canonical sections. "
            "Return a strict JSON object with these exact keys: 'summary', 'skills', 'experience', "
            "'education', 'projects', 'certifications', 'languages'. "
            "If a section is not present in the text, set its value to null.\n\n"
            f"Text:\n{text[:8000]}"
        )
        data = self._generate_json(prompt)
        if not data or not isinstance(data, dict):
            return None

        canonical_keys = ["summary", "skills", "experience", "education", "projects", "certifications", "languages"]
        return {k: (str(data[k]) if data.get(k) is not None else None) for k in canonical_keys}

    def extract_job_titles(self, text: str) -> list[str] | None:
        """Extract job titles held by the candidate using Gemini."""
        prompt = (
            "Extract all professional job titles and roles held by the candidate from this text. "
            "Return a strict JSON object: {\"job_titles\": [\"Title 1\", \"Title 2\"]}\n\n"
            f"Text:\n{text[:6000]}"
        )
        data = self._generate_json(prompt)
        if not data or not isinstance(data, dict):
            return None
        titles = data.get("job_titles", [])
        return [str(t).strip() for t in titles if str(t).strip()]

    def extract_education(self, text: str) -> list[str] | None:
        """Extract educational qualifications and degrees using Gemini."""
        prompt = (
            "Extract all academic degrees, diplomas, universities, and qualifications from this text. "
            "Return a strict JSON object: {\"education\": [\"B.S. in Computer Science, University X\", ...]}\n\n"
            f"Text:\n{text[:6000]}"
        )
        data = self._generate_json(prompt)
        if not data or not isinstance(data, dict):
            return None
        edu = data.get("education", [])
        return [str(e).strip() for e in edu if str(e).strip()]

    def extract_experience(self, text: str) -> list[str] | None:
        """Extract professional work experience entries using Gemini."""
        prompt = (
            "Extract career work experience entries (role, company, duration, key accomplishments) from this text. "
            "Return a strict JSON object: {\"experience\": [\"Role at Company (Years): details...\", ...]}\n\n"
            f"Text:\n{text[:6000]}"
        )
        data = self._generate_json(prompt)
        if not data or not isinstance(data, dict):
            return None
        exp = data.get("experience", [])
        return [str(x).strip() for x in exp if str(x).strip()]

    def extract_skills(self, text: str) -> list[str] | None:
        """Extract technical and professional skills from text using Gemini."""
        prompt = (
            "Extract all technical, engineering, software, and professional skills mentioned in this text. "
            "Return a strict JSON object: {\"skills\": [\"Skill 1\", \"Skill 2\", ...]}\n\n"
            f"Text:\n{text[:6000]}"
        )
        data = self._generate_json(prompt)
        if not data or not isinstance(data, dict):
            return None
        skills = data.get("skills", [])
        return [str(s).strip() for s in skills if str(s).strip()]

    def normalize_text(self, text: str) -> str | None:
        """Normalize raw resume/job text by cleaning Unicode artifacts and formatting technical terms using Gemini."""
        prompt = (
            "Clean and normalize the following resume or job description text. "
            "Clean strange Unicode artifacts, normalize punctuation, preserve vital technical terms "
            "(e.g. C++, C#, .NET, Node.js, Next.js, scikit-learn, CI/CD), and strip non-printable characters. "
            "Return a strict JSON object: {\"normalized_text\": \"<cleaned text>\"}\n\n"
            f"Text:\n{text[:8000]}"
        )
        data = self._generate_json(prompt)
        if not data or not isinstance(data, dict):
            return None
        norm = data.get("normalized_text")
        return str(norm).strip() if norm is not None else None

    def tokenize_text(self, text: str, remove_stopwords: bool = False) -> list[str] | None:
        """Tokenize text into words and preserved technical terms using Gemini."""
        stopwords_instruction = (
            "Filter out common English grammatical stop words while preserving technical symbols and single-letter terms like 'c' or 'r'. "
            if remove_stopwords
            else "Preserve all words and terms in order. "
        )
        prompt = (
            "Tokenize the following text into a list of word and technical tokens (preserve terms like C++, C#, Node.js, Next.js, scikit-learn). "
            f"{stopwords_instruction}"
            "Return a strict JSON object: {\"tokens\": [\"token1\", \"token2\", ...]}\n\n"
            f"Text:\n{text[:6000]}"
        )
        data = self._generate_json(prompt)
        if not data or not isinstance(data, dict):
            return None
        tokens = data.get("tokens", [])
        return [str(t).strip() for t in tokens if str(t).strip()]

    def resolve_skill_aliases(self, skills: list[str]) -> list[str] | None:
        """Resolve and standardize skills and skill aliases to their canonical names using Gemini."""
        if not skills:
            return []
        cleaned_skills = [str(s).strip() for s in skills if str(s).strip()]
        if not cleaned_skills:
            return []
        prompt = (
            "Standardize and resolve the following programming, engineering, software, and technical skills/aliases "
            "into their canonical, industry-standard names. "
            "Examples: 'nodejs' -> 'Node.js', 'k8s' -> 'Kubernetes', 'reactjs' -> 'React', 'postgres' / 'postgresql' -> 'PostgreSQL', "
            "'aws' -> 'AWS', 'gcp' -> 'GCP', 'py' / 'python3' -> 'Python', 'sklearn' -> 'scikit-learn', 'ts' -> 'TypeScript', "
            "'js' -> 'JavaScript', 'cpp' -> 'C++', 'csharp' / '.net' -> 'C#', 'cicd' -> 'CI/CD', 'rest api' -> 'REST API'. "
            "Return a strict JSON object: {\"canonical_skills\": [\"Node.js\", \"Kubernetes\", ...]}\n\n"
            f"Skills to resolve: {cleaned_skills}"
        )
        data = self._generate_json(prompt)
        if not data or not isinstance(data, dict):
            return None
        canonical = data.get("canonical_skills") or data.get("skills") or []
        return [str(s).strip() for s in canonical if str(s).strip()]

    def resolve_skill_alias(self, alias: str) -> str | None:
        """Resolve a single skill alias into its canonical name using Gemini."""
        if not alias or not alias.strip():
            return None
        prompt = (
            "Standardize and resolve the following programming, engineering, software, or technical skill/alias "
            "into its canonical, industry-standard name. "
            "Examples: 'nodejs' -> 'Node.js', 'k8s' -> 'Kubernetes', 'reactjs' -> 'React', 'postgres' -> 'PostgreSQL', "
            "'aws' -> 'AWS', 'gcp' -> 'GCP', 'py' -> 'Python', 'sklearn' -> 'scikit-learn'. "
            "Return a strict JSON object: {\"canonical_skill\": \"<Canonical Name>\"}\n\n"
            f"Skill to resolve: {alias.strip()}"
        )
        data = self._generate_json(prompt)
        if not data or not isinstance(data, dict):
            return None
        canon = data.get("canonical_skill") or data.get("skill")
        if canon and isinstance(canon, str) and canon.strip():
            return canon.strip()
        skills_list = data.get("canonical_skills") or data.get("skills")
        if skills_list and isinstance(skills_list, list) and len(skills_list) > 0:
            return str(skills_list[0]).strip()
        return None




