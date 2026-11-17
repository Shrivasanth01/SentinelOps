import logging
from typing import Dict, Any, List
import numpy as np
from app.ml.models.isolation_forest import IsolationForestModel

logger = logging.getLogger("sentinelops.ml.training.evaluator")


class ModelEvaluator:
    """
    Unsupervised evaluation suite for Isolation Forest models.
    Analyzes score distribution characteristics, outlier separation, and stability.
    Explicitly refuses to invent fabricated accuracy/precision/recall metrics.
    """

    @staticmethod
    def evaluate_holdout(
        model: IsolationForestModel,
        X_holdout: np.ndarray,
    ) -> Dict[str, Any]:
        """
        Evaluates model on holdout chronological data.
        Returns quantiles, empirical outlier fraction, and stability indicators.
        """
        if len(X_holdout) == 0:
            return {
                "evaluation_samples": 0,
                "status": "SKIPPED_EMPTY_HOLDOUT",
                "message": "Holdout dataset was empty.",
            }

        raw_scores, norm_scores, is_anomaly = model.score_samples(X_holdout)

        outlier_count = int(np.sum(is_anomaly))
        anomaly_rate = float(outlier_count / len(X_holdout))

        score_quantiles = {
            "p01": round(float(np.percentile(norm_scores, 1)), 4),
            "p05": round(float(np.percentile(norm_scores, 5)), 4),
            "p25": round(float(np.percentile(norm_scores, 25)), 4),
            "p50": round(float(np.percentile(norm_scores, 50)), 4),
            "p75": round(float(np.percentile(norm_scores, 75)), 4),
            "p95": round(float(np.percentile(norm_scores, 95)), 4),
        }

        score_mean = round(float(np.mean(norm_scores)), 4)
        score_std = round(float(np.std(norm_scores)), 4)

        # Check stability: std should be non-zero and mean should not be pinned to 0 or 1
        is_stable = (score_std >= 0.01) and (0.05 <= score_mean <= 0.85)
        stability_assessment = "STABLE" if is_stable else "DEGENERATE_LOW_VARIANCE"

        return {
            "evaluation_samples": len(X_holdout),
            "anomalous_samples": outlier_count,
            "anomaly_rate": round(anomaly_rate, 4),
            "target_contamination": model.contamination,
            "score_mean": score_mean,
            "score_std": score_std,
            "score_quantiles": score_quantiles,
            "stability_assessment": stability_assessment,
            "is_valid": is_stable,
            "limitations": (
                "Unsupervised holdout assessment: without ground truth incident labels, "
                "classification accuracy, precision, and recall cannot be reliably computed. "
                "Evaluation reflects decision score separation and statistical normality."
            ),
        }
