import os
import sys
import numpy as np
import pandas as pd

def print_log(msg):
    print(msg, flush=True)

def main():
    base_dir = os.path.abspath(os.curdir)
    synth_dir = os.path.join(base_dir, 'synthethic', 'synthetic', 'MIRPS_Synthetic_Operational_Data', 'MIRPS_Synthetic_Operational_Data')
    if not os.path.exists(synth_dir):
        synth_dir = os.path.join(base_dir, 'synthetic', 'MIRPS_Synthetic_Operational_Data', 'MIRPS_Synthetic_Operational_Data')

    features_dir = os.path.join(base_dir, 'features')
    os.makedirs(features_dir, exist_ok=True)

    print_log("=== STEP 2 & 3 (Pipeline B): Operational Preprocessing & Feature Engineering ===")

    # 1. Load Synthetic Operational CSV Tables
    p_prod = os.path.join(synth_dir, 'production_history.csv')
    p_blocks = os.path.join(synth_dir, 'mine_blocks.csv')
    p_equip = os.path.join(synth_dir, 'equipment_history.csv')
    p_maint = os.path.join(synth_dir, 'maintenance_history.csv')
    p_delays = os.path.join(synth_dir, 'operational_delays.csv')

    print_log(f"Loading synthetic operational tables from: {synth_dir}")
    df_prod = pd.read_csv(p_prod)
    df_blocks = pd.read_csv(p_blocks)
    df_equip = pd.read_csv(p_equip)
    df_maint = pd.read_csv(p_maint)
    df_delays = pd.read_csv(p_delays)

    # Ensure date columns are datetime
    df_prod['date'] = pd.to_datetime(df_prod['date'])
    df_equip['date'] = pd.to_datetime(df_equip['date'])
    df_maint['maintenance_date'] = pd.to_datetime(df_maint['maintenance_date'])
    df_delays['date'] = pd.to_datetime(df_delays['date'])

    # Sort production history by mine, block, date for accurate time-series feature creation
    df_prod = df_prod.sort_values(by=['mine_id', 'block_id', 'date']).reset_index(drop=True)

    # 2. Join Mine Block Static Attributes
    block_cols = ['block_id', 'mine_id', 'mine_type', 'latitude', 'longitude', 'estimated_ore_tonnes', 'estimated_grade_mn', 
                  'development_percent', 'drilling_percent', 'blasting_readiness', 'access_readiness', 'ready_block_tonnes']
    df_blocks_sub = df_blocks[[c for c in block_cols if c in df_blocks.columns]]
    df_merged = pd.merge(df_prod, df_blocks_sub, on=['mine_id', 'block_id'], how='left')

    # Convert readiness strings to 0/1 numeric indicators
    df_merged['blasting_readiness'] = df_merged['blasting_readiness'].apply(lambda x: 1.0 if str(x).upper() == 'READY' else 0.0)
    df_merged['access_readiness'] = df_merged['access_readiness'].apply(lambda x: 1.0 if str(x).upper() == 'READY' else 0.0)
    df_merged['mine_type_code'] = df_merged['mine_type'].apply(lambda x: 1 if str(x).upper() == 'UNDERGROUND' else 0)

    # 3. Aggregate Daily Equipment Stats per Mine
    equip_agg = df_equip.groupby(['date', 'mine_id']).agg(
        equip_operating_hours_sum=('operating_hours', 'sum'),
        equip_downtime_hours_sum=('downtime_hours', 'sum'),
        equip_availability_avg=('availability', 'mean'),
        equip_utilization_avg=('utilization', 'mean'),
        equip_fuel_consumed_sum=('fuel_consumption', 'sum')
    ).reset_index()

    df_merged = pd.merge(df_merged, equip_agg, on=['date', 'mine_id'], how='left')

    # 4. Aggregate Daily Maintenance Stats per Mine
    maint_agg = df_maint.groupby(['maintenance_date', 'mine_id']).agg(
        maint_cost_sum=('cost', 'sum'),
        maint_duration_sum=('duration_hours', 'sum'),
        maint_count=('maintenance_id', 'count')
    ).reset_index().rename(columns={'maintenance_date': 'date'})

    df_merged = pd.merge(df_merged, maint_agg, on=['date', 'mine_id'], how='left')
    df_merged['maint_cost_sum'] = df_merged['maint_cost_sum'].fillna(0)
    df_merged['maint_duration_sum'] = df_merged['maint_duration_sum'].fillna(0)
    df_merged['maint_count'] = df_merged['maint_count'].fillna(0)

    # 5. Aggregate Daily Delay Stats per Mine and Block
    delay_agg = df_delays.groupby(['date', 'mine_id', 'block_id']).agg(
        delay_duration_sum=('duration_hours', 'sum'),
        delay_count=('delay_type', 'count')
    ).reset_index()

    df_merged = pd.merge(df_merged, delay_agg, on=['date', 'mine_id', 'block_id'], how='left')
    df_merged['delay_duration_sum'] = df_merged['delay_duration_sum'].fillna(0)
    df_merged['delay_count'] = df_merged['delay_count'].fillna(0)

    # 6. Create Time-Series Lag & Rolling Window Features (Strictly Historical)
    print_log("Creating historical lag and rolling window features...")

    grouped = df_merged.groupby(['mine_id', 'block_id'])

    df_merged['actual_tonnes_lag1'] = grouped['actual_tonnes'].shift(1)
    df_merged['target_tonnes_lag1'] = grouped['target_tonnes'].shift(1)
    df_merged['shortfall_tonnes_lag1'] = grouped['shortfall_tonnes'].shift(1)
    
    # 3-day rolling averages of historical performance
    df_merged['actual_tonnes_roll3'] = grouped['actual_tonnes'].transform(lambda x: x.shift(1).rolling(3, min_periods=1).mean())
    df_merged['downtime_hours_roll3'] = grouped['downtime_hours'].transform(lambda x: x.shift(1).rolling(3, min_periods=1).mean())
    df_merged['equip_avail_roll3'] = grouped['equip_availability_avg'].transform(lambda x: x.shift(1).rolling(3, min_periods=1).mean())

    # Fill initial lag NaNs with column medians
    df_merged = df_merged.fillna({
        'actual_tonnes_lag1': df_merged['actual_tonnes'].median(),
        'target_tonnes_lag1': df_merged['target_tonnes'].median(),
        'shortfall_tonnes_lag1': 0,
        'actual_tonnes_roll3': df_merged['actual_tonnes'].median(),
        'downtime_hours_roll3': 0,
        'equip_avail_roll3': 0.85
    })

    # Encode Mine ID as categorical code
    df_merged['mine_code'] = df_merged['mine_id'].astype('category').cat.codes

    # Define Actionable Shortfall Target (1 if shortfall >= 5% of target, else 0)
    df_merged['is_shortfall'] = (df_merged['shortfall_percentage'] >= 5.0).astype(int)

    print_log(f"Target Distribution (is_shortfall >= 5% target):\n{df_merged['is_shortfall'].value_counts()}")

    out_csv = os.path.join(features_dir, 'operations_features.csv')
    df_merged.to_csv(out_csv, index=False)
    print_log(f"Successfully saved operational feature table to {out_csv} ({len(df_merged)} rows)")

if __name__ == '__main__':
    main()
