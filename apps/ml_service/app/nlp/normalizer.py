"""
NLP Normalizer.

Delegates text normalization entirely to Google Gemini.
No local regex or rule-based processing is performed.
"""

from __future__ import annotations

from typing import Any


class TextNormalizer:
    """Normalizes raw input text using Google Gemini exclusively."""

    def __init__(self, gemini_service: Any = None) -> None:
        if gemini_service is None:
            try:
                from app.services.gemini_service import GeminiService
                self.gemini_service: Any = GeminiService()
            except Exception:
                self.gemini_service = None
        else:
            self.gemini_service = gemini_service

    def normalize(self, text: str, lowercase: bool = True) -> str:
        """Normalize text using Gemini.

        Cleans Unicode artifacts, normalizes punctuation, preserves technical
        terms (e.g. C++, C#, .NET, Node.js, scikit-learn, CI/CD).

        Returns the original text unchanged if Gemini is not enabled.
        """
        if not text or not text.strip():
            return ""

        if self.gemini_service and getattr(self.gemini_service, "is_enabled", False):
            result = self.gemini_service.normalize_text(text)
            if result is not None:
                return result.lower() if lowercase else result

        # Gemini not configured — return text as-is (lowercased if requested)
        return text.lower() if lowercase else text
