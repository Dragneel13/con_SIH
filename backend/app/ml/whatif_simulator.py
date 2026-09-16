import copy
from typing import Dict, Any, List, Optional
from app.ml.optimizer import PrescriptiveMineOptimizer

class WhatIfSimulator:
    """
    What-If Simulator Engine for MnVision 360.
    
    Connects:
    MineTwin (Operational State) -> ShortfallShield (Forecasting & Risk) 
    -> SHAP (Explainability) -> Prescriptive Mine Optimizer (Recovery Planning)
    
    CRITICAL: Uses an isolated deep copy of the operational state for simulations.
    The baseline state is NEVER mutated.
    """

    def __init__(self):
        self.optimizer = PrescriptiveMineOptimizer()

    def get_baseline_state(self) -> Dict[str, Any]:
        """Default baseline operational state of the MOIL Balaghat Mine."""
        return {
            "mine_id": "MOIL-BALAGHAT-01",
            "mine_name": "Balaghat Underground Manganese Mine",
            "blocks": [
                {
                    "block_code": "Block B-17",
                    "readiness_score": 86.0,
                    "development_pct": 82.0,
                    "access_pct": 90.0,
                    "drilling_pct": 95.0,
                    "blasting_pct": 75.0,
                    "mn_grade_pct": 34.5,
                    "estimated_ore_tonnes": 45000,
                    "status": "ACTIVE"
                },
                {
                    "block_code": "Block B-12",
                    "readiness_score": 88.5,
                    "development_pct": 85.0,
                    "access_pct": 92.0,
                    "drilling_pct": 90.0,
                    "blasting_pct": 80.0,
                    "mn_grade_pct": 36.0,
                    "estimated_ore_tonnes": 38000,
                    "status": "ACTIVE"
                },
                {
                    "block_code": "Block B-09",
                    "readiness_score": 68.0,
                    "development_pct": 60.0,
                    "access_pct": 70.0,
                    "drilling_pct": 65.0,
                    "blasting_pct": 50.0,
                    "mn_grade_pct": 31.0,
                    "estimated_ore_tonnes": 52000,
                    "status": "DEVELOPMENT"
                },
                {
                    "block_code": "Block B-22",
                    "readiness_score": 92.0,
                    "development_pct": 90.0,
                    "access_pct": 95.0,
                    "drilling_pct": 92.0,
                    "blasting_pct": 88.0,
                    "mn_grade_pct": 38.2,
                    "estimated_ore_tonnes": 60000,
                    "status": "RESERVE"
                }
            ],
            "equipment": [
                {
                    "equipment_code": "E-17",
                    "equipment_type": "Dump Truck (20T)",
                    "availability_pct": 88.0,
                    "downtime_hours": 4.0,
                    "location": "Stope 3 East",
                    "status": "OPERATIONAL"
                },
                {
                    "equipment_code": "LHD-02",
                    "equipment_type": "Load Haul Dump (3.5m³)",
                    "availability_pct": 91.0,
                    "downtime_hours": 2.0,
                    "location": "Stope 4 West",
                    "status": "OPERATIONAL"
                },
                {
                    "equipment_code": "EX-104",
                    "equipment_type": "Hydraulic Excavator",
                    "availability_pct": 62.0,
                    "downtime_hours": 28.0,
                    "location": "Central Pit",
                    "status": "MAINTENANCE"
                },
                {
                    "equipment_code": "DR-05",
                    "equipment_type": "Production Drill Rig",
                    "availability_pct": 84.0,
                    "downtime_hours": 6.0,
                    "location": "Level 3 Face",
                    "status": "OPERATIONAL"
                }
            ],
            "crusher_capacity_daily": 1200.0,
            "rainfall_mm_daily": 12.0,
            "haul_road_condition": "GOOD",
            "blasting_delay_hours": 0.0,
            "development_delay_days": 0
        }

    def simulate(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """
        Executes a What-If scenario against an isolated copy of baseline state.
        
        Supported inputs:
        - scenario_type: EQUIPMENT_UNAVAILABLE, DOWNTIME, RAINFALL, ROAD_DEGRADATION, BLASTING_DELAY, DEV_DELAY, BLOCK_UNAVAILABLE, CRUSHER_REDUCTION, COMBINED
        - equipment_code: e.g. "E-17"
        - equipment_available: bool (e.g. False)
        - duration_days: int (e.g. 3)
        - downtime_hours: float
        - rainfall_mm: float
        - block_code: str
        - crusher_capacity_pct: float (e.g. 70.0)
        - horizon_days: int (7, 15, 30)
        """
        # 1. ISOLATED COPY - Baseline is NEVER mutated
        baseline_state = self.get_baseline_state()
        scenario_state = copy.deepcopy(baseline_state)

        # Baseline calculations (7-day default horizon)
        horizon_days = int(request.get("horizon_days", 7))
        target_production = 400.0 * horizon_days # e.g. 2800 MT for 7 days

        baseline_forecast = target_production - 350.0
        baseline_shortfall = 350.0
        baseline_probability = 68.5
        baseline_risk = "MEDIUM"

        # 2. APPLY SCENARIO MODIFICATIONS TO TEMPORARY COPY
        scenario_name = request.get("scenario_name", "Custom Operational Scenario")
        scenario_type = request.get("scenario_type", "EQUIPMENT_UNAVAILABLE").upper()
        eq_target = request.get("equipment_code", "E-17")
        eq_available = request.get("equipment_available", False)
        duration_days = int(request.get("duration_days", 3))
        downtime_increase = float(request.get("downtime_hours", 0.0))
        rainfall_mm = float(request.get("rainfall_mm", 0.0))
        road_condition = request.get("haul_road_condition", None)
        blasting_delay = float(request.get("blasting_delay_hours", 0.0))
        dev_delay = int(request.get("development_delay_days", 0))
        block_target = request.get("block_code", None)
        crusher_capacity_pct = float(request.get("crusher_capacity_pct", 100.0))

        production_loss_estimate = 0.0
        shap_reasons = []

        # Equipment Outage / Downtime
        if scenario_type in ["EQUIPMENT_UNAVAILABLE", "DOWNTIME", "COMBINED"] or not eq_available or downtime_increase > 0:
            for eq in scenario_state["equipment"]:
                if eq["equipment_code"] == eq_target:
                    if not eq_available:
                        eq["availability_pct"] = 0.0
                        eq["downtime_hours"] = duration_days * 24.0
                        eq["status"] = "OUT_OF_SERVICE"
                        daily_loss = 120.0 # MT/day for major equipment outage
                        loss_for_duration = min(daily_loss * duration_days, target_production * 0.4)
                        production_loss_estimate += loss_for_duration
                        shap_reasons.append({
                            "feature": f"Equipment {eq_target} Outage",
                            "impact_mt": round(-loss_for_duration, 1),
                            "description": f"{eq_target} forced offline for {duration_days} days"
                        })
                    elif downtime_increase > 0:
                        eq["downtime_hours"] += downtime_increase
                        eq["availability_pct"] = max(0.0, eq["availability_pct"] - (downtime_increase * 2.0))
                        loss = downtime_increase * 8.5
                        production_loss_estimate += loss
                        shap_reasons.append({
                            "feature": f"Equipment {eq_target} Downtime Increase",
                            "impact_mt": round(-loss, 1),
                            "description": f"Added {downtime_increase}h downtime to {eq_target}"
                        })

        # Rainfall Increase
        if scenario_type in ["RAINFALL", "COMBINED"] or rainfall_mm > 0:
            scenario_state["rainfall_mm_daily"] += rainfall_mm
            rain_loss = (rainfall_mm / 10.0) * 45.0 * (horizon_days / 7.0)
            production_loss_estimate += rain_loss
            shap_reasons.append({
                "feature": "Monsoon Rainfall Increase",
                "impact_mt": round(-rain_loss, 1),
                "description": f"Rainfall increased by +{rainfall_mm} mm/day impacting pit access"
            })

        # Haul Road Degradation
        if scenario_type in ["ROAD_DEGRADATION", "COMBINED"] or road_condition == "POOR":
            scenario_state["haul_road_condition"] = "POOR"
            road_loss = 110.0 * (horizon_days / 7.0)
            production_loss_estimate += road_loss
            shap_reasons.append({
                "feature": "Haul Road Degradation",
                "impact_mt": round(-road_loss, 1),
                "description": "Heavy sloughing slowing truck cycle times"
            })

        # Blasting / Development Delays
        if scenario_type in ["BLASTING_DELAY", "DEV_DELAY", "COMBINED"] or blasting_delay > 0 or dev_delay > 0:
            if blasting_delay > 0:
                scenario_state["blasting_delay_hours"] += blasting_delay
                b_loss = blasting_delay * 18.0
                production_loss_estimate += b_loss
                shap_reasons.append({
                    "feature": "Blasting Operations Delay",
                    "impact_mt": round(-b_loss, 1),
                    "description": f"{blasting_delay}h delay in stope blasting"
                })
            if dev_delay > 0:
                scenario_state["development_delay_days"] += dev_delay
                d_loss = dev_delay * 35.0
                production_loss_estimate += d_loss
                shap_reasons.append({
                    "feature": "Block Development Delay",
                    "impact_mt": round(-d_loss, 1),
                    "description": f"{dev_delay} days delay in face advancement"
                })

        # Block Unavailable
        if scenario_type in ["BLOCK_UNAVAILABLE", "COMBINED"] or block_target:
            if not block_target:
                block_target = "Block B-17"
            for b in scenario_state["blocks"]:
                if b["block_code"] == block_target:
                    b["readiness_score"] = 0.0
                    b["status"] = "UNAVAILABLE"
                    block_loss = 180.0 * (horizon_days / 7.0)
                    production_loss_estimate += block_loss
                    shap_reasons.append({
                        "feature": f"{block_target} Out of Service",
                        "impact_mt": round(-block_loss, 1),
                        "description": f"{block_target} readiness dropped to 0% due to ground instability"
                    })

        # Crusher Capacity Reduction
        if scenario_type in ["CRUSHER_REDUCTION", "COMBINED"] or crusher_capacity_pct < 100.0:
            new_capacity = scenario_state["crusher_capacity_daily"] * (crusher_capacity_pct / 100.0)
            scenario_state["crusher_capacity_daily"] = new_capacity
            c_loss = (100.0 - crusher_capacity_pct) * 4.2 * horizon_days
            production_loss_estimate += c_loss
            shap_reasons.append({
                "feature": "Crusher Capacity Throttling",
                "impact_mt": round(-c_loss, 1),
                "description": f"Crusher throughput reduced to {crusher_capacity_pct}% ({new_capacity} T/day)"
            })

        # Default fallback if simple scenario request
        if production_loss_estimate == 0.0:
            production_loss_estimate = 150.0

        # 3. RECALCULATE SHORTFALLSHIELD PROJECTIONS
        scenario_shortfall = round(baseline_shortfall + production_loss_estimate, 1)
        scenario_forecast = round(max(0.0, target_production - scenario_shortfall), 1)

        scenario_probability = min(99.0, round(baseline_probability + (production_loss_estimate / 10.0), 1))
        if scenario_probability > 75.0:
            scenario_risk = "CRITICAL" if scenario_probability > 88.0 else "HIGH"
        else:
            scenario_risk = "MEDIUM"

        # 4. PASS MODIFIED SCENARIO STATE TO PRESCRIPTIVE OPTIMIZER
        shortfall_info = {
            "horizon_days": horizon_days,
            "target_production_tonnes": target_production,
            "predicted_production_tonnes": scenario_forecast,
            "expected_tonnes_short": scenario_shortfall,
            "risk_level": scenario_risk,
            "shap": shap_reasons
        }

        # Optimizer runs on scenario_state (E-17 is unavailable, so optimizer will NOT use E-17)
        opt_output = self.optimizer.optimize(scenario_state, shortfall_info)
        recovery_plans = opt_output.get("candidate_plans", [])

        # Construct comparison matrix (BASELINE vs SCENARIO vs RECOVERY PLAN)
        best_plan = recovery_plans[0] if recovery_plans else None
        recovery_tonnes = best_plan["expected_recovery_tonnes"] if best_plan else 0.0
        final_post_recovery_shortfall = round(max(0.0, scenario_shortfall - recovery_tonnes), 1)
        final_post_recovery_production = round(scenario_forecast + recovery_tonnes, 1)

        post_recovery_risk = "LOW" if final_post_recovery_shortfall <= 50.0 else "MEDIUM" if final_post_recovery_shortfall <= 200.0 else "HIGH"

        comparison_matrix = {
            "metrics": [
                {
                    "metric": "Predicted Production (MT)",
                    "baseline": round(baseline_forecast, 1),
                    "scenario": round(scenario_forecast, 1),
                    "post_recovery": round(final_post_recovery_production, 1)
                },
                {
                    "metric": "Expected Shortfall (MT)",
                    "baseline": round(baseline_shortfall, 1),
                    "scenario": round(scenario_shortfall, 1),
                    "post_recovery": round(final_post_recovery_shortfall, 1)
                },
                {
                    "metric": "Shortfall Probability (%)",
                    "baseline": baseline_probability,
                    "scenario": scenario_probability,
                    "post_recovery": 28.4 if post_recovery_risk == "LOW" else 48.2
                },
                {
                    "metric": "Operational Risk Level",
                    "baseline": baseline_risk,
                    "scenario": scenario_risk,
                    "post_recovery": post_recovery_risk
                }
            ]
        }

        # Format scenario label
        display_title = scenario_name
        if eq_target and not eq_available:
            display_title = f"What if {eq_target} is unavailable for {duration_days} days?"

        return {
            "status": "SUCCESS",
            "scenario_title": display_title,
            "scenario_type": scenario_type,
            "data_honesty_label": "Prototype Simulation Result — MOIL Operational Scenario Engine",
            "horizon_days": horizon_days,
            "baseline": {
                "target_production_tonnes": target_production,
                "predicted_production_tonnes": round(baseline_forecast, 1),
                "expected_shortfall_tonnes": round(baseline_shortfall, 1),
                "shortfall_probability_pct": baseline_probability,
                "risk_level": baseline_risk
            },
            "scenario": {
                "target_production_tonnes": target_production,
                "predicted_production_tonnes": round(scenario_forecast, 1),
                "expected_shortfall_tonnes": round(scenario_shortfall, 1),
                "production_loss_delta_tonnes": round(production_loss_estimate, 1),
                "shortfall_probability_pct": scenario_probability,
                "risk_level": scenario_risk
            },
            "shap_reasons": shap_reasons,
            "optimizer_status": opt_output.get("status", "OPTIMIZED"),
            "recovery_plans": recovery_plans,
            "rejected_blocks": opt_output.get("rejected_blocks", []),
            "rejected_equipment": opt_output.get("rejected_equipment", []),
            "comparison_matrix": comparison_matrix
        }
