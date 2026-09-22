"""
Scoring Algorithms and Formulae.

Provides transparent, decoupled scoring models for:
- Explicit Skill Matching (Section 16)
- Experience Requirements Matching (Section 17)
- Education Matching (Section 18)
- Configurable Weighted Final Scoring (Section 20)
"""

from __future__ import annotations

import datetime
import re
from typing import Any

from app.schemas.matching import (
    EducationMatchResult,
    ExperienceMatchResult,
    ScoringComponents,
    SkillMatchResult,
)


def calculate_skill_match(
    candidate_skills: list[str],
    required_skills: list[str],
) -> SkillMatchResult:
    """Calculate explicit skill match percentage between candidate and job requirements.

    Args:
        candidate_skills: List of skills the candidate possesses.
        required_skills: List of required skills from the job description.

    Returns:
        SkillMatchResult with matched_skills, missing_skills, and score (0.0 to 100.0).
    """
    if not required_skills:
        # If no specific skills are required, candidate has 100% skill match
        return SkillMatchResult(
            matched_skills=candidate_skills,
            missing_skills=[],
            score=100.0,
        )

    # Case-insensitive normalization for matching
    cand_map = {s.lower(): s for s in candidate_skills}

    matched: list[str] = []
    missing: list[str] = []

    for req in required_skills:
        req_norm = req.lower()
        if req_norm in cand_map:
            # Prefer canonical or job representation
            matched.append(req)
        else:
            missing.append(req)

    total_required = len(required_skills)
    match_percentage = (len(matched) / total_required) * 100.0 if total_required > 0 else 100.0
    score = round(match_percentage, 2)

    return SkillMatchResult(
        matched_skills=matched,
        missing_skills=missing,
        score=score,
    )


def estimate_candidate_experience_years(
    experience_items: list[str],
    raw_text: str = "",
) -> float:
    """Estimate total candidate experience in years from experience items and resume text.

    Uses transparent heuristic:
    1. Looks for explicit statements like 'X years of experience' or 'X+ years'
    2. Looks for date ranges (e.g. '2019 - 2024', '2021 - Present')
    3. Defaults to 0.0 if no indicators are found.
    """
    text = " \n ".join(experience_items) + " \n " + raw_text

    # 1. Check for explicit duration mentions e.g. "5 years of experience", "4+ years"
    explicit_matches = re.findall(
        r"(\d+(?:\.\d+)?)\+?\s*(?:to\s*\d+\s*)?(?:years?|yrs?)(?:\s+of)?\s+experience",
        text,
        flags=re.IGNORECASE,
    )
    if explicit_matches:
        try:
            years_found = [float(m) for m in explicit_matches]
            return max(years_found)
        except ValueError:
            pass

    # 2. Check for date ranges e.g. "2018 - 2023" or "2020 - Present"
    current_year = datetime.date.today().year
    range_matches = re.findall(
        r"\b(19\d\d|20\d\d)\s*(?:-|–|—|to)\s*(19\d\d|20\d\d|present|current)\b",
        text,
        flags=re.IGNORECASE,
    )

    total_duration_years = 0.0
    for start_str, end_str in range_matches:
        try:
            start = int(start_str)
            end = current_year if end_str.lower() in ("present", "current") else int(end_str)
            duration = max(0, end - start)
            # Filter unreasonable ranges (e.g. typo dates > 40 years)
            if 0 <= duration <= 40:
                total_duration_years += duration
        except ValueError:
            continue

    if total_duration_years > 0:
        # Cap single career estimate at 35 years to prevent double counting overlapping positions
        return min(35.0, total_duration_years)

    return 0.0


def calculate_experience_match(
    candidate_years: float,
    required_years: float,
) -> ExperienceMatchResult:
    """Compare candidate experience against required experience years.

    Scoring Logic:
    - If required_years <= 0: score is 100.0, meets_requirement = True
    - If candidate_years >= required_years: score is 100.0, meets_requirement = True
    - If candidate_years < required_years:
        score = (candidate_years / required_years) * 100.0
        meets_requirement = False

    Args:
        candidate_years: Candidate's years of experience.
        required_years: Job's minimum required years.

    Returns:
        ExperienceMatchResult with required_years, candidate_years, score, and meets_requirement.
    """
    req = max(0.0, float(required_years))
    cand = max(0.0, float(candidate_years))

    if req <= 0.0:
        return ExperienceMatchResult(
            required_years=0.0,
            candidate_years=round(cand, 1),
            score=100.0,
            meets_requirement=True,
        )

    meets_requirement = cand >= req

    if meets_requirement:
        score = 100.0
    else:
        # Proportional partial credit
        score = round((cand / req) * 100.0, 2)
        score = max(0.0, min(100.0, score))

    return ExperienceMatchResult(
        required_years=round(req, 1),
        candidate_years=round(cand, 1),
        score=score,
        meets_requirement=meets_requirement,
    )


