"""
Candidate Profile Service.

Combines document extraction, text preprocessing, section parsing,
skill extraction, and NLP entity extraction to produce explainable
candidate profiles.
"""

from __future__ import annotations

from app.nlp.entity_extractor import EntityExtractor
from app.nlp.section_parser import SectionParser
from app.schemas.candidate import CandidateProfile
from app.services.document_service import DocumentService
from app.services.gemini_service import GeminiService
from app.services.preprocessing_service import PreprocessingService
from app.services.skill_service import SkillService


class CandidateService:
    """Service for analyzing resumes and generating structured candidate profiles."""

    def __init__(
        self,
        document_service: DocumentService | None = None,
        preprocessing_service: PreprocessingService | None = None,
        section_parser: SectionParser | None = None,
        skill_service: SkillService | None = None,
        entity_extractor: EntityExtractor | None = None,
        gemini_service: GeminiService | None = None,
    ) -> None:
        self.gemini_service = gemini_service or GeminiService()
        self.document_service = document_service or DocumentService()
        self.preprocessing_service = preprocessing_service or PreprocessingService(gemini_service=self.gemini_service)
        self.section_parser = section_parser or SectionParser(gemini_service=self.gemini_service)
        self.skill_service = skill_service or SkillService(gemini_service=self.gemini_service)
        self.entity_extractor = entity_extractor or EntityExtractor(gemini_service=self.gemini_service)

    def _extract_profile_data(
        self, raw_text: str
    ) -> tuple[list[str], list[str], list[str], list[str], dict[str, str | None]]:
        """Extract skills, education, experience, job titles, and sections.
        
        Uses Gemini LLM for all NLP extraction when enabled.
        Falls back seamlessly to local regex/NLP components if Gemini is disabled
        or returns None.
        """
        if self.gemini_service.is_enabled:
            gemini_data = self.gemini_service.extract_candidate_data(raw_text)
            if gemini_data:
                # Resolve skill aliases using Gemini
                raw_skills = [str(s).strip() for s in gemini_data.get("skills", []) if str(s).strip()]
                resolved_skills = self.gemini_service.resolve_skill_aliases(raw_skills)
                if resolved_skills:
                    all_skills = set(self.skill_service.resolve_canonical(s) or s for s in resolved_skills)
                else:
                    all_skills = set(self.skill_service.resolve_aliases(raw_skills))

                education = [str(e) for e in gemini_data.get("education", []) if e]
                experience = [str(x) for x in gemini_data.get("experience", []) if x]
                job_titles = [str(j) for j in gemini_data.get("job_titles", []) if j]
                raw_sections = gemini_data.get("sections", {})
                sections = {str(k): (str(v) if v is not None else None) for k, v in raw_sections.items()}

                return sorted(all_skills), education, experience, job_titles, sections

        # Deterministic local NLP pipeline
        sections = self.section_parser.parse(raw_text)
        skills = self.skill_service.extract_skills(raw_text)
        job_titles = self.entity_extractor.extract_job_titles(raw_text, sections)
        education = self.entity_extractor.extract_education(raw_text, sections)
        experience = self.entity_extractor.extract_experience(raw_text, sections)
        return skills, education, experience, job_titles, sections

    def analyze_resume_bytes(
        self,
        content: bytes,
        filename: str,
        content_type: str | None = None,
    ) -> CandidateProfile:
        """Process a resume file into a full structured CandidateProfile."""
        doc_result = self.document_service.extract_from_bytes(
            content=content,
            filename=filename,
            content_type=content_type,
        )
        raw_text = doc_result.text
        processed_text = self.preprocessing_service.preprocess_text(raw_text)

        skills, education, experience, job_titles, sections = self._extract_profile_data(raw_text)

        return CandidateProfile(
            skills=skills,
            education=education,
            experience=experience,
            job_titles=job_titles,
            sections=sections,
            raw_text=raw_text,
            processed_text=processed_text,
        )

    def analyze_resume_text(self, text: str) -> CandidateProfile:
        """Generate a CandidateProfile directly from plain text."""
        raw_text = text.strip()
        processed_text = self.preprocessing_service.preprocess_text(raw_text)

        skills, education, experience, job_titles, sections = self._extract_profile_data(raw_text)

        return CandidateProfile(
            skills=skills,
            education=education,
            experience=experience,
            job_titles=job_titles,
            sections=sections,
            raw_text=raw_text,
            processed_text=processed_text,
        )

