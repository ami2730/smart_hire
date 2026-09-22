"""
Health check route.

GET /health — Returns service status. No authentication required.
"""

from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

from app import __service_name__, __version__

router = APIRouter(tags=["Health"])


class HealthResponse(BaseModel):
    """Health check response payload."""

    status: str
    service: str
    version: str

    model_config = {"json_schema_extra": {"example": {
        "status": "ok",
        "service": "smarthire-ml-service",
        "version": "1.0.0",
    }}}


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Health Check",
    description=(
        "Returns the current operational status of the ML service. "
        "This endpoint does not require authentication and is safe to poll "
        "from load balancers and uptime monitors."
    ),
)
async def health_check() -> HealthResponse:
    """Return service health status."""
    return HealthResponse(
        status="ok",
        service=__service_name__,
        version=__version__,
    )
