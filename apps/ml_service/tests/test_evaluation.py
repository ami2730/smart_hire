"""
Tests for Model Evaluation Script Metrics — Phase 10.

Verifies calculation of:
- Precision, Recall, F1-Score, Accuracy
- Precision@K and Recall@K
- Spearman's Rank Correlation and Kendall's Tau
- End-to-end evaluate_dataset routine
"""

from __future__ import annotations

import pytest

from scripts.evaluate_model import (
    DEFAULT_EVALUATION_DATASET,
    calculate_binary_classification_metrics,
    calculate_kendall_tau,
    calculate_precision_at_k,
    calculate_recall_at_k,
    calculate_spearman_correlation,
    evaluate_dataset,
)


class TestEvaluationMetrics:
    """Unit tests for statistical evaluation metrics."""

    def test_classification_metrics_perfect_scores(self) -> None:
        y_true = [1, 1, 0, 0]
        y_pred = [1, 1, 0, 0]
        metrics = calculate_binary_classification_metrics(y_true, y_pred)
        assert metrics["accuracy"] == 1.0
        assert metrics["precision"] == 1.0
        assert metrics["recall"] == 1.0
        assert metrics["f1_score"] == 1.0
        assert metrics["true_positives"] == 2
        assert metrics["true_negatives"] == 2

    def test_classification_metrics_partial_scores(self) -> None:
        y_true = [1, 0, 1, 0]
        y_pred = [1, 1, 0, 0]  # 1 TP, 1 FP, 1 FN, 1 TN
        metrics = calculate_binary_classification_metrics(y_true, y_pred)
        assert metrics["accuracy"] == 0.5
        assert metrics["precision"] == 0.5
        assert metrics["recall"] == 0.5
        assert metrics["f1_score"] == 0.5

    def test_precision_and_recall_at_k(self) -> None:
        # 3 relevant items in dataset: positions 0, 1, 3 (ranked)
        ranked_labels = [1, 1, 0, 1, 0]

        # Top 2 has 2 relevant items: P@2 = 2/2 = 1.0
        assert calculate_precision_at_k(ranked_labels, k=2) == 1.0
        # R@2 = 2/3 = 0.6667
        assert calculate_recall_at_k(ranked_labels, k=2) == pytest.approx(0.6667, 0.001)

        # Top 3 has 2 relevant items: P@3 = 2/3 = 0.6667
        assert calculate_precision_at_k(ranked_labels, k=3) == pytest.approx(0.6667, 0.001)

    def test_spearman_and_kendall_correlations(self) -> None:
        # Perfectly aligned rankings
        x = [10.0, 20.0, 30.0, 40.0]
        y = [1.0, 2.0, 3.0, 4.0]
        assert calculate_spearman_correlation(x, y) == 1.0
        assert calculate_kendall_tau(x, y) == 1.0

        # Inverted rankings
        y_rev = [4.0, 3.0, 2.0, 1.0]
        assert calculate_spearman_correlation(x, y_rev) == -1.0
        assert calculate_kendall_tau(x, y_rev) == -1.0


class TestEvaluationPipeline:
    """Integration test for evaluate_dataset."""

    def test_evaluate_benchmark_dataset(self) -> None:
        report = evaluate_dataset(DEFAULT_EVALUATION_DATASET, k=2)

        assert report["total_jobs_evaluated"] == 2
        assert report["total_candidates_evaluated"] == 7
        assert "classification_metrics" in report
        assert "ranking_metrics" in report
        assert "cosine_similarity_distribution" in report

        # Validate that ranking correlation is strongly positive
        assert report["ranking_metrics"]["mean_spearman_rho"] > 0.7
        assert report["ranking_metrics"]["precision_at_2"] > 0.5
