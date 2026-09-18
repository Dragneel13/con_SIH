import os
import sys
import numpy as np
import pandas as pd
from datetime import datetime, timedelta

def print_log(msg):
    print(msg, flush=True)

def main():
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    out_dir = os.path.join(base_dir, 'synthethic', 'synthetic', 'MIRPS_Synthetic_Operational_Data', 'MIRPS_Synthetic_Operational_Data')
    os.makedirs(out_dir, exist_ok=True)

    print_log("=== Generating Realistic Correlated Mining Operations Dataset ===")

    np.random.seed(42)

    # Define 6 MOIL Manganese Mines (Mix of Surface Open-pit and Underground)
    mines = [
        {"mine_id": "MN-BAL-001", "mine_name": "Balaghat Underground Mine", "mine_type": "UNDERGROUND", "capacity_daily_t": 1800.0},
        {"mine_id": "MN-BHA-002", "mine_name": "Bharweli Surface Pit", "mine_type": "SURFACE", "capacity_daily_t": 2200.0},
        {"mine_id": "MN-UKW-003", "mine_name": "Ukwa Deep Shaft", "mine_type": "UNDERGROUND", "capacity_daily_t": 1400.0},
        {"mine_id": "MN-DONG-004", "mine_name": "Dongri Buzurg Pit", "mine_type": "SURFACE", "capacity_daily_t": 1600.0},
        {"mine_id": "MN-CHIK-005", "mine_name": "Chikla Mine", "mine_type": "UNDERGROUND", "capacity_daily_t": 1200.0},
        {"mine_id": "MN-KAND-006", "mine_name": "Kandri Mine", "mine_type": "UNDERGROUND", "capacity_daily_t": 1100.0}
    ]

    # Generate daily records from 2024-01-01 to 2026-09-15 (~988 days)
    start_date = datetime(2024, 1, 1)
    end_date = datetime(2026, 9, 15)
    date_range = [start_date + timedelta(days=i) for i in range((end_date - start_date).days + 1)]

    prod_records = []
    block_records = []
    equip_records = []
    maint_records = []
    delay_records = []

    block_id_counter = 1
    equip_id_counter = 1

    for mine in mines:
        m_id = mine["mine_id"]
        m_type = mine["mine_type"]
        cap = mine["capacity_daily_t"]

        # Create 3 blocks per mine
        blocks = [
            {"block_id": f"BLK-{block_id_counter:03d}", "mine_id": m_id, "block_name": f"{m_id}-B1", "target_ratio": 0.45},
            {"block_id": f"BLK-{block_id_counter+1:03d}", "mine_id": m_id, "block_name": f"{m_id}-B2", "target_ratio": 0.35},
            {"block_id": f"BLK-{block_id_counter+2:03d}", "mine_id": m_id, "block_name": f"{m_id}-B3", "target_ratio": 0.20}
        ]
        block_id_counter += 3

        for b in blocks:
            b_id = b["block_id"]
            est_ore = round(np.random.uniform(30000, 75000), -2)
            est_grade = round(np.random.uniform(28.0, 38.5), 2)
            dev_pct = round(np.random.uniform(70.0, 95.0), 1)
            drill_pct = round(np.random.uniform(75.0, 98.0), 1)
            blast_read = "READY" if dev_pct > 80 else "NOT_READY"
            acc_read = "READY" if drill_pct > 80 else "NOT_READY"

            block_records.append({
                "block_id": b_id,
                "mine_id": m_id,
                "block_name": b["block_name"],
                "mine_type": m_type,
                "latitude": round(21.5 + np.random.uniform(0.1, 0.5), 4),
                "longitude": round(79.7 + np.random.uniform(0.1, 0.9), 4),
                "estimated_ore_tonnes": est_ore,
                "estimated_grade_mn": est_grade,
                "development_percent": dev_pct,
                "drilling_percent": drill_pct,
                "blasting_readiness": blast_read,
                "access_readiness": acc_read,
                "ready_block_tonnes": round(est_ore * (dev_pct / 100.0) * 0.5, 2)
            })

            # Daily Time Series Generation
            for dt in date_range:
                d_str = dt.strftime("%Y-%m-%d")
                month = dt.month
                
                # Monsoon seasonality (June-Sept = Month 6..9)
                is_monsoon = (month in [6, 7, 8, 9])
                rainfall_mm = round(np.random.exponential(25.0) if is_monsoon else np.random.exponential(1.5), 1)

                # Weather effect depends on mine_type:
                # Surface pit: High rain -> heavy haul road slurry -> high delays & shortfall
                # Underground: High rain -> sump pumping load -> mild delays
                if m_type == "SURFACE":
                    weather_delay_hrs = round(min(12.0, (rainfall_mm / 10.0) * np.random.uniform(1.2, 2.5)), 2)
                else:
                    weather_delay_hrs = round(min(6.0, (rainfall_mm / 25.0) * np.random.uniform(0.5, 1.2)), 2)

                # Equipment & Maintenance breakdown
                downtime_hrs = round(np.random.exponential(2.5) + (1.5 if is_monsoon else 0.0), 2)
                equip_avail = round(max(0.40, min(0.98, 1.0 - (downtime_hrs / 24.0))), 3)
                crusher_downtime_hrs = round(np.random.exponential(1.2), 2)

                # Production target and actual with realistic multi-variable formula
                target_t = round((cap / 3.0) * np.random.uniform(0.9, 1.1), 2)

                # Capacity reduction factor
                capacity_factor = (
                    equip_avail * 0.50 +
                    max(0.0, 1.0 - (weather_delay_hrs / 12.0)) * 0.30 +
                    max(0.0, 1.0 - (crusher_downtime_hrs / 10.0)) * 0.20
                )

                # Physical actual tonnage with random operational noise
                actual_t = round(target_t * capacity_factor * np.random.uniform(0.88, 1.02), 2)
                shortfall_t = max(0.0, target_t - actual_t)
                shortfall_pct = round((shortfall_t / target_t) * 100.0, 2)

                prod_records.append({
                    "mine_id": m_id,
                    "block_id": b_id,
                    "date": d_str,
                    "target_tonnes": target_t,
                    "actual_tonnes": actual_t,
                    "shortfall_tonnes": shortfall_t,
                    "shortfall_percentage": shortfall_pct,
                    "ore_grade_mn": round(est_grade + np.random.uniform(-1.5, 1.5), 2),
                    "rainfall_mm": rainfall_mm,
                    "downtime_hours": downtime_hrs,
                    "crusher_downtime_hours": crusher_downtime_hrs,
                    "weather_delay_hours": weather_delay_hrs
                })

                # Daily equipment log per mine
                if b["block_id"].endswith("001"):
                    equip_records.append({
                        "date": d_str,
                        "mine_id": m_id,
                        "operating_hours": round(24.0 - downtime_hrs, 2),
                        "downtime_hours": downtime_hrs,
                        "availability": equip_avail,
                        "utilization": round(equip_avail * np.random.uniform(0.75, 0.92), 3),
                        "fuel_consumption": round((24.0 - downtime_hrs) * 18.5, 2)
                    })

                # Maintenance records on high downtime days
                if downtime_hrs > 6.0:
                    maint_records.append({
                        "maintenance_id": f"MNT-{len(maint_records)+1:05d}",
                        "maintenance_date": d_str,
                        "mine_id": m_id,
                        "duration_hours": downtime_hrs,
                        "cost": round(downtime_hrs * np.random.uniform(1500, 3500), 2)
                    })

                # Delay records
                if weather_delay_hrs > 1.0 or downtime_hrs > 4.0:
                    delay_records.append({
                        "date": d_str,
                        "mine_id": m_id,
                        "block_id": b_id,
                        "delay_type": "MONSOON_HAULAGE" if weather_delay_hrs > 3.0 else "EQUIPMENT_BREAKDOWN",
                        "duration_hours": round(weather_delay_hrs + downtime_hrs * 0.5, 2)
                    })

    # Save to synthetic directory
    df_prod = pd.DataFrame(prod_records)
    df_blocks = pd.DataFrame(block_records)
    df_equip = pd.DataFrame(equip_records)
    df_maint = pd.DataFrame(maint_records)
    df_delays = pd.DataFrame(delay_records)

    df_prod.to_csv(os.path.join(out_dir, 'production_history.csv'), index=False)
    df_blocks.to_csv(os.path.join(out_dir, 'mine_blocks.csv'), index=False)
    df_equip.to_csv(os.path.join(out_dir, 'equipment_history.csv'), index=False)
    df_maint.to_csv(os.path.join(out_dir, 'maintenance_history.csv'), index=False)
    df_delays.to_csv(os.path.join(out_dir, 'operational_delays.csv'), index=False)

    print_log(f"Generated realistic operations dataset in {out_dir}:")
    print_log(f" - Production history: {len(df_prod)} rows")
    print_log(f" - Mine blocks: {len(df_blocks)} rows")
    print_log(f" - Shortfall rate (>=5% shortfall): {np.mean(df_prod['shortfall_percentage'] >= 5.0)*100:.1f}%")

if __name__ == '__main__':
    main()
