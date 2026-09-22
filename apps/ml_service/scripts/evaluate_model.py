"""
SmartHire ML Model Evaluation Script.

Evaluates candidate screening, scoring, and ranking accuracy against
manually labeled datasets.

Metrics:
- Precision, Recall, F1-Score, Accuracy
- Cosine Similarity distribution (mean, min, max, std)
- Precision@K and Recall@K (ranking metrics)
- Ranking Correlation (Spearman's rank correlation rho and Kendall's tau)

Usage:
    python scripts/evaluate_model.py
    python scripts/evaluate_model.py --data path/to/dataset.csv --k 3
"""

from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path
from typing import Any

import numpy as np

# Ensure project root is on sys.path
ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

from app.ml.ranking import rank_candidates
from app.schemas.job import JobAnalysisRequest
from app.services.job_service import JobService
from app.services.preprocessing_service import PreprocessingService
from app.services.scoring_service import ScoringService
from app.services.similarity_service import SimilarityService
from app.services.skill_service import SkillService


# ---------------------------------------------------------------------------
# Standard Benchmark Evaluation Dataset (when no external CSV is passed)
# ---------------------------------------------------------------------------

DEFAULT_EVALUATION_DATASET: list[dict[str, Any]] = [
    # Job 1: Senior Backend Engineer (Python, PostgreSQL, Docker, AWS, 4+ yrs)
    {
        "job_id": "job_eval_1",
        "job_title": "Senior Backend Software Engineer",
        "job_description": "We are seeking a Senior Backend Engineer with deep knowledge of Python, PostgreSQL, REST APIs, Docker, and AWS. Minimum 4 years of experience.",
        "required_skills": ["Python", "PostgreSQL", "REST API", "Docker", "AWS"],
        "minimum_experience_years": 4.0,
        "education": ["Bachelor in Computer Science"],
        "candidates": [
            {
                "candidate_id": "cand_1A",
                "resume_text": "Senior Backend Developer with 6 years experience specializing in Python, PostgreSQL, Docker, AWS, and REST API microservices.",
                "skills": ["Python", "PostgreSQL", "Docker", "AWS", "REST API"],
                "experience": ["Senior Developer at TechGlobal (6 years)"],
                "education": ["B.S. in Computer Science"],
                "human_rating": 1,  # Highly Relevant
                "human_score": 95.0,
            },
            {
                "candidate_id": "cand_1B",
                "resume_text": "Backend developer with 4 years experience in Python, Django, PostgreSQL. Built APIs and databases.",
                "skills": ["Python", "Django", "PostgreSQL", "REST API"],
                "experience": ["Backend Engineer at StartupHub (4 years)"],
                "education": ["B.S. in Software Engineering"],
                "human_rating": 1,  # Relevant
                "human_score": 85.0,
            },
            {
                "candidate_id": "cand_1C",
                "resume_text": "Full Stack developer with 2 years experience in React, JavaScript, Node.js, and some basic Python scripting.",
                "skills": ["React", "JavaScript", "Node.js", "Python"],
                "experience": ["Junior Developer (2 years)"],
                "education": ["Bachelor degree"],
                "human_rating": 0,  # Not fully relevant (junior, missing core stack)
                "human_score": 50.0,
            },
            {
                "candidate_id": "cand_1D",
                "resume_text": "Graphic Designer and Marketing Specialist with expertise in Photoshop, Illustrator, HTML, and social media campaigns.",
                "skills": ["HTML", "CSS"],
                "experience": ["Creative Designer (3 years)"],
                "education": ["B.A. in Graphic Design"],
                "human_rating": 0,  # Irrelevant
                "human_score": 15.0,
            },
        ],
    },
    # Job 2: Machine Learning Engineer (Python, scikit-learn, TensorFlow, PyTorch, 3+ yrs)
    {
        "job_id": "job_eval_2",
        "job_title": "Machine Learning Engineer",
        "job_description": "Looking for an ML Engineer to design NLP and predictive modeling pipelines with Python, scikit-learn, and TensorFlow. 3 years experience required.",
        "required_skills": ["Machine Learning", "Python", "scikit-learn", "TensorFlow"],
        "minimum_experience_years": 3.0,
        "education": ["Master in Computer Science or Data Science"],
        "candidates": [
            {
                "candidate_id": "cand_2A",
                "resume_text": "Machine Learning Engineer with 4 years experience building NLP models using Python, scikit-learn, TensorFlow, and pandas.",
                "skills": ["Machine Learning", "Python", "scikit-learn", "TensorFlow", "pandas"],
                "experience": ["ML Engineer (4 years)"],
                "education": ["M.S. in Data Science"],
                "human_rating": 1,
                "human_score": 96.0,
            },
            {
                "candidate_id": "cand_2B",
                "resume_text": "Data Analyst with 3 years experience using SQL, Excel, and basic Python data manipulation.",
                "skills": ["Python", "SQL", "pandas"],
                "experience": ["Data Analyst (3 years)"],
                "education": ["B.S. in Mathematics"],
                "human_rating": 0,
                "human_score": 55.0,
            },
            {
                "candidate_id": "cand_2C",
                "resume_text": "DevOps Cloud Engineer with Docker, Kubernetes, Linux, Terraform, and CI/CD automation experience.",
                "skills": ["Docker", "Kubernetes", "Linux", "CI/CD"],
                "experience": ["DevOps Lead (4 years)"],
                "education": ["B.S. in Information Systems"],
                "human_rating": 0,
                "human_score": 20.0,
            },
        ],
    },
]


