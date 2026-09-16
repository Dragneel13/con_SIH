import numpy as np
import pandas as pd
from sklearn.base import BaseEstimator, ClassifierMixin
from sklearn.ensemble import RandomForestClassifier
from typing import Tuple, Dict, Any

class ElkanNotoPULearner(BaseEstimator, ClassifierMixin):
    """
    Positive-Unlabelled (PU) Learning classifier based on Elkan & Noto (2008).
    
    Treats known mineral occurrences as Positives (s=1), and all other spatial cells
    as Unlabelled (s=0). Does not assume unlabelled cells are true negatives.
    
    Step 1: Fit base classifier g(x) = P(s=1|x) on (X, s).
    Step 2: Estimate constant c = P(s=1|y=1) on positive validation set V_+.
    Step 3: Posterior probability P(y=1|x) = min(1.0, g(x) / c).
    """

    def __init__(self, n_estimators: int = 100, max_depth: int = 12, random_state: int = 42):
        self.n_estimators = n_estimators
        self.max_depth = max_depth
        self.random_state = random_state
        self.base_classifier = RandomForestClassifier(
            n_estimators=self.n_estimators,
            max_depth=self.max_depth,
            random_state=self.random_state,
            n_jobs=-1
        )
        self.c = 0.5  # Default propensity factor P(s=1|y=1)
        self.is_fitted = False

    def fit(self, X: np.ndarray, s: np.ndarray, holdout_positive_ratio: float = 0.2):
        """
        Fit PU model on features X and binary labels s (1=Positive occurrence, 0=Unlabelled).
        """
        X = np.asarray(X, dtype=np.float64)
        s = np.asarray(s, dtype=int)

        # Separate positive indices for propensity c estimation
        pos_indices = np.where(s == 1)[0]
        if len(pos_indices) < 5:
            # Fallback if few positive samples
            val_pos_idx = pos_indices
            train_idx = np.arange(len(s))
        else:
            np.random.seed(self.random_state)
            val_size = int(len(pos_indices) * holdout_positive_ratio)
            val_pos_idx = np.random.choice(pos_indices, size=val_size, replace=False)
            train_idx = np.setdiff1d(np.arange(len(s)), val_pos_idx)

        # Fit base classifier on training subset
        X_train, s_train = X[train_idx], s[train_idx]
        self.base_classifier.fit(X_train, s_train)

        # Estimate propensity factor c = P(s=1|y=1) on positive holdout
        if len(val_pos_idx) > 0:
            val_probs = self.base_classifier.predict_proba(X[val_pos_idx])[:, 1]
            self.c = float(np.mean(val_probs))
            # Ensure c is bounded away from 0
            self.c = max(0.05, min(0.95, self.c))
        else:
            self.c = 0.5

        self.is_fitted = True
        return self

    def predict_proba_raw(self, X: np.ndarray) -> np.ndarray:
        """
        Raw probabilities P(s=1|x) from base ensemble.
        """
        if not self.is_fitted:
            raise ValueError("PU Learner is not fitted.")
        return self.base_classifier.predict_proba(X)[:, 1]

    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        """
        Calibrated PU prospectivity probabilities P(y=1|x) = min(1.0, P(s=1|x) / c).
        Returns array of shape (N, 2) compatible with scikit-learn.
        """
        raw_p = self.predict_proba_raw(X)
        calibrated_p = np.clip(raw_p / self.c, 0.0, 1.0)
        return np.column_stack([1.0 - calibrated_p, calibrated_p])

    def predict_uncertainty(self, X: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """
        Compute calibrated PU probability and ensemble tree prediction variance.
        Returns:
            calibrated_p: np.ndarray of shape (N,)
            variance: np.ndarray of shape (N,) - std deviation across individual trees
        """
        X = np.asarray(X, dtype=np.float64)
        tree_predictions = np.array([tree.predict_proba(X)[:, 1] for tree in self.base_classifier.estimators_])
        
        # Mean raw probability and std variance across trees
        mean_raw_p = np.mean(tree_predictions, axis=0)
        tree_std = np.std(tree_predictions, axis=0)
        
        calibrated_p = np.clip(mean_raw_p / self.c, 0.0, 1.0)
        return calibrated_p, tree_std

    def predict(self, X: np.ndarray, threshold: float = 0.5) -> np.ndarray:
        prob = self.predict_proba(X)[:, 1]
        return (prob >= threshold).astype(int)
