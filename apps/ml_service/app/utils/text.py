"""
Text Utility Functions.

Provides helper routines for string cleaning, whitespace normalization,
and Unicode formatting.
"""

from __future__ import annotations

import re
import unicodedata


def clean_whitespace(text: str) -> str:
    """Normalize internal whitespaces, tabs, and duplicate empty lines while preserving structure."""
    if not text:
        return ""
    # Normalize unicode non-breaking spaces and zero-width spaces
    text = text.replace("\u00a0", " ").replace("\u200b", "")
    # Normalize Windows and Mac line endings
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    # Collapse multiple horizontal spaces/tabs into a single space
    text = re.sub(r"[ \t]+", " ", text)
    # Collapse more than 2 consecutive newlines into 2
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def normalize_unicode(text: str) -> str:
    """Normalize unicode characters using NFKC format."""
    if not text:
        return ""
    return unicodedata.normalize("NFKC", text)
