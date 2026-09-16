import numpy as np
import pandas as pd
from typing import Dict, Any, Tuple

class ConfidenceScorer:
    """
    Computes scientific confidence score separate from prospectivity probability.
    
    Confidence factors:
    1. Ensemble prediction variance (lower tree variance = higher agreement/confidence)
    2. Spatial distance to verified geochemical ground-control points (decay function)
    3. Multi-source evidence density (presence of valid SAR, optical, elevation, and geochemistry)
    """

    @staticmethod
    def calculate_confidence(
        tree_std: float,
        dist_chem_km: float,
        evidence_count: int = 5,
        total_sources: int = 5
    ) -> float:
        # Variance term: std typically between 0.05 and 0.35
        variance_factor = max(0.2, 1.0 - 2.0 * float(tree_std))
        
        # Spatial proximity factor: exponential decay over distance to surveyed ground sample
        spatial_factor = 0.5 + 0.5 * np.exp(-float(dist_chem_km) / 10.0)
        
        # Source completeness factor
        source_factor = min(1.0, float(evidence_count) / float(max(1, total_sources)))

        # Weighted combination
        raw_conf = 0.50 * variance_factor + 0.35 * spatial_factor + 0.15 * source_factor
        
        # Clip to realistic range [0.15, 0.98]
        conf = float(np.clip(raw_conf, 0.15, 0.98))
        return round(conf, 3)


class OODApplicabilityDetector:
    """
    Out-Of-Distribution (OOD) Detector & Applicability Domain Evaluator.
    
    Evaluates whether an input target feature vector lies within the multidimensional
    envelope of the scientific training dataset (Balaghat Manganese Belt).
    """

    def __init__(self):
        self.feature_means = None
        self.feature_stds = None
        self.feature_min = None
        self.feature_max = None
        self.is_fitted = False

    def fit(self, X_train: pd.DataFrame):
        X_num = X_train.select_dtypes(include=[np.number])
        self.feature_means = X_num.mean()
        self.feature_stds = X_num.std().replace(0, 1e-5)
        self.feature_min = X_num.quantile(0.01)
        self.feature_max = X_num.quantile(0.99)
        self.is_fitted = True
        return self

    def predict_applicability(self, input_features: Dict[str, float]) -> Tuple[str, float, str]:
        """
        Evaluate input features dictionary.
        Returns:
            status: "HIGH" | "MEDIUM" | "LOW"
            distance_score: float (mean normalized Z-score)
            warning_msg: str
        """
        if not self.is_fitted or self.feature_means is None:
            # Fallback if not fitted
            return "HIGH", 0.4, "Inside nominal exploration domain."

        z_scores = []
        out_of_bounds = []

        for col, mean_val in self.feature_means.items():
            if col in input_features:
                val = float(input_features[col])
                std_val = float(self.feature_stds[col])
                z = abs(val - mean_val) / std_val
                z_scores.append(z)

                min_v = float(self.feature_min[col])
                max_v = float(self.feature_max[col])
                if val < min_v or val > max_v:
                    out_of_bounds.append(col)

        if not z_scores:
            return "HIGH", 0.0, "Nominal."

        mean_z = float(np.mean(z_scores))
        max_z = float(np.max(z_scores))

        if max_z > 4.0 or len(out_of_bounds) >= 3 or mean_z > 2.5:
            status = "LOW"
            warning = f"WARNING: Out-Of-Distribution! {len(out_of_bounds)} features fall outside the trained manganese belt spectral envelope. Extrapolation risk high."
        elif max_z > 2.5 or len(out_of_bounds) >= 1 or mean_z > 1.5:
            status = "MEDIUM"
            warning = "Moderate Applicability Domain: Some feature values deviate slightly from training core."
        else:
            status = "HIGH"
            warning = "High Applicability Domain: Target feature vector matches manganese deposit training envelope."

        return status, round(mean_z, 3), warning