DOCTORATE_PATTERN = re.compile(
    r"\b(ph\.?d\.?|d\.?phil\.?|doctorate|doctoral|doctor\s+of\s+[a-zA-Z\s]+)\b",
    re.IGNORECASE,
)
MASTER_PATTERN = re.compile(
    r"\b(master(?:\s+of\s+[a-zA-Z\s]+)?|masters?|m\.?sc?\.?|msc\.?|m\.?s\.?|m\.?a\.?|mba|m\.?b\.?a\.?|m\.?tech\.?|m\.?eng\.?|m\.?e\.?|postgraduate|post-graduate|graduate\s+degree)\b",
    re.IGNORECASE,
)
BACHELOR_PATTERN = re.compile(
    r"\b(bachelor(?:\s+of\s+[a-zA-Z\s]+)?|bachelors?|b\.?sc?\.?|bsc\.?|b\.?s\.?|b\.?a\.?|b\.?tech\.?|b\.?eng\.?|b\.?e\.?|bca|b\.?c\.?a\.?|undergraduate|(?:university|college)\s+degree|(?:4-year|four-year)\s+degree|(?<!associate\s)degree\s+in)\b",
    re.IGNORECASE,
)
ASSOCIATE_PATTERN = re.compile(
    r"\b(associate(?:\s+degree|\s+of\s+[a-zA-Z\s]+)?|associates?|a\.?s\.?|a\.?a\.?|diploma|higher\s+diploma|advanced\s+diploma|certificate|certification)\b",
    re.IGNORECASE,
)

TIER_NAMES = {
    4: "Doctorate / Ph.D.",
    3: "Master's Degree",
    2: "Bachelor's Degree",
    1: "Associate / Diploma",
}

FIELDS_OF_STUDY = {
    "computer science": ["computer science", "cs", "computing", "computer studies", "informatics"],
    "software engineering": ["software engineering", "software development", "software systems", "swe", "se"],
    "information technology": ["information technology", "it", "infotech", "information systems", "mis", "is"],
    "computer engineering": ["computer engineering", "hardware engineering", "ce"],
    "data science": ["data science", "artificial intelligence", "machine learning", "data analytics", "ai", "ml"],
    "electrical engineering": ["electrical engineering", "electronics", "ee"],
    "cybersecurity": ["cybersecurity", "cyber security", "information security", "network security"],
    "mathematics": ["mathematics", "applied mathematics", "statistics", "math"],
}


def _get_education_tier(edu_list: list[str]) -> int:
    """Determine highest educational qualification tier from entries."""
    max_t = 0
    for edu in edu_list:
        clean = edu.lower()
        if DOCTORATE_PATTERN.search(clean):
            max_t = max(max_t, 4)
        elif MASTER_PATTERN.search(clean):
            max_t = max(max_t, 3)
        elif ASSOCIATE_PATTERN.search(clean) and not (
            BACHELOR_PATTERN.search(clean.replace("associate", ""))
            or MASTER_PATTERN.search(clean)
            or DOCTORATE_PATTERN.search(clean)
        ):
            max_t = max(max_t, 1)
        elif BACHELOR_PATTERN.search(clean):
            max_t = max(max_t, 2)
        elif ASSOCIATE_PATTERN.search(clean):
            max_t = max(max_t, 1)
    return max_t


def _extract_education_fields(edu_list: list[str]) -> set[str]:
    """Extract academic majors/fields of study."""
    joined = " ".join(edu_list).lower()
    matched = set()
    for canonical, synonyms in FIELDS_OF_STUDY.items():
        for syn in synonyms:
            if re.search(r"\b" + re.escape(syn) + r"\b", joined):
                matched.add(canonical)
                break
    return matched


