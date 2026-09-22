"""
Resume Schemas — Request and response data structures for resume processing.
"""

from __future__ import annotations

from typing import Literal
from pydantic import BaseModel, Field


class DocumentExtractionResponse(BaseModel):
    """Response payload for document text extraction."""

    success: bool = Field(True, description="Indicates whether extraction succeeded.")
    document_type: Literal["pdf", "docx"] = Field(
        ..., description="Format of the uploaded document ('pdf' or 'docx')."
    )
    text: str = Field(..., description="Normalized extracted plain text.")
    page_count: int | None = Field(
        None,
        description="Number of pages if determined (reliable for PDF, may be null for DOCX).",
    )

    model_config = {
        "json_schema_extra": {
            "example": {
                "success": True,
                "document_type": "pdf",
                "text": "Jane Doe\nSenior Software Engineer with 5 years experience in Python and PostgreSQL.",
                "page_count": 2,
            }
        }
    }
