"""
Tests for TF-IDF Vectorization, Model Persistence, and Cosine Similarity — Phase 5.
"""

from __future__ import annotations

import tempfile
import pytest
import numpy as np

from app.core.exceptions import ModelNotFoundError
from app.ml.model_manager import ModelManager
from app.ml.similarity import (
    BaseSimilarityEngine,
    TfidfSimilarityEngine,
    calculate_cosine_similarity,
)
from app.ml.tfidf import TfidfModel
from app.services.similarity_service import SimilarityService
from app.services.vectorization_service import VectorizationService


class TestTfidfModel:
    """Unit tests for TfidfModel."""

    def test_supports_unigrams_and_bigrams(self) -> None:
        corpus = [
            "backend developer with python and machine learning skills",
            "frontend developer building react interfaces",
        ]
        model = TfidfModel(ngram_range=(1, 2))
        model.fit(corpus)
        vocab = model.get_feature_names()

        # Check 1-grams
        assert "python" in vocab
        assert "react" in vocab
        # Check 2-grams
        assert "backend developer" in vocab
        assert "machine learning" in vocab

    def test_transform_is_reusable_without_refitting(self) -> None:
        model = TfidfModel().fit(["python postgresql docker"])
        initial_vocab_len = len(model.vectorizer.vocabulary_)

        # Transform unseen text
        matrix = model.transform(["java kubernetes python"])
        assert matrix.shape[0] == 1
        # Vocabulary size should NOT change
        assert len(model.vectorizer.vocabulary_) == initial_vocab_len

    def test_baseline_autofit(self) -> None:
        model = TfidfModel()
        matrix = model.transform(["python backend engineer"])
        assert model.is_fitted
        assert matrix.shape[1] > 0


class TestModelManager:
    """Unit tests for ModelManager."""

    def test_save_and_load_model(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            manager = ModelManager(base_dir=tmpdir)
            sample_data = {"weights": [0.5, 0.25, 0.15, 0.10], "tag": "test"}

            path = manager.save_model(sample_data, "test_weights", version="v1")
            assert path.is_file()
            assert manager.model_exists("test_weights", version="v1")

            loaded = manager.load_model("test_weights", version="v1")
            assert loaded == sample_data

    def test_load_nonexistent_model_raises_not_found(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            manager = ModelManager(base_dir=tmpdir)
            with pytest.raises(ModelNotFoundError) as exc_info:
                manager.load_model("nonexistent_model", version="v999")
            assert "was not found" in str(exc_info.value.message)


class TestCosineSimilarity:
    """Unit tests for calculate_cosine_similarity."""

    def test_identical_vectors_yield_high_similarity(self) -> None:
        vec_a = np.array([[1.0, 2.0, 3.0]])
        vec_b = np.array([[1.0, 2.0, 3.0]])
        score = calculate_cosine_similarity(vec_a, vec_b)
        assert pytest.approx(score, 0.001) == 1.0

    def test_orthogonal_vectors_yield_zero_similarity(self) -> None:
        vec_a = np.array([[1.0, 0.0]])
        vec_b = np.array([[0.0, 1.0]])
        score = calculate_cosine_similarity(vec_a, vec_b)
        assert score == 0.0

    def test_similarity_is_normalized_between_zero_and_one(self) -> None:
        vec_a = np.array([[0.5, 0.5]])
        vec_b = np.array([[0.1, 0.9]])
        score = calculate_cosine_similarity(vec_a, vec_b)
        assert 0.0 <= score <= 1.0


class TestSimilarityServices:
    """Integration tests for TfidfSimilarityEngine and SimilarityService."""

    def test_high_similarity_on_matching_text(self) -> None:
        engine = TfidfSimilarityEngine()
        candidate = "backend software engineer with python fastapi and postgresql"
        job = "backend software engineer requiring python fastapi and postgresql"

        score = engine.compute_similarity(candidate, job)
        assert 0.0 <= score <= 1.0
        assert score > 0.6  # Strongly similar texts

    def test_low_similarity_on_disjoint_text(self) -> None:
        engine = TfidfSimilarityEngine()
        candidate = "graphic designer typography photoshop illustrator"
        job = "backend software engineer python postgresql docker"

        score = engine.compute_similarity(candidate, job)
        assert 0.0 <= score <= 1.0
        assert score < 0.2  # Unrelated domain text

    def test_batch_similarity(self) -> None:
        engine = TfidfSimilarityEngine()
        candidates = [
            "backend developer python postgresql",
            "graphic designer photoshop",
        ]
        job = "backend software engineer python postgresql"

        scores = engine.compute_batch_similarity(candidates, job)
        assert len(scores) == 2
        assert scores[0] > scores[1]  # Candidate 1 is more similar than Candidate 2

    def test_similarity_service_integration(self) -> None:
        sim_service = SimilarityService()
        cand = "data scientist machine learning scikit-learn python"
        job = "machine learning engineer python scikit-learn"

        score = sim_service.calculate_similarity(cand, job)
        assert score > 0.4
