"""
Skill Extraction Service.

Extracts technical skills from text using a controlled dictionary (skills.json)
and an alias mapping table (skill_aliases.json) with strict boundary matching
to eliminate false positives.
"""

from __future__ import annotations

import json
import os
import re
from pathlib import Path
from typing import Any

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class SkillService:
    """Service for extracting canonical skills and resolving aliases."""

    def __init__(
        self,
        skills_file: str | None = None,
        aliases_file: str | None = None,
        gemini_service: Any = None,
    ) -> None:
        settings = get_settings()
        self._skills_path = Path(skills_file or settings.skills_file)
        self._aliases_path = Path(aliases_file or settings.skill_aliases_file)

        if gemini_service is None:
            try:
                from app.services.gemini_service import GeminiService
                self.gemini_service: Any = GeminiService()
            except Exception:
                self.gemini_service = None
        else:
            self.gemini_service = gemini_service

        self._canonical_skills: set[str] = set()
        self._alias_to_canonical: dict[str, str] = {}
        self._compiled_patterns: list[tuple[re.Pattern[str], str]] = []

        self._load_dictionaries()
        self._build_matchers()

    def _load_dictionaries(self) -> None:
        """Load skills and alias mapping files from disk."""
        # 1. Load canonical skills
        if self._skills_path.exists():
            try:
                with open(self._skills_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    skills_list = data.get("skills", [])
                    self._canonical_skills = set(skills_list)
                logger.info("Loaded %d canonical skills from %s", len(self._canonical_skills), self._skills_path)
            except Exception as exc:
                logger.error("Failed to load skills file %s: %s", self._skills_path, exc)
        else:
            logger.warning("Skills file not found at %s. Using default fallback skills.", self._skills_path)
            self._canonical_skills = {
                "Python", "Java", "JavaScript", "TypeScript", "React", "Next.js",
                "Node.js", "Django", "FastAPI", "PostgreSQL", "MySQL", "Docker",
                "Machine Learning", "TensorFlow", "scikit-learn", "REST API", "Git", "Linux"
            }

        # 2. Load aliases
        if self._aliases_path.exists():
            try:
                with open(self._aliases_path, "r", encoding="utf-8") as f:
                    self._alias_to_canonical = json.load(f)
                logger.info("Loaded %d skill aliases from %s", len(self._alias_to_canonical), self._aliases_path)
            except Exception as exc:
                logger.error("Failed to load alias file %s: %s", self._aliases_path, exc)
        else:
            logger.warning("Skill aliases file not found at %s.", self._aliases_path)
            self._alias_to_canonical = {}

    def _build_matchers(self) -> None:
        """Compile regex matchers for skills and aliases, prioritizing longer phrases."""
        # Map: search_term (lowercase) -> canonical_name
        terms_map: dict[str, str] = {}

        # Add all canonical skills
        for skill in self._canonical_skills:
            terms_map[skill.lower()] = skill

        # Add all aliases (mapping to canonical name)
        for alias, canonical in self._alias_to_canonical.items():
            terms_map[alias.lower()] = canonical

        # Sort by length descending to match multi-word phrases before individual words
        # (e.g. "machine learning" before "learning", "react native" before "react")
        sorted_terms = sorted(terms_map.keys(), key=len, reverse=True)

        self._compiled_patterns = []
        for term in sorted_terms:
            canonical = terms_map[term]
            escaped = re.escape(term)

            # Terms with non-word symbols like C++, C#, .NET, Node.js, CI/CD
            if any(ch in term for ch in ("+", "#", ".", "/", "-")):
                pattern = re.compile(rf"(?:(?<=[^\w])|^){escaped}(?:(?=[^\w])|$)", flags=re.IGNORECASE)
            elif term in {"c", "r"}:
                # Single-letter programming languages: strict word boundary with context awareness
                pattern = re.compile(rf"\b{escaped}\b(?!\s*[\w\.\-])", flags=0)  # Case sensitive for C and R
            else:
                # Standard alphanumeric word(s)
                pattern = re.compile(rf"\b{escaped}\b", flags=re.IGNORECASE)

            self._compiled_patterns.append((pattern, canonical))

    def get_canonical_skills(self) -> list[str]:
        """Return the sorted list of all supported canonical skills."""
        return sorted(self._canonical_skills)

    def resolve_canonical(self, term: str) -> str | None:
        """Resolve a single skill name or alias to its canonical form using Gemini or dictionary."""
        if not term or not term.strip():
            return None

        term_clean = term.strip()
        term_lower = term_clean.lower()

        for c in self._canonical_skills:
            if c.lower() == term_lower:
                return c

        if term_lower in self._alias_to_canonical:
            return self._alias_to_canonical[term_lower]

        # Use Gemini for unseen alias resolution when enabled
        if self.gemini_service and getattr(self.gemini_service, "is_enabled", False):
            gemini_resolved = self.gemini_service.resolve_skill_alias(term)
            if gemini_resolved:
                for c in self._canonical_skills:
                    if c.lower() == gemini_resolved.lower():
                        return c
                return gemini_resolved

        for pattern, canonical in self._compiled_patterns:
            if pattern.search(term_clean):
                return canonical

        return None

    def resolve_aliases(self, skills: list[str]) -> list[str]:
        """Resolve a list of skills and skill aliases to their canonical forms using Gemini."""
        if not skills:
            return []

        if self.gemini_service and getattr(self.gemini_service, "is_enabled", False):
            gemini_resolved = self.gemini_service.resolve_skill_aliases(skills)
            if gemini_resolved:
                return [self.resolve_canonical(s) or s for s in gemini_resolved]

        resolved: list[str] = []
        for s in skills:
            canon = self.resolve_canonical(s)
            resolved.append(canon if canon else s)
        return resolved

    def extract_skills_with_gemini(self, text: str) -> list[str]:
        """Extract skills using Gemini NLP and resolve against canonical dictionary."""
        return self.extract_skills(text)

    def extract_skills(self, text: str) -> list[str]:
        """Extract all skills from input text and resolve aliases to canonical names.

        Uses Gemini when enabled for both extraction and alias resolution.
        Falls back to compiled dictionary patterns when Gemini is disabled.
        """
        if not text:
            return []

        # Use Gemini exclusively for skill extraction and alias resolution when enabled
        if self.gemini_service and getattr(self.gemini_service, "is_enabled", False):
            gemini_skills = self.gemini_service.extract_skills(text)
            if gemini_skills is not None:
                resolved = self.gemini_service.resolve_skill_aliases(gemini_skills)
                final_skills = resolved if resolved else gemini_skills
                results = set()
                for s in final_skills:
                    canon = self.resolve_canonical(s)
                    results.add(canon if canon else s)
                return sorted(results)

        found_skills: set[str] = set()

        for pattern, canonical in self._compiled_patterns:
            if pattern.search(text):
                found_skills.add(canonical)

        return sorted(found_skills)



# Global singleton
_default_skill_service = SkillService()


def extract_skills(text: str) -> list[str]:
    """Module-level convenience function for skill extraction."""
    return _default_skill_service.extract_skills(text)

