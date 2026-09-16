import numpy as np
import pandas as pd
from typing import Dict, Any, Tuple

class ConstrainedEnergyMinimization:
    """
    Constrained Energy Minimization (CEM) Spectral Analysis for Target Detection.
    
    CEM designs an FIR filter 'w' that passes the desired target spectral signature 'd'
    (with unity response: w^T d = 1) while minimizing the total output energy of the
    background pixel spectra:
    
        w = (R^-1 * d) / (d^T * R^-1 * d)
        
    where R = (1/N) * X^T * X is the background spectral correlation/covariance matrix.
    Output abundance score for a pixel spectrum x is:
    
        y = w^T * x = (d^T * R^-1 * x) / (d^T * R^-1 * d)
    """

    def __init__(self, target_signature: np.ndarray = None, lambda_reg: float = 1e-4):
        self.lambda_reg = lambda_reg
        self.target_signature = target_signature
        self.w = None
        self.d = None
        self.R_inv = None

    def fit(self, X: np.ndarray, target_signature: np.ndarray = None):
        """
        Fit CEM filter weights w on background spectral array X (shape: N x P).
        """
        X = np.asarray(X, dtype=np.float64)
        N, P = X.shape

        if target_signature is not None:
            self.d = np.asarray(target_signature, dtype=np.float64)
        elif self.target_signature is not None:
            self.d = np.asarray(self.target_signature, dtype=np.float64)
        else:
            # Default manganese oxide spectral signature for Sentinel-2 bands [B02, B03, B04, B08, B11, B12]
            # Mn oxides (pyrolusite/psilomelane) show broad SWIR absorption and low overall reflectance compared to vegetation/quartz
            self.d = np.array([1100.0, 1300.0, 1500.0, 2600.0, 3200.0, 2200.0], dtype=np.float64)

        # Normalize target signature to unit norm
        d_norm = self.d / (np.linalg.norm(self.d) + 1e-8)

        # Compute background correlation matrix R = (1/N) * X^T * X
        R = (1.0 / N) * np.dot(X.T, X)
        
        # Add Tikhonov regularization for numerical stability
        R_reg = R + self.lambda_reg * np.eye(P)
        
        # Compute inverse R_inv
        self.R_inv = np.linalg.inv(R_reg)

        # Compute filter weights w = (R_inv @ d) / (d^T @ R_inv @ d)
        denom = np.dot(d_norm.T, np.dot(self.R_inv, d_norm)) + 1e-8
        self.w = np.dot(self.R_inv, d_norm) / denom
        return self

    def transform(self, X: np.ndarray) -> np.ndarray:
        """
        Apply CEM filter to input spectra X (shape: N x P).
        Returns normalized abundance score array of shape (N,).
        """
        if self.w is None:
            raise ValueError("CEM filter has not been fitted yet.")
            
        X = np.asarray(X, dtype=np.float64)
        raw_scores = np.dot(X, self.w)
        
        # Min-Max normalize scores to range [0, 1]
        s_min, s_max = np.percentile(raw_scores, 2), np.percentile(raw_scores, 98)
        if s_max > s_min:
            scores = (raw_scores - s_min) / (s_max - s_min)
            scores = np.clip(scores, 0.0, 1.0)
        else:
            scores = np.zeros_like(raw_scores)
            
        return scores

    def fit_transform(self, X: np.ndarray, target_signature: np.ndarray = None) -> np.ndarray:
        return self.fit(X, target_signature).transform(X)


def compute_cem_spectral_anomaly(df_features: pd.DataFrame) -> np.ndarray:
    """
    Helper function to compute CEM anomaly scores from Sentinel-2 bands in df_features.
    Bands used: b02_blue, b03_green, b04_red, b08_nir, b11_swir1, b12_swir2
    """
    spectral_cols = ['b02_blue', 'b03_green', 'b04_red', 'b08_nir', 'b11_swir1', 'b12_swir2']
    for col in spectral_cols:
        if col not in df_features.columns:
            df_features[col] = 1000.0

    X_spec = df_features[spectral_cols].values
    
    # Target signature for Manganese Oxides: diagnostic absorption feature in SWIR2 (B12) relative to SWIR1 (B11)
    target_sig = np.array([1200.0, 1400.0, 1600.0, 2800.0, 3400.0, 2400.0])
    
    cem = ConstrainedEnergyMinimization(target_signature=target_sig, lambda_reg=1e-3)
    cem_scores = cem.fit_transform(X_spec)
    return cem_scores
