"""
NLP Tokenizer.

Delegates tokenization entirely to Google Gemini.
No local regex or rule-based processing is performed.
"""

from __future__ import annotations

from typing import Any


class TechnicalTokenizer:
    """Tokenizes text into words and technical terms using Google Gemini exclusively."""

    def __init__(self, stop_words: set[str] | None = None, gemini_service: Any = None) -> None:
        # stop_words kept for interface compatibility but not used when Gemini is enabled
        self.stop_words = stop_words or set()
        if gemini_service is None:
            try:
                from app.services.gemini_service import GeminiService
                self.gemini_service: Any = GeminiService()
            except Exception:
                self.gemini_service = None
        else:
            self.gemini_service = gemini_service

    def tokenize(self, text: str, remove_stopwords: bool = False) -> list[str]:
        """Tokenize text using Gemini.

        Preserves technical terms like C++, C#, Node.js, scikit-learn.
        Returns an empty list if Gemini is not enabled.
        """
        if not text:
            return []

        if self.gemini_service and getattr(self.gemini_service, "is_enabled", False):
            result = self.gemini_service.tokenize_text(text, remove_stopwords=remove_stopwords)
            if result is not None:
                return result

        return []
