"""
Similarity Engines and Vector Operations.

Provides:
- calculate_cosine_similarity helper using sklearn.metrics.pairwise.cosine_similarity
- BaseSimilarityEngine abstract interface
- TfidfSimilarityEngine implementation (TF-IDF + Cosine Similarity)
- SentenceTransformerSimilarityEngine pluggable architecture for future embeddings
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any
import numpy as np
from scipy.sparse import issparse
from sklearn.metrics.pairwise import cosine_similarity

from app.core.logging import get_logger
from app.ml.tfidf import TfidfModel

logger = get_logger(__name__)


def calculate_cosine_similarity(candidate_vector: Any, job_vector: Any) -> float:
    """Calculate normalized cosine similarity between candidate and job vectors.

    Args:
        candidate_vector: Vector or matrix representing candidate document (1D or 2D).
        job_vector: Vector or matrix representing job document (1D or 2D).

    Returns:
        Float similarity score bounded between 0.0 and 1.0, rounded to 4 decimals.
    """
    try:
        # Ensure 2D shape for sklearn cosine_similarity
        if hasattr(candidate_vector, "ndim") and candidate_vector.ndim == 1:
            candidate_vector = candidate_vector.reshape(1, -1)
        if hasattr(job_vector, "ndim") and job_vector.ndim == 1:
            job_vector = job_vector.reshape(1, -1)

        sim_matrix = cosine_similarity(candidate_vector, job_vector)
        score = float(sim_matrix[0][0])

        # Handle numerical precision: clamp strictly to [0.0, 1.0]
        score = max(0.0, min(1.0, score))
        return round(score, 4)
    except Exception as exc:
        logger.error("Error calculating cosine similarity: %s", exc)
        return 0.0


class BaseSimilarityEngine(ABC):
    """Abstract base class for all semantic similarity engines."""

    @abstractmethod
    def compute_similarity(self, candidate_text: str, job_text: str) -> float:
        """Calculate normalized similarity score (0.0 to 1.0) between candidate and job text."""
        pass

    @abstractmethod
    def compute_batch_similarity(
        self, candidate_texts: list[str], job_text: str
    ) -> list[float]:
        """Calculate similarity scores between multiple candidates and a single job description."""
        pass


class TfidfSimilarityEngine(BaseSimilarityEngine):
    """Semantic similarity engine based on TF-IDF n-grams and Cosine Similarity."""

    def __init__(self, tfidf_model: TfidfModel | None = None) -> None:
        self.tfidf_model = tfidf_model or TfidfModel()

    def compute_similarity(self, candidate_text: str, job_text: str) -> float:
        """Transform candidate and job text using TF-IDF and calculate cosine similarity."""
        vectors = self.tfidf_model.transform([candidate_text, job_text])
        cand_vec = vectors[0]
        job_vec = vectors[1]
        return calculate_cosine_similarity(cand_vec, job_vec)

    def compute_batch_similarity(
        self, candidate_texts: list[str], job_text: str
    ) -> list[float]:
        """Transform multiple candidates and calculate cosine similarity against one job."""
        if not candidate_texts:
            return []

        all_texts = list(candidate_texts) + [job_text]
        all_vectors = self.tfidf_model.transform(all_texts)

        job_vec = all_vectors[-1]
        cand_vectors = all_vectors[:-1]

        sim_matrix = cosine_similarity(cand_vectors, job_vec)
        scores = [round(max(0.0, min(1.0, float(val[0]))), 4) for val in sim_matrix]
        return scores


class SentenceTransformerSimilarityEngine(BaseSimilarityEngine):
    """Future semantic similarity engine using dense Sentence Transformers embeddings (e.g. all-MiniLM-L6-v2).

    Designed to be drop-in compatible without modifying scoring or ranking services.
    """

    def __init__(self, model_name: str = "all-MiniLM-L6-v2") -> None:
        self.model_name = model_name
        self._model: Any = None

    def _ensure_loaded(self) -> None:
        if self._model is None:
            try:
                from sentence_transformers import SentenceTransformer
                self._model = SentenceTransformer(self.model_name)
                logger.info("Loaded SentenceTransformer model: %s", self.model_name)
            except ImportError:
                raise NotImplementedError(
                    "SentenceTransformer is not installed. To use dense embeddings, "
                    "install sentence-transformers: pip install sentence-transformers"
                )

    def compute_similarity(self, candidate_text: str, job_text: str) -> float:
        self._ensure_loaded()
        embeddings = self._model.encode([candidate_text, job_text], normalize_embeddings=True)
        return calculate_cosine_similarity(embeddings[0], embeddings[1])

    def compute_batch_similarity(
        self, candidate_texts: list[str], job_text: str
    ) -> list[float]:
        if not candidate_texts:
            return []
        self._ensure_loaded()
        cand_embeddings = self._model.encode(candidate_texts, normalize_embeddings=True)
        job_embedding = self._model.encode([job_text], normalize_embeddings=True)
        sim_matrix = cosine_similarity(cand_embeddings, job_embedding)
        return [round(max(0.0, min(1.0, float(val[0]))), 4) for val in sim_matrix]
