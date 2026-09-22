"""
ML Model Manager.

Handles saving, loading, versioning, and verifying ML model artifacts
(TF-IDF vectorizers, scalers, embeddings) using joblib.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any

import joblib

from app.core.config import get_settings
from app.core.exceptions import ModelNotFoundError
from app.core.logging import get_logger

logger = get_logger(__name__)


class ModelManager:
    """Manages serialization and deserialization of machine learning models."""

    def __init__(self, base_dir: str | None = None) -> None:
        settings = get_settings()
        self.base_dir = Path(base_dir or settings.model_dir)

    def _resolve_path(self, model_name: str, version: str | None = None, subfolder: str = "") -> Path:
        """Resolve full filesystem path for a model artifact."""
        target_dir = self.base_dir / subfolder if subfolder else self.base_dir
        target_dir.mkdir(parents=True, exist_ok=True)

        filename = f"{model_name}_{version}.joblib" if version else f"{model_name}.joblib"
        return target_dir / filename

    def model_exists(self, model_name: str, version: str | None = None, subfolder: str = "") -> bool:
        """Check whether a model artifact exists on disk."""
        path = self._resolve_path(model_name, version, subfolder)
        return path.is_file()

    def save_model(
        self,
        model: Any,
        model_name: str,
        version: str | None = "v1",
        subfolder: str = "",
    ) -> Path:
        """Serialize and save an ML model artifact to disk using joblib.

        Args:
            model: The Python/scikit-learn model object to persist.
            model_name: Base name identifier for the model (e.g. 'tfidf_vectorizer').
            version: Optional version tag (e.g. 'v1', '1.0.0').
            subfolder: Optional subfolder within model directory (e.g. 'tfidf').

        Returns:
            Path to the saved artifact file.
        """
        path = self._resolve_path(model_name, version, subfolder)
        try:
            joblib.dump(model, path, compress=3)
            logger.info("Saved model artifact to %s", path)
            return path
        except Exception as exc:
            logger.error("Failed to save model to %s: %s", path, exc)
            raise

    def load_model(
        self,
        model_name: str,
        version: str | None = "v1",
        subfolder: str = "",
    ) -> Any:
        """Load a serialized model artifact from disk using joblib.

        Args:
            model_name: Base name identifier for the model.
            version: Version tag of the model.
            subfolder: Subfolder within model directory.

        Returns:
            The loaded model instance.

        Raises:
            ModelNotFoundError: If the requested model file does not exist.
        """
        path = self._resolve_path(model_name, version, subfolder)
        if not path.is_file():
            # Fallback: check unversioned file
            unversioned_path = self._resolve_path(model_name, None, subfolder)
            if unversioned_path.is_file():
                path = unversioned_path
            else:
                logger.warning("Model artifact not found at %s", path)
                raise ModelNotFoundError(
                    f"Model artifact '{model_name}' (version: {version}) was not found at {path}."
                )

        try:
            model = joblib.load(path)
            logger.info("Loaded model artifact from %s", path)
            return model
        except Exception as exc:
            logger.error("Error loading model from %s: %s", path, exc)
            raise ModelNotFoundError(
                f"Failed to deserialize model artifact at {path}: {exc}"
            ) from exc
