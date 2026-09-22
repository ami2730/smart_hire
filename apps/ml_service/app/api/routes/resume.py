"""
Resume routes — Document extraction and candidate profile generation.

Endpoints:
- POST /api/v1/resume/extract: Extracts and normalizes text from PDF/DOCX resumes.
- POST /api/v1/resume/analyze: Generates structured candidate profiles from resumes.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, File, UploadFile, status

from app.core.exceptions import UnsupportedFileTypeError
from app.schemas.candidate import CandidateAnalysisResponse
from app.schemas.resume import DocumentExtractionResponse
from app.services.candidate_service import CandidateService
from app.services.document_service import DocumentService

router = APIRouter(prefix="/api/v1/resume", tags=["Resume"])


def get_document_service() -> DocumentService:
    """Dependency injection provider for DocumentService."""
    return DocumentService()


def get_candidate_service() -> CandidateService:
    """Dependency injection provider for CandidateService."""
    return CandidateService()


@router.post(
    "/extract",
    response_model=DocumentExtractionResponse,
    status_code=status.HTTP_200_OK,
    summary="Extract Text from Resume Document",
    description=(
        "Upload a resume in PDF or DOCX format. "
        "Validates file size (<= 10MB) and binary signature, extracts plain text "
        "using PyMuPDF (PDF) or python-docx (DOCX), and returns normalized text."
    ),
)
async def extract_resume_document(
    file: UploadFile = File(..., description="Resume file in PDF or DOCX format."),
    document_service: DocumentService = Depends(get_document_service),
) -> DocumentExtractionResponse:
    """Extract text from PDF or DOCX resume upload."""
    if not file.filename:
        raise UnsupportedFileTypeError("A valid filename must be provided.")

    content = await file.read()

    result = document_service.extract_from_bytes(
        content=content,
        filename=file.filename,
        content_type=file.content_type,
    )

    return DocumentExtractionResponse(
        success=True,
        document_type=result.document_type,
        text=result.text,
        page_count=result.page_count,
    )


@router.post(
    "/analyze",
    response_model=CandidateAnalysisResponse,
    status_code=status.HTTP_200_OK,
    summary="Analyze Resume & Generate Candidate Profile",
    description=(
        "Upload a resume in PDF or DOCX format. "
        "Executes the full pipeline: document text extraction, text normalization, "
        "resume section parsing, controlled skill extraction with alias resolution, "
        "and entity extraction (job titles, education, experience)."
    ),
)
async def analyze_resume(
    file: UploadFile = File(..., description="Resume file in PDF or DOCX format."),
    candidate_service: CandidateService = Depends(get_candidate_service),
) -> CandidateAnalysisResponse:
    """Extract and analyze a candidate resume into a structured profile."""
    if not file.filename:
        raise UnsupportedFileTypeError("A valid filename must be provided.")

    content = await file.read()

    profile = candidate_service.analyze_resume_bytes(
        content=content,
        filename=file.filename,
        content_type=file.content_type,
    )

    return CandidateAnalysisResponse(candidate_profile=profile)
