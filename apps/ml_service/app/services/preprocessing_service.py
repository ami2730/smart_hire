"""
Preprocessing Service.

Provides text preprocessing pipeline for resumes and job descriptions.
All NLP operations are delegated to Google Gemini exclusively via TextNormalizer and TechnicalTokenizer.
"""

from __future__ import annotations

from typing import Any

from app.nlp.normalizer import TextNormalizer
from app.nlp.tokenizer import TechnicalTokenizer


class PreprocessingService:
    """Service encapsulating the Gemini-powered NLP preprocessing pipeline."""

    def __init__(self, gemini_service: Any = None) -> None:
        if gemini_service is None:
            try:
                from app.services.gemini_service import GeminiService
                self.gemini_service: Any = GeminiService()
            except Exception:
                self.gemini_service = None
        else:
            self.gemini_service = gemini_service

        self.normalizer = TextNormalizer(gemini_service=self.gemini_service)
        self.tokenizer = TechnicalTokenizer(gemini_service=self.gemini_service)

    def preprocess_text(self, text: str, remove_stopwords: bool = False) -> str:
        """Normalize and clean text using Gemini.

        Args:
            text: Raw input text from resume or job description.
            remove_stopwords: When True, tokenizes and re-joins with stop words removed.

        Returns:
            Normalized text string.
        """
        if not text:
            return ""

        normalized = self.normalizer.normalize(text, lowercase=True)

        if not remove_stopwords:
            return normalized

        tokens = self.tokenizer.tokenize(normalized, remove_stopwords=True)
        return " ".join(tokens)

    def tokenize(self, text: str, remove_stopwords: bool = False) -> list[str]:
        """Tokenize text using Gemini."""
        normalized = self.normalizer.normalize(text, lowercase=True)
        return self.tokenizer.tokenize(normalized, remove_stopwords=remove_stopwords)


# Global singleton instance for easy import
_default_preprocessor = PreprocessingService()


def preprocess_text(text: str, remove_stopwords: bool = False) -> str:
    """Module-level convenience function for preprocessing text."""
    return _default_preprocessor.preprocess_text(text, remove_stopwords=remove_stopwords)
