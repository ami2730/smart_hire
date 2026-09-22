"""
Candidate Ranking Engine.

Performs deterministic ranking of candidates based on multi-criteria scores.
"""

from __future__ import annotations

from typing import Any


def rank_candidates(
    candidates_scores: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Rank candidates deterministically by final score descending.

    Tie-breaking rule:
      1. Primary: final score descending
      2. Secondary: skill_match score descending
      3. Tertiary (stable): candidate_id ascending

    Args:
        candidates_scores: List of dicts containing 'candidate_id', 'score',
                           and optional 'skill_score'.

    Returns:
        List of dicts sorted descending by score with assigned 1-based 'rank'.
    """
    if not candidates_scores:
        return []

    # Sort deterministically
    sorted_candidates = sorted(
        candidates_scores,
        key=lambda x: (
            -float(x.get("score", 0.0)),
            -float(x.get("skill_score", 0.0)),
            str(x.get("candidate_id", "")),
        ),
    )

    ranked_results: list[dict[str, Any]] = []
    for index, item in enumerate(sorted_candidates, start=1):
        ranked_item = dict(item)
        ranked_item["rank"] = index
        ranked_results.append(ranked_item)

    return ranked_results
