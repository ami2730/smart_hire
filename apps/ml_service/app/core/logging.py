"""
SmartHire ML Service — Structured Logging Configuration.

Configures Python's standard logging with a consistent format.
Sensitive information (resume text, tokens, passwords) must NEVER be logged.
"""

from __future__ import annotations

import logging
import sys
from typing import Any

from app.core.config import get_settings


def configure_logging() -> None:
    """Configure application-wide logging based on environment settings."""
    settings = get_settings()

    log_level = getattr(logging, settings.log_level.upper(), logging.INFO)

    # Root formatter — include timestamp, level, logger name, message
    formatter = logging.Formatter(
        fmt="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%Y-%m-%dT%H:%M:%S",
    )

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)
    handler.setLevel(log_level)

    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)

    # Avoid adding duplicate handlers on reload
    if not root_logger.handlers:
        root_logger.addHandler(handler)
    else:
        root_logger.handlers.clear()
        root_logger.addHandler(handler)

    # Quieten noisy third-party loggers in production
    if settings.is_production:
        logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
        logging.getLogger("multipart").setLevel(logging.WARNING)

    logging.getLogger(__name__).info(
        "Logging configured | level=%s | environment=%s",
        settings.log_level,
        settings.environment,
    )


def get_logger(name: str) -> logging.Logger:
    """Return a named logger for use inside modules.

    Usage::

        from app.core.logging import get_logger
        logger = get_logger(__name__)
    """
    return logging.getLogger(name)
