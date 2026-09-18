import os
import sys
import json
import joblib
import numpy as np
import pandas as pd

from sklearn.ensemble import RandomForestRegressor, HistGradientBoostingRegressor
from sklearn.linear_model import Ridge
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

def print_log(msg):
    print(msg, flush=True)

def main():
    base_dir = os.path.abspath(os.curdir)
    features_csv = os.path.join(base_dir, 'features', 'operations_features.csv')
    models_dir = os.path.join(base_dir, 'models')
    reports_dir = os.path.join(base_dir, 'reports')
    os.makedirs(models_dir, exist_ok=True)
    os.makedirs(reports_dir, exist_ok=True)

    print_log("=== STEP 6: Operational Production Tonnage Regression Model Training ===")

    df = pd.read_csv(features_csv)
    df['date'] = pd.to_datetime(df['date'])
    df = df.sort_values('date')
    print_log(f"Loaded operational feature dataset: {len(df)} total records from {df['date'].min().date()} to {df['date'].max().date()}")

    feature_cols = [
        'mine_type_code', 'target_tonnes', 'ore_grade_mn', 'ready_block_tonnes',
        'development_percent', 'drilling_percent', 'blasting_readiness', 'access_readiness',
        'equip_operating_hours_sum', 'equip_downtime_hours_sum', 'equip_availability_avg',
        'equip_utilization_avg', 'equip_fuel_consumed_sum',
        'crusher_downtime_hours', 'weather_delay_hours', 'rainfall_mm',
        'maint_cost_sum', 'maint_duration_sum', 'maint_count',
        'delay_duration_sum', 'delay_count',
        'actual_tonnes_lag1', 'target_tonnes_lag1', 'shortfall_tonnes_lag1',
        'actual_tonnes_roll3', 'downtime_hours_roll3', 'equip_avail_roll3',
        'mine_code'
    ]

    df[feature_cols] = df[feature_cols].fillna(0)

    X = df[feature_cols]
    y_reg = df['actual_tonnes'].values

    # Time-Series Split: Train on data before 2026-01-01, Test on 2026 data
    split_date = pd.to_datetime('2026-01-01')
    train_mask = df['date'] < split_date
    test_mask = df['date'] >= split_date

    X_train, y_train_reg = X[train_mask], y_reg[train_mask]
    X_test, y_test_reg = X[test_mask], y_reg[test_mask]

    print_log(f"Time-Series Split -> Train (2024-2025): {len(X_train)} rows, Test (2026): {len(X_test)} rows")

    # Tonnage Regression Models
    reg_models = {
        'HistGradientBoostingRegressor': HistGradientBoostingRegressor(max_iter=100, max_depth=6, random_state=42),
        'RandomForestRegressor': RandomForestRegressor(n_estimators=100, max_depth=10, random_state=42, n_jobs=-1),
        'RidgeBaseline': Pipeline([
            ('scaler', StandardScaler()),
            ('reg', Ridge(alpha=1.0))
        ])
    }

    reg_metrics = {}
    best_reg_name = None
    best_mae = float('inf')
    best_reg_obj = None

    for name, model in reg_models.items():
        print_log(f"\nTraining Tonnage Regression Model: {name}...")
        model.fit(X_train, y_train_reg)

        y_pred = model.predict(X_test)
        mae = float(mean_absolute_error(y_test_reg, y_pred))
        rmse = float(np.sqrt(mean_squared_error(y_test_reg, y_pred)))
        r2 = float(r2_score(y_test_reg, y_pred))

        reg_metrics[name] = {
            'mae': round(mae, 2),
            'rmse': round(rmse, 2),
            'r2': round(r2, 4)
        }

        print_log(f"  {name} Metrics -> MAE: {mae:.2f} tonnes | RMSE: {rmse:.2f} tonnes | R2: {r2:.4f}")

        if mae < best_mae:
            best_mae = mae
            best_reg_name = name
            best_reg_obj = model

    # Add Rolling Baseline for Explicit Comparison
    y_base = X_test['actual_tonnes_roll3'].values
    mae_base = float(mean_absolute_error(y_test_reg, y_base))
    rmse_base = float(np.sqrt(mean_squared_error(y_test_reg, y_base)))
    r2_base = float(r2_score(y_test_reg, y_base))
    reg_metrics['Rolling3Baseline'] = {
        'mae': round(mae_base, 2),
        'rmse': round(rmse_base, 2),
        'r2': round(r2_base, 4)
    }

    print_log(f"\nSelected Tonnage Regression Model based on Chronological Validation: {best_reg_name} (MAE: {best_mae:.2f} tonnes)")

    # Feature Importance for RandomForest
    rf_reg = reg_models['RandomForestRegressor']
    df_imp = pd.DataFrame({
        'feature': feature_cols,
        'importance': rf_reg.feature_importances_
    }).sort_values(by='importance', ascending=False)

    reg_model_path = os.path.join(models_dir, 'operations_regression_model.joblib')
    joblib.dump({
        'model': best_reg_obj,
        'all_models': reg_models,
        'feature_cols': feature_cols,
        'model_name': best_reg_name,
        'metrics': reg_metrics[best_reg_name],
        'all_metrics': reg_metrics,
        'selection_basis': 'Chronological time-split validation on 2026 test period',
        'feature_importances': df_imp.to_dict(orient='records')
    }, reg_model_path)
    print_log(f"Saved trained operations regression model to {reg_model_path}")

    # Also save metrics JSON
    with open(os.path.join(reports_dir, 'operational_regression_metrics.json'), 'w') as f:
        json.dump(reg_metrics, f, indent=2)

if __name__ == '__main__':
    main()