# ---------------------------------------------------------------------------
# Metric Calculation Routines
# ---------------------------------------------------------------------------


def calculate_binary_classification_metrics(
    y_true: list[int], y_pred: list[int]
) -> dict[str, float]:
    """Calculate Precision, Recall, F1-Score, and Accuracy for binary relevance."""
    tp = sum(1 for yt, yp in zip(y_true, y_pred) if yt == 1 and yp == 1)
    fp = sum(1 for yt, yp in zip(y_true, y_pred) if yt == 0 and yp == 1)
    fn = sum(1 for yt, yp in zip(y_true, y_pred) if yt == 1 and yp == 0)
    tn = sum(1 for yt, yp in zip(y_true, y_pred) if yt == 0 and yp == 0)

    total = len(y_true)
    accuracy = (tp + tn) / total if total > 0 else 0.0
    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    f1 = (2 * precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0

    return {
        "accuracy": round(accuracy, 4),
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1_score": round(f1, 4),
        "true_positives": tp,
        "false_positives": fp,
        "true_negatives": tn,
        "false_negatives": fn,
    }


def calculate_precision_at_k(ranked_labels: list[int], k: int) -> float:
    """Calculate Precision@K: fraction of top-K ranked items that are relevant."""
    top_k = ranked_labels[:k]
    if not top_k:
        return 0.0
    return round(sum(top_k) / len(top_k), 4)


def calculate_recall_at_k(ranked_labels: list[int], k: int) -> float:
    """Calculate Recall@K: fraction of all relevant items captured in top-K."""
    total_relevant = sum(ranked_labels)
    if total_relevant == 0:
        return 1.0
    top_k = ranked_labels[:k]
    return round(sum(top_k) / total_relevant, 4)


def calculate_spearman_correlation(x: list[float], y: list[float]) -> float:
    """Calculate Spearman's rank correlation coefficient (rho)."""
    n = len(x)
    if n < 2:
        return 1.0

    def get_ranks(seq: list[float]) -> list[float]:
        sorted_indices = sorted(range(n), key=lambda i: seq[i])
        ranks = [0.0] * n
        for rank, idx in enumerate(sorted_indices, start=1):
            ranks[idx] = float(rank)
        return ranks

    rank_x = get_ranks(x)
    rank_y = get_ranks(y)

    d_squared = sum((rx - ry) ** 2 for rx, ry in zip(rank_x, rank_y))
    rho = 1.0 - (6.0 * d_squared) / (n * (n**2 - 1))
    return round(float(rho), 4)


def calculate_kendall_tau(x: list[float], y: list[float]) -> float:
    """Calculate Kendall's tau rank correlation coefficient."""
    n = len(x)
    if n < 2:
        return 1.0

    concordant = 0
    discordant = 0
    for i in range(n):
        for j in range(i + 1, n):
            dx = x[i] - x[j]
            dy = y[i] - y[j]
            product = dx * dy
            if product > 0:
                concordant += 1
            elif product < 0:
                discordant += 1

    total_pairs = (n * (n - 1)) / 2.0
    if total_pairs == 0:
        return 1.0
    tau = (concordant - discordant) / total_pairs
    return round(float(tau), 4)


# ---------------------------------------------------------------------------
# Evaluation Pipeline Runner
# ---------------------------------------------------------------------------


def evaluate_dataset(
    dataset: list[dict[str, Any]],
    k: int = 2,
    relevance_threshold: float = 70.0,
) -> dict[str, Any]:
    """Run full evaluation over the dataset and calculate all metrics."""
    job_service = JobService()
    scoring_service = ScoringService()
    similarity_service = SimilarityService()
    preprocessing_service = PreprocessingService()
    skill_service = SkillService()

    all_y_true: list[int] = []
    all_y_pred: list[int] = []
    all_similarities: list[float] = []

    p_at_k_scores: list[float] = []
    r_at_k_scores: list[float] = []
    spearman_scores: list[float] = []
    kendall_scores: list[float] = []

    detailed_results: list[dict[str, Any]] = []

    for job_entry in dataset:
        job_req = JobAnalysisRequest(
            job_title=job_entry["job_title"],
            description=job_entry.get("job_description", ""),
            required_skills=job_entry.get("required_skills", []),
            education=job_entry.get("education", []),
            minimum_experience_years=job_entry.get("minimum_experience_years", 0.0),
        )
        job_profile = job_service.analyze_job(job_req)

        candidates_scores: list[dict[str, Any]] = []

        for cand in job_entry["candidates"]:
            cand_skills = set(cand.get("skills", []))
            resume_text = cand.get("resume_text", "")
            if resume_text:
                cand_skills.update(skill_service.extract_skills(resume_text))

            processed_cand_text = (
                preprocessing_service.preprocess_text(resume_text)
                if resume_text
                else " ".join(cand_skills)
            )

            sim = similarity_service.calculate_similarity(
                candidate_text=processed_cand_text,
                job_text=job_profile.processed_text,
            )
            all_similarities.append(sim)

            score_res = scoring_service.score_candidate(
                candidate_skills=sorted(cand_skills),
                candidate_experience=cand.get("experience", []),
                candidate_education=cand.get("education", []),
                candidate_processed_text=processed_cand_text,
                job_skills=job_profile.skills,
                job_required_years=job_req.minimum_experience_years,
                job_education=job_req.education,
                job_processed_text=job_profile.processed_text,
                candidate_raw_text=resume_text,
                semantic_similarity=sim,
            )

            predicted_relevant = 1 if score_res.overall_score >= relevance_threshold else 0
            human_rating = int(cand.get("human_rating", 0))

            all_y_true.append(human_rating)
            all_y_pred.append(predicted_relevant)

            candidates_scores.append({
                "candidate_id": cand["candidate_id"],
                "score": score_res.overall_score,
                "skill_score": score_res.components.skill_match,
                "human_rating": human_rating,
                "human_score": float(cand.get("human_score", 0.0)),
            })

        # Rank candidates deterministically
        ranked = rank_candidates(candidates_scores)
        detailed_results.append({
            "job_id": job_entry.get("job_id"),
            "ranked_candidates": ranked,
        })

        # Calculate Ranking Metrics for this job
        ranked_labels = [c["human_rating"] for c in ranked]
        p_k = calculate_precision_at_k(ranked_labels, k=k)
        r_k = calculate_recall_at_k(ranked_labels, k=k)
        p_at_k_scores.append(p_k)
        r_at_k_scores.append(r_k)

        model_scores = [c["score"] for c in ranked]
        human_scores = [c["human_score"] for c in ranked]
        if len(model_scores) >= 2:
            spearman_scores.append(calculate_spearman_correlation(model_scores, human_scores))
            kendall_scores.append(calculate_kendall_tau(model_scores, human_scores))

    # Aggregate metrics
    clf_metrics = calculate_binary_classification_metrics(all_y_true, all_y_pred)

    sim_array = np.array(all_similarities) if all_similarities else np.array([0.0])
    sim_stats = {
        "mean": round(float(np.mean(sim_array)), 4),
        "std": round(float(np.std(sim_array)), 4),
        "min": round(float(np.min(sim_array)), 4),
        "max": round(float(np.max(sim_array)), 4),
    }

    report = {
        "total_jobs_evaluated": len(dataset),
        "total_candidates_evaluated": len(all_y_true),
        "k_value": k,
        "classification_metrics": clf_metrics,
        "ranking_metrics": {
            f"precision_at_{k}": round(float(np.mean(p_at_k_scores)), 4) if p_at_k_scores else 0.0,
            f"recall_at_{k}": round(float(np.mean(r_at_k_scores)), 4) if r_at_k_scores else 0.0,
            "mean_spearman_rho": round(float(np.mean(spearman_scores)), 4) if spearman_scores else 1.0,
            "mean_kendall_tau": round(float(np.mean(kendall_scores)), 4) if kendall_scores else 1.0,
        },
        "cosine_similarity_distribution": sim_stats,
        "detailed_job_results": detailed_results,
    }

    return report


def print_evaluation_report(report: dict[str, Any]) -> None:
    """Print a clean, professional summary of model evaluation."""
    clf = report["classification_metrics"]
    rank = report["ranking_metrics"]
    sim = report["cosine_similarity_distribution"]
    k = report["k_value"]

    print("\n" + "=" * 65)
    print("        SmartHire ML Service — Model Evaluation Report")
    print("=" * 65)
    print(f"Total Jobs Evaluated:       {report['total_jobs_evaluated']}")
    print(f"Total Candidates Evaluated: {report['total_candidates_evaluated']}")
    print("-" * 65)
    print("1. Classification Performance (Threshold >= 70.0):")
    print(f"   Accuracy:    {clf['accuracy'] * 100:.2f}%")
    print(f"   Precision:   {clf['precision'] * 100:.2f}%")
    print(f"   Recall:      {clf['recall'] * 100:.2f}%")
    print(f"   F1-Score:    {clf['f1_score'] * 100:.2f}%")
    print(f"   Confusion:   TP={clf['true_positives']} | FP={clf['false_positives']} | TN={clf['true_negatives']} | FN={clf['false_negatives']}")
    print("-" * 65)
    print(f"2. Ranking Metrics (Prioritized for Candidate Screening):")
    print(f"   Precision@{k}:              {rank[f'precision_at_{k}'] * 100:.2f}%")
    print(f"   Recall@{k}:                 {rank[f'recall_at_{k}'] * 100:.2f}%")
    print(f"   Spearman Rank Correlation: {rank['mean_spearman_rho']:.4f}")
    print(f"   Kendall's Tau Correlation: {rank['mean_kendall_tau']:.4f}")
    print("-" * 65)
    print("3. Cosine Similarity Distribution:")
    print(f"   Mean: {sim['mean']:.4f} | Std: {sim['std']:.4f} | Min: {sim['min']:.4f} | Max: {sim['max']:.4f}")
    print("=" * 65 + "\n")


def main() -> None:
    parser = argparse.ArgumentParser(description="Evaluate SmartHire ML Model against labeled data.")
    parser.add_argument("--data", type=str, default=None, help="Path to evaluation JSON/CSV file.")
    parser.add_argument("--k", type=int, default=2, help="K value for Precision@K and Recall@K.")
    parser.add_argument("--output", type=str, default=None, help="Path to write JSON evaluation results.")

    args = parser.parse_args()

    if args.data and Path(args.data).is_file():
        print(f"Loading external evaluation dataset from {args.data}...")
        with open(args.data, "r", encoding="utf-8") as f:
            dataset = json.load(f)
    else:
        print("Using standard SmartHire multi-domain benchmark dataset...")
        dataset = DEFAULT_EVALUATION_DATASET

    report = evaluate_dataset(dataset, k=args.k)
    print_evaluation_report(report)

    if args.output:
        out_path = Path(args.output)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(report, f, indent=2)
        print(f"Saved evaluation metrics to: {out_path}")


if __name__ == "__main__":
    main()
