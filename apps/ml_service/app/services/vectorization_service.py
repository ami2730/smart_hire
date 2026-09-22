"""
Vectorization Service.

Manages reusable TF-IDF vectorizer instances, artifact loading via ModelManager,
and feature extraction for candidate and job documents.
"""

from __future__ import annotations

from scipy.sparse import csr_matrix
from sklearn.feature_extraction.text import TfidfVectorizer

from app.core.logging import get_logger
from app.ml.model_manager import ModelManager
from app.ml.tfidf import TfidfModel

logger = get_logger(__name__)

DEFAULT_TFIDF_MODEL_NAME = "tfidf_vectorizer"
DEFAULT_TFIDF_VERSION = "v1"
DEFAULT_TFIDF_SUBFOLDER = "tfidf"


class VectorizationService:
    """Service for managing reusable vectorizer instances and generating text embeddings/matrices."""

    def __init__(
        self,
        model_manager: ModelManager | None = None,
        model_name: str = DEFAULT_TFIDF_MODEL_NAME,
        version: str = DEFAULT_TFIDF_VERSION,
    ) -> None:
        self.model_manager = model_manager or ModelManager()
        self.model_name = model_name
        self.version = version
        self._tfidf_model: TfidfModel | None = None
        self._initialize_model()

    def _initialize_model(self) -> None:
        """Attempt to load saved vectorizer from disk; fallback to auto-fitting baseline if not found."""
        try:
            if self.model_manager.model_exists(
                self.model_name, self.version, DEFAULT_TFIDF_SUBFOLDER
            ):
                raw_vectorizer = self.model_manager.load_model(
                    self.model_name, self.version, DEFAULT_TFIDF_SUBFOLDER
                )
                self._tfidf_model = TfidfModel(vectorizer=raw_vectorizer)
                logger.info(
                    "VectorizationService initialized with saved model '%s' version '%s'",
                    self.model_name,
                    self.version,
                )
                return
        except Exception as exc:
            logger.warning("Could not load saved vectorizer: %s. Using baseline.", exc)

        # Baseline initialization
        logger.info("Initializing baseline TF-IDF vectorizer.")
        self._tfidf_model = TfidfModel().fit_baseline()

    @property
    def tfidf_model(self) -> TfidfModel:
        """Return the active, reusable TfidfModel instance."""
        if self._tfidf_model is None:
            self._initialize_model()
        assert self._tfidf_model is not None
        return self._tfidf_model

    def vectorize(self, texts: list[str]) -> csr_matrix:
        """Vectorize a list of texts using the cached reusable TF-IDF model."""
        return self.tfidf_model.transform(texts)

    def save_current_model(self) -> None:
        """Save the active vectorizer to disk via ModelManager."""
        if self._tfidf_model and self._tfidf_model.is_fitted:
            self.model_manager.save_model(
                self._tfidf_model.vectorizer,
                self.model_name,
                self.version,
                DEFAULT_TFIDF_SUBFOLDER,
            )
