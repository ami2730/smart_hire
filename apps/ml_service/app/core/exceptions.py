"""
SmartHire ML Service — Custom Exception Hierarchy.

All domain exceptions inherit from MLServiceError so they can be caught
uniformly in the global exception handler registered in main.py.

Internal stack traces are NEVER exposed through production API responses.
"""

from __future__ import annotations

from http import HTTPStatus


class MLServiceError(Exception):
    """Base exception for all ML service errors."""

    status_code: int = HTTPStatus.INTERNAL_SERVER_ERROR.value
    error_code: str = "INTERNAL_ERROR"
    message: str = "An unexpected error occurred."

    def __init__(self, message: str | None = None) -> None:
        self.message = message or self.__class__.message
        super().__init__(self.message)

    def to_dict(self) -> dict:
        return {
            "success": False,
            "error": {
                "code": self.error_code,
                "message": self.message,
            },
        }


# ---------------------------------------------------------------------------
# Document / File exceptions
# ---------------------------------------------------------------------------


class UnsupportedFileTypeError(MLServiceError):
    """Raised when an uploaded file has an unsupported extension or MIME type."""

    status_code = HTTPStatus.UNPROCESSABLE_ENTITY.value
    error_code = "UNSUPPORTED_FILE_TYPE"
    message = "Only PDF and DOCX files are supported."


class FileTooLargeError(MLServiceError):
    """Raised when an uploaded file exceeds the configured size limit."""

    status_code = HTTPStatus.REQUEST_ENTITY_TOO_LARGE.value
    error_code = "FILE_TOO_LARGE"
    message = "Uploaded file exceeds the maximum allowed size."


class DocumentExtractionError(MLServiceError):
    """Raised when text cannot be extracted from a document."""

    status_code = HTTPStatus.UNPROCESSABLE_ENTITY.value
    error_code = "DOCUMENT_EXTRACTION_ERROR"
    message = "Failed to extract text from the document."


# ---------------------------------------------------------------------------
# Data / Validation exceptions
# ---------------------------------------------------------------------------


class InvalidResumeDataError(MLServiceError):
    """Raised when resume data fails validation."""

    status_code = HTTPStatus.UNPROCESSABLE_ENTITY.value
    error_code = "INVALID_RESUME_DATA"
    message = "The provided resume data is invalid or incomplete."


class InvalidJobDataError(MLServiceError):
    """Raised when job data fails validation."""

    status_code = HTTPStatus.UNPROCESSABLE_ENTITY.value
    error_code = "INVALID_JOB_DATA"
    message = "The provided job data is invalid or incomplete."


# ---------------------------------------------------------------------------
# ML / Model exceptions
# ---------------------------------------------------------------------------


class ModelNotFoundError(MLServiceError):
    """Raised when a required ML model artifact cannot be found on disk."""

    status_code = HTTPStatus.SERVICE_UNAVAILABLE.value
    error_code = "MODEL_NOT_FOUND"
    message = "Required ML model artifact not found."


class ProcessingError(MLServiceError):
    """Raised for general ML pipeline processing failures."""

    status_code = HTTPStatus.INTERNAL_SERVER_ERROR.value
    error_code = "PROCESSING_ERROR"
    message = "An error occurred during ML processing."
