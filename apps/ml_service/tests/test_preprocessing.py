"""
Tests for text preprocessing pipeline — Gemini-only NLP.

Verifies:
- TextNormalizer delegates to Gemini when enabled
- TechnicalTokenizer delegates to Gemini when enabled
- PreprocessingService wires Gemini through normalizer and tokenizer
- Empty/whitespace input handling
"""

from __future__ import annotations

import json
from unittest.mock import MagicMock

import httpx
import pytest

from app.nlp.normalizer import TextNormalizer
from app.nlp.tokenizer import TechnicalTokenizer
from app.services.preprocessing_service import PreprocessingService, preprocess_text


# ---------------------------------------------------------------------------
# Mock helpers
# ---------------------------------------------------------------------------

class MockResponse:
    def __init__(self, status_code: int, json_data: dict) -> None:
        self.status_code = status_code
        self._json_data = json_data

    def json(self) -> dict:
        return self._json_data


def make_gemini_service(normalized_text: str | None = None, tokens: list[str] | None = None):
    """Return a GeminiService backed by a mock client."""
    from app.core.config import Settings
    from app.services.gemini_service import GeminiService

    settings = Settings(gemini_api_key="test-key", use_gemini_nlp=True)
    mock_client = MagicMock(spec=httpx.Client)

    def side_effect(*args, **kwargs):
        payload = kwargs.get("json", {}) or {}
        prompt = ""
        if "contents" in payload:
            prompt = payload["contents"][0]["parts"][0].get("text", "")

        if "normalized_text" in prompt or "normalize" in prompt.lower():
            data = {"normalized_text": normalized_text or ""}
        else:
            data = {"tokens": tokens or []}

        return MockResponse(200, {
            "candidates": [{"content": {"parts": [{"text": json.dumps(data)}]}}]
        })

    mock_client.post.side_effect = side_effect
    return GeminiService(settings=settings, client=mock_client)


# ---------------------------------------------------------------------------
# TextNormalizer
# ---------------------------------------------------------------------------

class TestTextNormalizer:
    """Unit tests for TextNormalizer with Gemini."""

    def test_empty_string_returns_empty(self) -> None:
        normalizer = TextNormalizer()
        assert normalizer.normalize("") == ""

    def test_whitespace_only_returns_empty(self) -> None:
        normalizer = TextNormalizer()
        assert normalizer.normalize("   ") == ""

    def test_normalizes_with_gemini(self) -> None:
        gem = make_gemini_service(normalized_text="C++ developer with Node.js and scikit-learn.")
        normalizer = TextNormalizer(gemini_service=gem)
        result = normalizer.normalize("C++ developer with Node.js and scikit-learn.")
        assert "c++" in result
        assert "node.js" in result
        assert "scikit-learn" in result

    def test_preserves_technical_terms_via_gemini(self) -> None:
        gem = make_gemini_service(
            normalized_text="skills: C++, C#, Node.js, Next.js, scikit-learn, CI/CD"
        )
        normalizer = TextNormalizer(gemini_service=gem)
        result = normalizer.normalize("Skills: C++, C#, Node.js, Next.js, scikit-learn, CI/CD")
        assert "c++" in result
        assert "c#" in result
        assert "node.js" in result
        assert "scikit-learn" in result
        assert "ci/cd" in result

    def test_lowercase_applied(self) -> None:
        gem = make_gemini_service(normalized_text="Python Developer")
        normalizer = TextNormalizer(gemini_service=gem)
        result = normalizer.normalize("Python Developer", lowercase=True)
        assert result == "python developer"

    def test_no_gemini_falls_back_to_lowercase(self) -> None:
        normalizer = TextNormalizer(gemini_service=None)
        result = normalizer.normalize("Senior Engineer", lowercase=True)
        assert result == "senior engineer"


# ---------------------------------------------------------------------------
# TechnicalTokenizer
# ---------------------------------------------------------------------------

class TestTechnicalTokenizer:
    """Unit tests for TechnicalTokenizer with Gemini."""

    def test_empty_string_returns_empty(self) -> None:
        tokenizer = TechnicalTokenizer()
        assert tokenizer.tokenize("") == []

    def test_tokenizes_with_gemini(self) -> None:
        gem = make_gemini_service(tokens=["c++", "c#", "node.js", "next.js", "scikit-learn", "ci/cd", "postgresql"])
        tokenizer = TechnicalTokenizer(gemini_service=gem)
        tokens = tokenizer.tokenize("c++ c# node.js next.js scikit-learn ci/cd postgresql")
        assert "c++" in tokens
        assert "c#" in tokens
        assert "node.js" in tokens
        assert "scikit-learn" in tokens
        assert "postgresql" in tokens

    def test_stopwords_removed_by_gemini(self) -> None:
        gem = make_gemini_service(tokens=["c", "r", "python", "node.js"])
        tokenizer = TechnicalTokenizer(gemini_service=gem)
        tokens = tokenizer.tokenize("knowledge of c and r and python with node.js", remove_stopwords=True)
        assert "c" in tokens
        assert "r" in tokens
        assert "python" in tokens
        assert "node.js" in tokens
        assert "and" not in tokens

    def test_no_gemini_returns_empty(self) -> None:
        tokenizer = TechnicalTokenizer(gemini_service=None)
        result = tokenizer.tokenize("Senior Python Engineer")
        assert result == []


# ---------------------------------------------------------------------------
# PreprocessingService
# ---------------------------------------------------------------------------

class TestPreprocessingService:
    """Integration tests for PreprocessingService with Gemini."""

    def test_empty_string_returns_empty(self) -> None:
        assert preprocess_text("") == ""

    def test_whitespace_returns_empty(self) -> None:
        assert preprocess_text("   ") == ""

    def test_preprocess_with_gemini(self) -> None:
        gem = make_gemini_service(
            normalized_text="senior software engineer skilled in python, postgresql, and rest api"
        )
        preprocessor = PreprocessingService(gemini_service=gem)
        result = preprocessor.preprocess_text("Senior Software Engineer skilled in Python, PostgreSQL, and REST API.")
        assert "python" in result
        assert "postgresql" in result

    def test_preprocess_preserves_technical_terms_via_gemini(self) -> None:
        gem = make_gemini_service(
            normalized_text="c++, c#, node.js, next.js, scikit-learn, postgresql, rest api, machine learning"
        )
        preprocessor = PreprocessingService(gemini_service=gem)
        result = preprocessor.preprocess_text("C++, C#, Node.js, Next.js, scikit-learn, PostgreSQL, REST API.")
        assert "c++" in result
        assert "node.js" in result
        assert "scikit-learn" in result
