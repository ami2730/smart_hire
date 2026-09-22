"""
Resume Section Parser.

Delegates section segmentation entirely to Google Gemini.
No local regex or heading-lookup processing is performed.

Canonical sections produced:
- summary, skills, experience, education, projects, certifications, languages
"""

from __future__ import annotations

from typing import Any

# Canonical section keys (kept for reference and empty-result construction)
CANONICAL_SECTIONS = [
    "summary",
    "skills",
    "experience",
    "education",
    "projects",
    "certifications",
    "languages",
]


import re


class SectionParser:
    """Parses raw resume text into canonical sections using Google Gemini with deterministic fallback."""

    def __init__(self, gemini_service: Any = None) -> None:
        if gemini_service is None:
            try:
                from app.services.gemini_service import GeminiService
                self.gemini_service: Any = GeminiService()
            except Exception:
                self.gemini_service = None
        else:
            self.gemini_service = gemini_service

    def parse(self, text: str) -> dict[str, str | None]:
        """Parse raw resume text into canonical sections using Gemini or deterministic fallback.

        Returns:
            Dictionary with keys: summary, skills, experience, education,
            projects, certifications, languages. Missing sections are None.
        """
        if not text:
            return {sec: None for sec in CANONICAL_SECTIONS}

        if self.gemini_service and getattr(self.gemini_service, "is_enabled", False):
            result = self.gemini_service.parse_sections(text)
            if result is not None and any(v for v in result.values()):
                return result

        # Deterministic fallback section parser
        lines = text.split("\n")
        sections: dict[str, list[str]] = {sec: [] for sec in CANONICAL_SECTIONS}
        current_sec: str | None = "summary"

        SECTION_HEADERS = {
            "skills": re.compile(r"^(technical\s+skills|skills|core\s+competencies|technologies|tools)[\s:_\-*]*$", re.I),
            "experience": re.compile(r"^(work\s+experience|professional\s+experience|experience|employment(?:\s+history)?|work\s+history)[\s:_\-*]*$", re.I),
            "education": re.compile(r"^(education|academic\s+background|qualifications|academic\s+history|educational\s+background|degrees?|education\s*&.*|education\s+and.*)[\s:_\-*]*$", re.I),
            "projects": re.compile(r"^(projects|personal\s+projects|portfolio|key\s+projects)[\s:_\-*]*$", re.I),
            "certifications": re.compile(r"^(certifications?|licenses?|credentials?)[\s:_\-*]*$", re.I),
            "languages": re.compile(r"^(languages?|language\s+proficiency)[\s:_\-*]*$", re.I),
            "summary": re.compile(r"^(summary|professional\s+summary|profile|about(?:\s+me)?|objective)[\s:_\-*]*$", re.I),
        }

        for line in lines:
            trimmed = line.strip()
            if not trimmed:
                continue
            matched_sec = None
            for sec_name, header_regex in SECTION_HEADERS.items():
                if header_regex.match(trimmed):
                    matched_sec = sec_name
                    break
            if matched_sec:
                current_sec = matched_sec
                continue
            if current_sec and current_sec in sections:
                sections[current_sec].append(trimmed)

        return {sec: "\n".join(lines).strip() or None for sec, lines in sections.items()}


_default_parser = SectionParser()


def parse_sections(text: str) -> dict[str, str | None]:
    """Module-level convenience function for section parsing."""
    return _default_parser.parse(text)
