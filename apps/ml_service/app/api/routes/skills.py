"""
Skills routes — Controlled dictionary and skill extraction endpoints.

Endpoints:
- GET /api/v1/skills: Returns the list of all supported canonical skills.
- POST /api/v1/skills/extract: Extracts canonical skills and resolves aliases from text.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, Field

from app.services.skill_service import SkillService

router = APIRouter(prefix="/api/v1/skills", tags=["Skills"])


def get_skill_service() -> SkillService:
    """Dependency injection provider for SkillService."""
    return SkillService()


class SkillListResponse(BaseModel):
    """Response containing the list of supported canonical skills."""

    count: int
    skills: list[str]


class SkillExtractRequest(BaseModel):
    """Request payload for extracting skills from raw text."""

    text: str = Field(..., description="Raw text from resume or job description.")


class SkillExtractResponse(BaseModel):
    """Response payload containing extracted canonical skills."""

    skills: list[str]


@router.get(
    "",
    response_model=SkillListResponse,
    status_code=status.HTTP_200_OK,
    summary="List Canonical Skills",
    description="Returns all canonical technical skills configured in the controlled skills dictionary.",
)
async def list_canonical_skills(
    skill_service: SkillService = Depends(get_skill_service),
) -> SkillListResponse:
    """Retrieve the canonical list of known skills."""
    skills = skill_service.get_canonical_skills()
    return SkillListResponse(count=len(skills), skills=skills)


@router.post(
    "/extract",
    response_model=SkillExtractResponse,
    status_code=status.HTTP_200_OK,
    summary="Extract Skills from Text",
    description="Extracts known skills from input text, resolving aliases to canonical skill names.",
)
async def extract_skills_from_text(
    payload: SkillExtractRequest,
    skill_service: SkillService = Depends(get_skill_service),
) -> SkillExtractResponse:
    """Extract and resolve canonical skills from plain text."""
    extracted = skill_service.extract_skills(payload.text)
    return SkillExtractResponse(skills=extracted)


class SkillResolveAliasesRequest(BaseModel):
    """Request payload for resolving skill aliases to canonical names."""

    skills: list[str] = Field(..., description="List of raw skills or aliases.")


class SkillResolveAliasesResponse(BaseModel):
    """Response payload containing canonical skills."""

    canonical_skills: list[str]


@router.post(
    "/resolve-aliases",
    response_model=SkillResolveAliasesResponse,
    status_code=status.HTTP_200_OK,
    summary="Resolve Skill Aliases",
    description="Resolves raw skill aliases (e.g. nodejs, k8s, py) into canonical industry-standard names using Gemini.",
)
async def resolve_skill_aliases_endpoint(
    payload: SkillResolveAliasesRequest,
    skill_service: SkillService = Depends(get_skill_service),
) -> SkillResolveAliasesResponse:
    """Resolve skill aliases to canonical names using Gemini."""
    resolved = skill_service.resolve_aliases(payload.skills)
    return SkillResolveAliasesResponse(canonical_skills=resolved)

