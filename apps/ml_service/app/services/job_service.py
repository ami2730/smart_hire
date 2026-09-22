"""
Job Requirement Analysis Service.

Analyzes job descriptions and required skills:
- Normalizes job text with the same preprocessing pipeline as resumes
- Resolves required skills to canonical names using controlled dictionary & aliases
- Extracts education requirements
- Formats experience constraints into structured profile
"""

from __future__ import annotations

from typing import Any

from app.core.exceptions import InvalidJobDataError
from app.core.logging import get_logger
from app.nlp.entity_extractor import EntityExtractor
from app.schemas.job import JobAnalysisRequest, JobProfile
from app.services.gemini_service import GeminiService
from app.services.preprocessing_service import PreprocessingService
from app.services.skill_service import SkillService

logger = get_logger(__name__)


class JobService:
    """Service for parsing and analyzing job requirements."""

    def __init__(
        self,
        preprocessing_service: PreprocessingService | None = None,
        skill_service: SkillService | None = None,
        entity_extractor: EntityExtractor | None = None,
        gemini_service: GeminiService | None = None,
    ) -> None:
        self.gemini_service = gemini_service or GeminiService()
        self.preprocessing_service = preprocessing_service or PreprocessingService(gemini_service=self.gemini_service)
        self.skill_service = skill_service or SkillService(gemini_service=self.gemini_service)
        self.entity_extractor = entity_extractor or EntityExtractor(gemini_service=self.gemini_service)

    def analyze_job(self, request: JobAnalysisRequest) -> JobProfile:
        """Analyze job posting inputs and generate a normalized JobProfile.

        Args:
            request: JobAnalysisRequest containing job_title, description,
                     required_skills, education, and minimum_experience_years.

        Returns:
            JobProfile containing canonical skills, education, experience requirements,
            and normalized processed_text.

        Raises:
            InvalidJobDataError: If essential job data is missing or invalid.
        """
        if not request.job_title or not request.job_title.strip():
            raise InvalidJobDataError("Job title must be provided and cannot be empty.")

        if not request.description or not request.description.strip():
            raise InvalidJobDataError("Job description must be provided and cannot be empty.")

        # 1. Canonicalize explicit skills and discover additional skills from description
        all_skills: set[str] = set()

        # Resolve explicit skills and aliases using Gemini
        if self.gemini_service.is_enabled and request.required_skills:
            resolved_explicit = self.gemini_service.resolve_skill_aliases(request.required_skills)
            if resolved_explicit is not None:
                all_skills.update(resolved_explicit)
            else:
                for raw_skill in request.required_skills:
                    if raw_skill and raw_skill.strip():
                        resolved = self.skill_service.extract_skills(raw_skill)
                        if resolved:
                            all_skills.update(resolved)
                        else:
                            all_skills.add(raw_skill.strip())
        else:
            for raw_skill in request.required_skills:
                if raw_skill and raw_skill.strip():
                    resolved = self.skill_service.extract_skills(raw_skill)
                    if resolved:
                        all_skills.update(resolved)
                    else:
                        all_skills.add(raw_skill.strip())

        # Also extract skills mentioned in description and title using Gemini
        context_skills = self.skill_service.extract_skills(
            f"{request.job_title} {request.description}"
        )
        all_skills.update(context_skills)

        # 2. Education requirements
        education_list = [e.strip() for e in request.education if e and e.strip()]
        if not education_list:
            # Attempt to extract educational degrees from description
            extracted_edu = self.entity_extractor.extract_education(request.description)
            education_list.extend(extracted_edu)

        # 3. Experience requirements
        min_years = float(request.minimum_experience_years) if request.minimum_experience_years >= 0 else 0.0
        experience_requirements: dict[str, Any] = {
            "minimum_years": min_years,
        }

        # 4. Text preprocessing: normalize using the EXACT same pipeline as resumes
        raw_combined = f"{request.job_title}\n{request.description}\n" + " ".join(all_skills)
        processed_text = self.preprocessing_service.preprocess_text(raw_combined)

        logger.info(
            "Analyzed job requirements | title=%s | skills_count=%d | min_years=%.1f",
            request.job_title,
            len(all_skills),
            min_years,
        )

        return JobProfile(
            job_title=request.job_title,
            skills=sorted(all_skills),
            education=education_list,
            experience_requirements=experience_requirements,
            processed_text=processed_text,
        )
