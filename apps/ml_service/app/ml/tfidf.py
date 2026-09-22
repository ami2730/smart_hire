"""
TF-IDF Vectorizer Module.

Encapsulates scikit-learn's TfidfVectorizer configured for:
- 1-gram and 2-gram phrases (e.g. 'machine learning', 'backend developer')
- English stop-words filtering
- Normalization (L2 norm)
"""

from __future__ import annotations

from typing import Any
import numpy as np
from scipy.sparse import csr_matrix
from sklearn.feature_extraction.text import TfidfVectorizer

from app.core.logging import get_logger

logger = get_logger(__name__)

# Baseline tech corpus to ensure vectorizer can initialize immediately
BASELINE_TECH_CORPUS: list[str] = [
    "backend software engineer with python django fastapi postgresql rest api and docker",
    "frontend web developer with react next.js typescript javascript and css",
    "full stack engineer with node.js express react postgresql mysql and cloud deployments",
    "data scientist specializing in machine learning scikit-learn tensorflow pandas and numpy",
    "devops engineer with docker kubernetes linux ci/cd aws and terraform infrastructure",
    "cloud architect designing scalable microservices system design and distributed databases",
    "machine learning engineer building nlp pipelines deep learning and model evaluation",
    "senior software engineer with 5 years experience in database optimization and api design",
    "quality assurance automation engineer testing rest apis python and selenium",
    "mobile application developer using flutter react native swift and kotlin",
]


class TfidfModel:
    """Wrapper around scikit-learn TfidfVectorizer for resume and job matching."""

    def __init__(
        self,
        stop_words: str | list[str] | None = "english",
        ngram_range: tuple[int, int] = (1, 2),
        max_features: int | None = 10000,
        vectorizer: TfidfVectorizer | None = None,
    ) -> None:
        if vectorizer is not None:
            self.vectorizer = vectorizer
        else:
            self.vectorizer = TfidfVectorizer(
                stop_words=stop_words,
                ngram_range=ngram_range,
                max_features=max_features,
                sublinear_tf=True,
            )
        self.is_fitted = hasattr(self.vectorizer, "vocabulary_") and bool(self.vectorizer.vocabulary_)

    def fit(self, corpus: list[str]) -> TfidfModel:
        """Fit the vectorizer on a corpus of documents."""
        if not corpus:
            raise ValueError("Corpus cannot be empty.")
        self.vectorizer.fit(corpus)
        self.is_fitted = True
        logger.info(
            "Fitted TF-IDF vectorizer | vocabulary_size=%d | ngram_range=%s",
            len(self.vectorizer.vocabulary_),
            self.vectorizer.ngram_range,
        )
        return self

    def fit_baseline(self) -> TfidfModel:
        """Fit the vectorizer on baseline technology and domain corpus."""
        return self.fit(BASELINE_TECH_CORPUS)

    def transform(self, texts: list[str]) -> csr_matrix:
        """Transform texts into sparse TF-IDF vectors."""
        if not self.is_fitted:
            # Auto-fit on baseline corpus if not fitted yet
            logger.info("TF-IDF vectorizer not fitted; auto-fitting baseline corpus.")
            self.fit_baseline()

        # Handle empty strings gracefully by substituting a space
        safe_texts = [t if t and t.strip() else " " for t in texts]
        return self.vectorizer.transform(safe_texts)

    def fit_transform(self, corpus: list[str]) -> csr_matrix:
        """Fit and transform in a single step."""
        self.fit(corpus)
        return self.transform(corpus)

    def get_feature_names(self) -> list[str]:
        """Return the list of feature vocabulary n-grams."""
        if not self.is_fitted:
            return []
        return list(self.vectorizer.get_feature_names_out())
