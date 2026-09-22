"""
SmartHire ML Service — FastAPI Application Entry Point.

Responsibilities:
  - Create and configure the FastAPI application instance.
  - Register all API routers.
  - Configure structured logging.
  - Configure CORS (restricted to known origins).
  - Register global exception handlers (no stack trace leakage).
  - Expose /health without authentication.

Start with:
    uvicorn app.main:app --reload
"""

from __future__ import annotations

import logging
import time
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app import __service_name__, __version__
from app.api.routes import health, matching, resume, screening, skills
from app.core.config import get_settings
from app.core.exceptions import MLServiceError
from app.core.logging import configure_logging, get_logger

# ---------------------------------------------------------------------------
# Logging must be configured before anything else
# ---------------------------------------------------------------------------
configure_logging()
logger = get_logger(__name__)


# ---------------------------------------------------------------------------
# Lifespan — startup / shutdown hooks
# ---------------------------------------------------------------------------


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan: initialise heavy resources on startup."""
    settings = get_settings()
    logger.info(
        "Starting %s v%s | environment=%s | host=%s | port=%s",
        __service_name__,
        __version__,
        settings.environment,
        settings.ml_service_host,
        settings.ml_service_port,
    )

    # Warm up ML vectorizer and skill dictionary at startup
    try:
        from app.services.skill_service import SkillService
        from app.services.vectorization_service import VectorizationService
        
        skill_svc = SkillService()
        logger.info("Skill service warmed | %d canonical skills ready", len(skill_svc.get_canonical_skills()))
        
        vec_svc = VectorizationService()
        logger.info("Vectorization service warmed | model ready")
    except Exception as exc:
        logger.warning("Startup resource warm-up encountered an issue: %s", exc)

    yield

    logger.info("Shutting down %s.", __service_name__)


# ---------------------------------------------------------------------------
# Application factory
# ---------------------------------------------------------------------------


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    settings = get_settings()

    application = FastAPI(
        title="SmartHire ML Service",
        description=(
            "AI-assisted candidate screening and resume skill-matching service. "
            "Provides NLP-based resume analysis, skill extraction, TF-IDF "
            "vectorization, candidate scoring, ranking, and explainable results. "
            "\n\n"
            "> **Note**: This service provides AI-assisted recommendations only. "
            "Final hiring decisions remain with human recruiters."
        ),
        version=__version__,
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        lifespan=lifespan,
        contact={
            "name": "SmartHire Engineering",
            "url": "https://github.com/your-org/smart_hire",
        },
        license_info={
            "name": "MIT",
        },
    )

    # -----------------------------------------------------------------
    # CORS — only expose allowed origins
    # -----------------------------------------------------------------
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_credentials=False,
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type", "Accept"],
    )

    # -----------------------------------------------------------------
    # Request timing middleware
    # -----------------------------------------------------------------
    @application.middleware("http")
    async def add_process_time_header(request: Request, call_next):  # type: ignore[no-untyped-def]
        start = time.perf_counter()
        response = await call_next(request)
        duration_ms = (time.perf_counter() - start) * 1000
        response.headers["X-Process-Time-Ms"] = f"{duration_ms:.2f}"
        logger.debug(
            "Request | method=%s | path=%s | status=%s | duration=%.2fms",
            request.method,
            request.url.path,
            response.status_code,
            duration_ms,
        )
        return response

    # -----------------------------------------------------------------
    # Global exception handlers
    # -----------------------------------------------------------------

    @application.exception_handler(MLServiceError)
    async def ml_service_exception_handler(
        request: Request, exc: MLServiceError
    ) -> JSONResponse:
        """Convert domain exceptions into structured JSON error responses."""
        logger.warning(
            "MLServiceError | code=%s | message=%s | path=%s",
            exc.error_code,
            exc.message,
            request.url.path,
        )
        return JSONResponse(
            status_code=exc.status_code,
            content=exc.to_dict(),
        )

    @application.exception_handler(Exception)
    async def unhandled_exception_handler(
        request: Request, exc: Exception
    ) -> JSONResponse:
        """Catch-all handler — never expose internal details in production."""
        logger.exception(
            "Unhandled exception | path=%s | type=%s",
            request.url.path,
            type(exc).__name__,
        )
        # In development, include the exception type for easier debugging.
        message = (
            f"Internal server error: {type(exc).__name__}"
            if settings.is_development
            else "An unexpected error occurred. Please try again later."
        )
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "error": {
                    "code": "INTERNAL_ERROR",
                    "message": message,
                },
            },
        )

    # -----------------------------------------------------------------
    # Router registration
    # -----------------------------------------------------------------
    application.include_router(health.router)           # /health
    application.include_router(resume.router)           # /api/v1/resume/*
    application.include_router(skills.router)           # /api/v1/skills/*
    application.include_router(matching.router)         # /api/v1/job/*
    application.include_router(screening.router)        # /api/v1/screening/*

    logger.info("All routers registered successfully.")
    return application


# ---------------------------------------------------------------------------
# Application instance (used by uvicorn)
# ---------------------------------------------------------------------------
app = create_app()