def calculate_education_match(
    candidate_education: list[str],
    required_education: list[str],
) -> EducationMatchResult:
    """Compare candidate educational qualifications against job requirements.

    Evaluates degree level alignment (Ph.D. > Master's > Bachelor's > Associate)
    and field of study alignment (e.g. Computer Science, Software Engineering).

    Args:
        candidate_education: Extracted education entries for candidate.
        required_education: Required education criteria from job posting.

    Returns:
        EducationMatchResult with matched, score (0-100), and details.
    """
    cand_tier = _get_education_tier(candidate_education)

    if not required_education:
        # Job has no explicit education requirement
        if candidate_education:
            return EducationMatchResult(
                matched=True,
                score=100.0,
                details="No specific education required; candidate has documented education.",
            )
        return EducationMatchResult(
            matched=True,
            score=90.0,
            details="No specific education required.",
        )

    req_tier = _get_education_tier(required_education)

    # If required education does not specify a clear degree tier, check string overlap
    if req_tier == 0:
        req_text = " ".join(required_education).lower()
        cand_text = " ".join(candidate_education).lower()
        has_overlap = any(term in cand_text for term in req_text.split() if len(term) > 3)
        return EducationMatchResult(
            matched=has_overlap,
            score=90.0 if has_overlap else 70.0,
            details="General education requirement evaluated against candidate background.",
        )

    cand_fields = _extract_education_fields(candidate_education)
    req_fields = _extract_education_fields(required_education)
    matching_fields = cand_fields.intersection(req_fields)

    # Compare tiers
    if cand_tier >= req_tier:
        score = 100.0
        matched = True
        req_text = " ".join(required_education).lower()
        tech_fields = {
            "computer science",
            "software engineering",
            "information technology",
            "computer engineering",
            "data science",
            "cybersecurity",
        }
        if matching_fields:
            field_info = f" in matching field ({list(matching_fields)[0].title()})"
        elif cand_fields and (
            cand_fields.intersection(tech_fields)
            and (req_fields.intersection(tech_fields) or "related" in req_text)
        ):
            cand_field_name = list(cand_fields)[0].title()
            field_info = f" in related field ({cand_field_name})"
        elif cand_fields:
            cand_field_name = list(cand_fields)[0].title()
            field_info = f" in {cand_field_name}"
        else:
            field_info = ""
        details = (
            f"Candidate meets or exceeds the required educational degree level"
            f" ({TIER_NAMES.get(cand_tier, 'Degree')}){field_info}."
        )
    elif cand_tier == req_tier - 1:
        score = 75.0
        matched = False
        details = (
            f"Candidate has adjacent degree level ({TIER_NAMES.get(cand_tier, 'qualification')})"
            f" when {TIER_NAMES.get(req_tier, 'higher degree')} is required."
        )
    elif cand_tier > 0:
        score = 50.0
        matched = False
        details = "Candidate has degree below the requested requirement level."
    else:
        score = 30.0
        matched = False
        details = "Required degree not verified in candidate education history."

    return EducationMatchResult(
        matched=matched,
        score=score,
        details=details,
    )


def calculate_final_score(
    skill_score: float,
    experience_score: float,
    education_score: float,
    semantic_similarity: float,
    weights: dict[str, float] | None = None,
) -> tuple[float, ScoringComponents]:
    """Calculate normalized final composite screening score.

    Default Formula:
        Final Score =
          0.50 * skill_match
        + 0.25 * experience_match
        + 0.15 * education_match
        + 0.10 * semantic_similarity

    All component scores must be normalized to 0–100.
    If semantic_similarity is passed as [0.0, 1.0], it is normalized to [0.0, 100.0].

    Returns:
        Tuple of (rounded_final_score, ScoringComponents).
    """
    # Ensure semantic_similarity is on 0-100 scale
    norm_semantic = (
        semantic_similarity * 100.0 if 0.0 <= semantic_similarity <= 1.0 else semantic_similarity
    )
    norm_semantic = max(0.0, min(100.0, norm_semantic))

    norm_skill = max(0.0, min(100.0, float(skill_score)))
    norm_exp = max(0.0, min(100.0, float(experience_score)))
    norm_edu = max(0.0, min(100.0, float(education_score)))

    w_skill = weights.get("skill", 0.50) if weights else 0.50
    w_exp = weights.get("experience", 0.25) if weights else 0.25
    w_edu = weights.get("education", 0.15) if weights else 0.15
    w_sim = weights.get("semantic", 0.10) if weights else 0.10

    raw_final = (
        w_skill * norm_skill
        + w_exp * norm_exp
        + w_edu * norm_edu
        + w_sim * norm_semantic
    )

    final_score = round(max(0.0, min(100.0, raw_final)), 2)

    components = ScoringComponents(
        skill_match=round(norm_skill, 2),
        experience_match=round(norm_exp, 2),
        education_match=round(norm_edu, 2),
        semantic_similarity=round(norm_semantic, 2),
    )

    return final_score, components
