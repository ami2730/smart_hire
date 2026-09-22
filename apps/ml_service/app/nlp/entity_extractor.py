"""
NLP Entity Extractor.

Delegates entity extraction entirely to Google Gemini.
No local regex or keyword-matching is performed.

Extracts:
- Job titles
- Educational qualifications & degrees
- Work experience items & career history
"""

from __future__ import annotations

from typing import Any


import re


class EntityExtractor:
    """Extracts job titles, education, and experience using Google Gemini with deterministic fallback."""

    def __init__(self, gemini_service: Any = None) -> None:
        if gemini_service is None:
            try:
                from app.services.gemini_service import GeminiService
                self.gemini_service: Any = GeminiService()
            except Exception:
                self.gemini_service = None
        else:
            self.gemini_service = gemini_service

    def extract_job_titles(self, text: str, sections: dict[str, str | None] | None = None) -> list[str]:
        """Extract job titles from resume text using Gemini.

        Returns an empty list if Gemini is not enabled.
        """
        if not text:
            return []

        if self.gemini_service and getattr(self.gemini_service, "is_enabled", False):
            result = self.gemini_service.extract_job_titles(text)
            if result is not None:
                return sorted(set(result))

        return []

    def extract_education(self, text: str, sections: dict[str, str | None] | None = None) -> list[str]:
        """Extract educational qualifications from resume text using Gemini, with deterministic fallback."""
        if not text:
            return []

        if self.gemini_service and getattr(self.gemini_service, "is_enabled", False):
            result = self.gemini_service.extract_education(text)
            if result:
                return result

        # Deterministic local NLP fallback:
        # Use education section first if available, else scan lines in text
        source_text = ""
        if sections and sections.get("education"):
            source_text = sections["education"] or ""
        if not source_text:
            source_text = text

        lines = [line.strip() for line in source_text.split("\n") if line.strip()]
        edu_entries: list[str] = []

        DEGREE_REGEX = re.compile(
            r"\b(bachelor(?:\s+of\s+[a-zA-Z\s]+)?|bachelors?|b\.?sc?\.?|bsc\.?|b\.?s\.?|b\.?a\.?|b\.?tech\.?|b\.?eng\.?|b\.?e\.?|bca|"
            r"master(?:\s+of\s+[a-zA-Z\s]+)?|masters?|m\.?sc?\.?|msc\.?|m\.?s\.?|m\.?a\.?|mba|m\.?tech\.?|m\.?eng\.?|m\.?e\.?|postgraduate|"
            r"ph\.?d\.?|doctorate|doctoral|doctor\s+of\s+[a-zA-Z\s]+|"
            r"associate(?:\s+degree|\s+of\s+[a-zA-Z\s]+)?|diploma|higher\s+diploma|certificate)\b",
            re.IGNORECASE,
        )
        INSTITUTION_REGEX = re.compile(
            r"\b(university|college|institute|academy|polytechnic|school\s+of)\b",
            re.IGNORECASE,
        )

        for i, line in enumerate(lines):
            has_degree = bool(DEGREE_REGEX.search(line))
            has_institution = bool(INSTITUTION_REGEX.search(line))

            if has_degree:
                entry = line
                # Look at adjacent line to see if institution or year is on the next line
                if i + 1 < len(lines):
                    next_line = lines[i + 1]
                    if INSTITUTION_REGEX.search(next_line) or re.search(r"\b(19\d\d|20\d\d)\b", next_line):
                        entry = f"{entry} - {next_line}"
                edu_entries.append(entry)
            elif has_institution and not any(line in e for e in edu_entries):
                if re.search(r"\b(graduated|degree|studied|completed|class\s+of|19\d\d|20\d\d)\b", line, re.I):
                    edu_entries.append(line)

        return edu_entries

    def extract_experience(self, text: str, sections: dict[str, str | None] | None = None) -> list[str]:
        """Extract work experience entries from resume text using Gemini.

        Returns an empty list if Gemini is not enabled.
        """
        if not text:
            return []

        if self.gemini_service and getattr(self.gemini_service, "is_enabled", False):
            result = self.gemini_service.extract_experience(text)
            if result is not None:
                return result

        return []
