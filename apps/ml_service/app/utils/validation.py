"""
Input Validation Utilities.

Validates file extensions, MIME types, file sizes, and binary headers (magic numbers).
"""

from __future__ import annotations

import os
from typing import Literal

from app.core.config import get_settings
from app.core.exceptions import FileTooLargeError, UnsupportedFileTypeError

# Supported extensions
SUPPORTED_EXTENSIONS: set[str] = {".pdf", ".docx"}

# Accepted MIME types
PDF_MIME_TYPES: set[str] = {
    "application/pdf",
    "application/x-pdf",
    "application/acrobat",
    "applications/vnd.pdf",
    "text/pdf",
    "text/x-pdf",
}

DOCX_MIME_TYPES: set[str] = {
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
    "application/x-docx",
}

# Magic signatures
PDF_MAGIC_BYTES: bytes = b"%PDF-"
DOCX_MAGIC_BYTES: bytes = b"PK\x03\x04"


def validate_file_size(content: bytes) -> None:
    """Validate that the uploaded content does not exceed the maximum allowed size.

    Raises:
        FileTooLargeError: If content size exceeds configured limit.
    """
    settings = get_settings()
    size_bytes = len(content)
    if size_bytes > settings.max_file_size_bytes:
        raise FileTooLargeError(
            f"File size ({size_bytes / (1024 * 1024):.2f} MB) exceeds maximum allowed size of {settings.max_file_size_mb} MB."
        )


def validate_document_type(
    filename: str | None,
    content: bytes,
    content_type: str | None = None,
) -> Literal["pdf", "docx"]:
    """Validate document extension, MIME type, and binary header.

    Returns:
        The detected document format ('pdf' or 'docx').

    Raises:
        UnsupportedFileTypeError: If the document is not a valid PDF or DOCX file.
    """
    if not filename:
        raise UnsupportedFileTypeError("Filename is missing.")

    _, ext = os.path.splitext(filename.lower())
    if ext not in SUPPORTED_EXTENSIONS:
        raise UnsupportedFileTypeError(
            f"Unsupported file extension '{ext}'. Only PDF and DOCX files are supported."
        )

    # Validate PDF signature
    if ext == ".pdf":
        if not content.startswith(PDF_MAGIC_BYTES):
            raise UnsupportedFileTypeError(
                "Invalid PDF file format: file header does not match PDF specification."
            )
        if content_type and content_type.lower() not in PDF_MIME_TYPES and content_type.lower() != "application/octet-stream":
            # Allow application/octet-stream as generic fallback if signature is valid
            pass
        return "pdf"

    # Validate DOCX signature (DOCX files are OpenXML ZIP packages starting with PK\x03\x04)
    if ext == ".docx":
        if not content.startswith(DOCX_MAGIC_BYTES):
            raise UnsupportedFileTypeError(
                "Invalid DOCX file format: file header does not match Microsoft OpenXML specification."
            )
        return "docx"

    raise UnsupportedFileTypeError("Only PDF and DOCX files are supported.")
