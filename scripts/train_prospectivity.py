import os
import sys
import json
import joblib
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

# Ensure root directory is on sys.path
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from backend.app.ml.cem import ConstrainedEnergyMinimization, compute_cem_spectral_anomaly
from backend.app.ml.pu_learning import ElkanNotoPULearner
from backend.app.ml.spatial_cv import SpatialBlockCV
from backend.app.ml.confidence_ood import ConfidenceScorer, OODApplicabilityDetector

import rasterio
from rasterio.transform import from_bounds

def print_log(msg):
    print(msg, flush=True)

def main():
    features_csv = os.path.join(BASE_DIR, 'features', 'prospectivity_features.csv')
    models_dir = os.path.join(BASE_DIR, 'models')
    reports_dir = os.path.join(BASE_DIR, 'reports')
    predictions_dir = os.path.join(BASE_DIR, 'predictions')
    os.makedirs(models_dir, exist_ok=True)
    os.makedirs(reports_dir, exist_ok=True)
    os.makedirs(predictions_dir, exist_ok=True)

    print_log("=== STEP 5: SCIENTIFIC EXPLORATION ML PIPELINE UPGRADE ===")
    print_log("1. Multi-Source Evidence Fusion (SAR, Multispectral, DEM, Geology, Geophysics, Geochemistry)")
    print_log("2. Constrained Energy Minimization (CEM) Spectral Target Anomaly Detection")
    print_log("3. Positive-Unlabelled (PU) Learning (Elkan & Noto method)")
    print_log("4. Spatial Block Cross-Validation (Leakage-Free Evaluation)")
    print_log("5. Confidence Scoring & OOD Applicability Domain Detection\n")

    df = pd.read_csv(features_csv)
    print_log(f"Loaded feature dataset: {len(df)} total spatial grid cells.")

    # --- 1. Compute CEM Spectral Anomaly ---
    print_log("Computing CEM Spectral Anomaly for manganese oxide signature...")
    spectral_cols = ['b02_blue', 'b03_green', 'b04_red', 'b08_nir', 'b11_swir1', 'b12_swir2']
    X_spec = df[spectral_cols].values
    target_sig = np.array([1200.0, 1400.0, 1600.0, 2800.0, 3400.0, 2400.0])
    
    cem_model = ConstrainedEnergyMinimization(target_signature=target_sig, lambda_reg=1e-3)
    cem_scores = cem_model.fit_transform(X_spec)
    df['cem_anomaly'] = cem_scores
    print_log(f"CEM anomaly computed. Min={cem_scores.min():.4f}, Mean={cem_scores.mean():.4f}, Max={cem_scores.max():.4f}")

    # Overwrite updated features CSV with cem_anomaly column
    df.to_csv(features_csv, index=False)

    # --- 2. Filter Positives & Unlabelled for PU Learning ---
    # target_occurrence: 1 = Positive known occurrence, 0 = Unlabelled background, -1 = Unlabelled spatial grid
    # For PU learning, Positives = 1, Unlabelled = 0 and -1 (all other cells)
    s_labels = np.where(df['target_occurrence'] == 1, 1, 0)
    pos_count = sum(s_labels == 1)
    unlabelled_count = sum(s_labels == 0)
    print_log(f"PU Learning Setup -> Positives (Known Occurrences): {pos_count}, Unlabelled Spatial Cells: {unlabelled_count}")

    feature_cols = [
        'elevation', 'slope', 'aspect',
        's1_vv', 's1_vh', 's1_ratio',
        'b02_blue', 'b03_green', 'b04_red', 'b08_nir', 'b11_swir1', 'b12_swir2',
        'ndvi', 'ndbi', 'ndwi', 'clay_index', 'ferrous_index',
        'landsat_b1', 'landsat_b2', 'landsat_b3', 'landsat_b4', 'landsat_b5',
        'soil_moisture', 'rainfall',
        'dist_roads_km', 'dist_chem_km', 'nearest_mno_pct',
        'cem_anomaly'
    ]

    X = df[feature_cols]
    groups = df['spatial_block_id'].values

    # Fit OOD Applicability Detector on full feature dataset envelope
    ood_detector = OODApplicabilityDetector()
    ood_detector.fit(X)

    # --- 3. Spatial Block Cross-Validation with PU Learning ---
    print_log("\nEvaluating model using Spatial Block Cross-Validation (SpatialBlockCV)...")
    pu_learner = ElkanNotoPULearner(n_estimators=100, max_depth=12, random_state=42)
    
    spatial_cv = SpatialBlockCV(n_splits=5, random_state=42)
    cv_metrics = spatial_cv.evaluate(pu_learner, X, s_labels, groups=groups)
    
    print_log("SpatialBlockCV Performance Metrics:")
    print_log(f"  ROC-AUC: {cv_metrics['roc_auc']:.4f} ± {cv_metrics['roc_auc_std']:.4f}")
    print_log(f"  PR-AUC:  {cv_metrics['pr_auc']:.4f}")
    print_log(f"  Precision: {cv_metrics['precision']:.4f} | Recall: {cv_metrics['recall']:.4f} | F1: {cv_metrics['f1']:.4f}")

    # --- 4. Final PU Learning Model Fit ---
    print_log("\nFitting final PU Prospectivity model on complete multi-source dataset...")
    final_pu_model = ElkanNotoPULearner(n_estimators=100, max_depth=12, random_state=42)
    final_pu_model.fit(X.values, s_labels)
    print_log(f"PU Propensity Constant c = P(s=1|y=1) estimated as: {final_pu_model.c:.4f}")

    # Compute Feature Importances from base Random Forest classifier
    importances = final_pu_model.base_classifier.feature_importances_
    df_imp = pd.DataFrame({
        'feature': feature_cols,
        'importance': importances
    }).sort_values(by='importance', ascending=False)
    
    print_log("\nTop 10 Multi-Source Evidence Features:")
    print_log(df_imp.head(10).to_string(index=False))

    # Save Model Artifact Package
    model_path = os.path.join(models_dir, 'prospectivity_model.joblib')
    joblib.dump({
        'model': final_pu_model,
        'cem_model': cem_model,
        'ood_detector': ood_detector,
        'feature_cols': feature_cols,
        'model_name': 'ElkanNotoPULearner (RandomForest + SpatialBlockCV)',
        'propensity_c': final_pu_model.c,
        'metrics': cv_metrics,
        'feature_importances': df_imp.to_dict(orient='records')
    }, model_path)
    print_log(f"\nSaved updated scientific ML model package to: {model_path}")

    # Save Metrics Reports
    metrics_json = os.path.join(reports_dir, 'prospectivity_metrics.json')
    with open(metrics_json, 'w') as f:
        json.dump({
            "ElkanNotoPULearner": cv_metrics,
            "propensity_constant_c": final_pu_model.c,
            "top_features": df_imp.head(5).to_dict(orient='records')
        }, f, indent=2)
    print_log(f"Saved metrics report to {metrics_json}")

    # --- 5. Generate Rasters for Prospectivity & CEM Anomaly ---
    print_log("\nGenerating GeoTIFF rasters for prospectivity and CEM anomaly...")
    probs, tree_stds = final_pu_model.predict_uncertainty(X.values)
    df['prospectivity_prob'] = probs
    df['uncertainty_std'] = tree_stds

    minx, miny, maxx, maxy = 79.60, 21.60, 80.30, 22.05
    res = 0.002
    width = int(np.round((maxx - minx) / res))
    height = int(np.round((maxy - miny) / res))
    transform = from_bounds(minx, miny, maxx, maxy, width, height)

    # 1. Prospectivity Raster
    prob_grid = np.zeros((height, width), dtype=np.float32)
    prob_grid[df['row_idx'].values, df['col_idx'].values] = probs
    prob_tif = os.path.join(predictions_dir, 'balaghat_prospectivity.tif')
    with rasterio.open(
        prob_tif, 'w', driver='GTiff',
        height=height, width=width, count=1, dtype=prob_grid.dtype,
        crs='EPSG:4326', transform=transform
    ) as dst:
        dst.write(prob_grid, 1)

    # 2. CEM Anomaly Raster
    cem_grid = np.zeros((height, width), dtype=np.float32)
    cem_grid[df['row_idx'].values, df['col_idx'].values] = cem_scores
    cem_tif = os.path.join(predictions_dir, 'balaghat_cem.tif')
    with rasterio.open(
        cem_tif, 'w', driver='GTiff',
        height=height, width=width, count=1, dtype=cem_grid.dtype,
        crs='EPSG:4326', transform=transform
    ) as dst:
        dst.write(cem_grid, 1)

    print_log(f"Successfully exported GeoTIFF rasters:\n - Prospectivity: {prob_tif}\n - CEM Anomaly:   {cem_tif}")

if __name__ == '__main__':
    main()
