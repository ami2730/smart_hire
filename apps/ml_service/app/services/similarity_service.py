"""
Similarity Service.

Provides high-level methods to compute semantic similarity between
candidate and job representations using interchangeable engines.
"""

from __future__ import annotations

from app.ml.similarity import BaseSimilarityEngine, TfidfSimilarityEngine
from app.services.vectorization_service import VectorizationService


class SimilarityService:
    """Service for calculating semantic vector similarities."""

    def __init__(
        self,
        engine: BaseSimilarityEngine | None = None,
        vectorization_service: VectorizationService | None = None,
    ) -> None:
        if engine is not None:
            self.engine = engine
        else:
            vec_service = vectorization_service or VectorizationService()
            self.engine = TfidfSimilarityEngine(tfidf_model=vec_service.tfidf_model)

    def calculate_similarity(self, candidate_text: str, job_text: str) -> float:
        """Calculate normalized semantic similarity (0.0 to 1.0) between candidate and job."""
        return self.engine.compute_similarity(candidate_text, job_text)

    def calculate_batch_similarity(
        self, candidate_texts: list[str], job_text: str
    ) -> list[float]:
        """Calculate similarity scores for a batch of candidate documents against a single job."""
        return self.engine.compute_batch_similarity(candidate_texts, job_text)
