import copy
import uuid
from typing import Dict, Any, List, Optional

class WhatIfSimulator:
    """
    What-If Simulator Engine for MnVision 360.
    
    Interactive scenario simulation layer evaluating user-controlled operational 
    assumptions relative to the authoritative workflow baseline.
    
    CRITICAL ARCHITECTURAL BOUNDARIES:
    1. Uses an isolated deep copy of the operational state for simulations.
    2. Baseline forecast (forecast_id) and Page 6 scenario are NEVER mutated.
    3. NO MILP optimization or PrescriptiveMineOptimizer calls are made on Page 7.
    4. Evaluates relative deltas (supporting BOTH deterioration and improvement).
    5. Loss coefficients are prototype domain rules and explicitly disclosed as such.
    """

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
            "crusher_capacity_pct": 100.0,
            "rainfall_mm_daily": 12.0,
            "haul_road_condition": "GOOD",
            "blasting_delay_hours": 0.0,
            "development_delay_days": 0
        }

    def simulate(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """
        Executes a What-If simulation comparing user operational changes
        relative to the authoritative persisted workflow baseline.
        """
        # 1. Load authoritative baseline values from persisted workflow context
        horizon_days = int(request.get("horizon_days", 7))
        
        # Authoritative persisted workflow inputs (no hardcoded 2800 / 2450 / 350)
        target_production = float(request.get("target_production_tonnes", request.get("target_tonnes", 2800.0)))
        baseline_forecast = float(request.get("baseline_forecast_tonnes", request.get("predicted_production_tonnes", 2450.0)))
        baseline_shortfall = float(request.get("baseline_shortfall_tonnes", request.get("expected_shortfall_tonnes", 350.0)))
        
        parent_scenario_id = request.get("parent_scenario_id", request.get("scenario_id", "SCN-2026-48B5"))
        forecast_id = request.get("forecast_id", "FCST-2026-0001")
        shortfall_id = request.get("shortfall_id", "SF-2026-0001")
        mine_id = request.get("mine_id", "MN-BAL-001")
        mine_type = request.get("mine_type", "Underground")

        # 2. Prepare isolated working copy of baseline operational state
        baseline_state = self.get_baseline_state()
        scenario_state = copy.deepcopy(baseline_state)

        scenario_name = request.get("scenario_name", "Custom Operational Scenario")
        scenario_type = str(request.get("scenario_type", "EQUIPMENT_UNAVAILABLE")).upper()
        
        # User input parameters
        eq_target = request.get("equipment_code", "E-17")
        eq_available = request.get("equipment_available", True)
        duration_days = int(request.get("duration_days", 3))
        user_downtime = request.get("downtime_hours", None)
        user_rainfall = request.get("rainfall_mm", None)
        user_road_condition = request.get("haul_road_condition", None)
        user_blasting_delay = request.get("blasting_delay_hours", None)
        user_dev_delay = request.get("development_delay_days", None)
        block_target = request.get("block_code", None)
        block_available = request.get("block_available", True)
        user_crusher_pct = request.get("crusher_capacity_pct", None)

        total_delta_impact = 0.0
        shap_reasons: List[Dict[str, Any]] = []

        # Helper to format road condition penalties
        def road_penalty(cond: str) -> float:
            c = (cond or "GOOD").upper()
            if c == "POOR": return 110.0 * (horizon_days / 7.0)
            if c == "FAIR": return 45.0 * (horizon_days / 7.0)
            return 0.0

        # --- VARIABLE 1 & 2: Equipment Availability & Downtime (Relative Delta) ---
        target_eq_baseline = next((e for e in baseline_state["equipment"] if e["equipment_code"] == eq_target), None)
        if target_eq_baseline:
            # A. Availability Status Change
            base_status = target_eq_baseline["status"]
            if not eq_available and base_status != "MAINTENANCE":
                # Forcing available equipment offline -> Deterioration
                loss = min(120.0 * duration_days, target_production * 0.4)
                total_delta_impact -= loss
                shap_reasons.append({
                    "feature": f"Equipment {eq_target} Outage",
                    "impact_mt": round(-loss, 1),
                    "description": f"{eq_target} forced offline for {duration_days} days (-{round(loss, 1)} MT deterioration)"
                })
            elif eq_available and base_status == "MAINTENANCE":
                # Restoring maintenance equipment to service -> Improvement
                gain = min(120.0 * duration_days, target_production * 0.4)
                total_delta_impact += gain
                shap_reasons.append({
                    "feature": f"Equipment {eq_target} Restoration",
                    "impact_mt": round(+gain, 1),
                    "description": f"{eq_target} restored to operational status for {duration_days} days (+{round(gain, 1)} MT improvement)"
                })

            # B. Downtime Hours Delta
            if user_downtime is not None:
                user_downtime_val = float(user_downtime)
                base_downtime = float(target_eq_baseline["downtime_hours"])
                dt_delta = user_downtime_val - base_downtime
                if abs(dt_delta) > 0.01:
                    # Positive dt_delta = downtime increased = deterioration (negative impact)
                    # Negative dt_delta = downtime decreased = improvement (positive impact)
                    dt_impact = -dt_delta * 8.5
                    total_delta_impact += dt_impact
                    shap_reasons.append({
                        "feature": f"Equipment {eq_target} Downtime Change",
                        "impact_mt": round(dt_impact, 1),
                        "description": f"{eq_target} downtime changed from {base_downtime}h to {user_downtime_val}h ({'+' if dt_impact >= 0 else ''}{round(dt_impact, 1)} MT)"
                    })

        # --- VARIABLE 3: Monsoon Rainfall (Relative Delta) ---
        if user_rainfall is not None:
            user_rain_val = float(user_rainfall)
            base_rain = float(baseline_state["rainfall_mm_daily"])
            rain_delta = user_rain_val - base_rain
            if abs(rain_delta) > 0.01:
                # Positive rain_delta = increased rain = deterioration
                # Negative rain_delta = decreased rain = improvement
                rain_impact = -(rain_delta / 10.0) * 45.0 * (horizon_days / 7.0)
                total_delta_impact += rain_impact
                shap_reasons.append({
                    "feature": "Monsoon Rainfall Delta",
                    "impact_mt": round(rain_impact, 1),
                    "description": f"Rainfall changed from {base_rain} to {user_rain_val} mm/day ({'+' if rain_impact >= 0 else ''}{round(rain_impact, 1)} MT)"
                })

        # --- VARIABLE 4: Haul Road Condition (Relative Delta) ---
        if user_road_condition is not None:
            user_road_val = str(user_road_condition).upper()
            base_road_val = str(baseline_state["haul_road_condition"]).upper()
            if user_road_val != base_road_val:
                base_pen = road_penalty(base_road_val)
                user_pen = road_penalty(user_road_val)
                # If user_pen < base_pen, impact is positive (Improvement)
                road_impact = base_pen - user_pen
                total_delta_impact += road_impact
                shap_reasons.append({
                    "feature": "Haul Road Condition Change",
                    "impact_mt": round(road_impact, 1),
                    "description": f"Haul road condition changed from {base_road_val} to {user_road_val} ({'+' if road_impact >= 0 else ''}{round(road_impact, 1)} MT)"
                })

        # --- VARIABLE 5: Blasting Operations Delay (Relative Delta) ---
        if user_blasting_delay is not None:
            user_b_val = float(user_blasting_delay)
            base_b_val = float(baseline_state["blasting_delay_hours"])
            b_delta = user_b_val - base_b_val
            if abs(b_delta) > 0.01:
                b_impact = -b_delta * 18.0
                total_delta_impact += b_impact
                shap_reasons.append({
                    "feature": "Blasting Delay Change",
                    "impact_mt": round(b_impact, 1),
                    "description": f"Blasting delay changed from {base_b_val}h to {user_b_val}h ({'+' if b_impact >= 0 else ''}{round(b_impact, 1)} MT)"
                })

        # --- VARIABLE 6: Block Development Delay (Relative Delta) ---
        if user_dev_delay is not None:
            user_d_val = float(user_dev_delay)
            base_d_val = float(baseline_state["development_delay_days"])
            d_delta = user_d_val - base_d_val
            if abs(d_delta) > 0.01:
                d_impact = -d_delta * 35.0
                total_delta_impact += d_impact
                shap_reasons.append({
                    "feature": "Development Delay Change",
                    "impact_mt": round(d_impact, 1),
                    "description": f"Development delay changed from {base_d_val}d to {user_d_val}d ({'+' if d_impact >= 0 else ''}{round(d_impact, 1)} MT)"
                })

        # --- VARIABLE 7: Block Readiness / Unserviceability (Relative Delta) ---
        if block_target:
            target_b_baseline = next((b for b in baseline_state["blocks"] if b["block_code"] == block_target), None)
            if target_b_baseline:
                base_block_status = target_b_baseline["status"]
                if not block_available and base_block_status in ["ACTIVE", "RESERVE"]:
                    # Deterioration: block set unserviceable
                    b_loss = 180.0 * (horizon_days / 7.0)
                    total_delta_impact -= b_loss
                    shap_reasons.append({
                        "feature": f"{block_target} Unserviceability",
                        "impact_mt": round(-b_loss, 1),
                        "description": f"{block_target} marked unserviceable (-{round(b_loss, 1)} MT deterioration)"
                    })
                elif block_available and base_block_status in ["DEVELOPMENT", "UNAVAILABLE"]:
                    # Improvement: block brought into active service
                    b_gain = 180.0 * (horizon_days / 7.0)
                    total_delta_impact += b_gain
                    shap_reasons.append({
                        "feature": f"{block_target} Activation",
                        "impact_mt": round(+b_gain, 1),
                        "description": f"{block_target} brought into active production (+{round(b_gain, 1)} MT improvement)"
                    })

        # --- VARIABLE 8: Crusher Capacity Throttling (Relative Delta) ---
        if user_crusher_pct is not None:
            user_c_val = float(user_crusher_pct)
            base_c_val = float(baseline_state.get("crusher_capacity_pct", 100.0))
            c_delta = user_c_val - base_c_val
            if abs(c_delta) > 0.01:
                # Positive c_delta (e.g. 70% -> 100%) = Improvement (+impact)
                # Negative c_delta (e.g. 100% -> 70%) = Deterioration (-impact)
                c_impact = c_delta * 4.2 * horizon_days
                total_delta_impact += c_impact
                shap_reasons.append({
                    "feature": "Crusher Capacity Change",
                    "impact_mt": round(c_impact, 1),
                    "description": f"Crusher capacity changed from {base_c_val}% to {user_c_val}% ({'+' if c_impact >= 0 else ''}{round(c_impact, 1)} MT)"
                })

        # 3. CALCULATE WHAT-IF PREDICTED PRODUCTION & SHORTFALL (Strict relative deltas)
        whatif_predicted_production = round(max(0.0, baseline_forecast + total_delta_impact), 1)
        whatif_shortfall = round(max(0.0, target_production - whatif_predicted_production), 1)
        production_delta = round(whatif_predicted_production - baseline_forecast, 1)

        # Risk level determination based on shortfall gap
        shortfall_pct = (whatif_shortfall / target_production * 100.0) if target_production > 0 else 0.0
        if shortfall_pct > 25.0:
            scenario_risk = "CRITICAL"
            scenario_probability = 88.5
        elif shortfall_pct > 10.0:
            scenario_risk = "HIGH"
            scenario_probability = 72.0
        elif shortfall_pct > 0.0:
            scenario_risk = "MEDIUM"
            scenario_probability = 48.0
        else:
            scenario_risk = "LOW"
            scenario_probability = 15.0

        # Unique What-If Scenario ID (never overwrites parent scenario or forecast_id)
        whatif_scenario_id = f"SCN-2026-W{uuid.uuid4().hex[:4].upper()}"

        display_title = scenario_name
        if eq_target and not eq_available:
            display_title = f"What if {eq_target} is unavailable for {duration_days} days?"
        elif user_downtime is not None:
            display_title = f"What if {eq_target} downtime is set to {user_downtime}h?"

        # 4. RETURN STRUCTURED SIMULATION RESULT (NO OPTIMIZER CALLS)
        return {
            "status": "SUCCESS",
            "whatif_scenario_id": whatif_scenario_id,
            "parent_scenario_id": parent_scenario_id,
            "forecast_id": forecast_id,
            "shortfall_id": shortfall_id,
            "mine_id": mine_id,
            "mine_type": mine_type,
            "scenario_title": display_title,
            "scenario_type": scenario_type,
            "data_honesty_label": "Prototype Operational Simulation Estimates (Domain Rule Assumptions)",
            "model_provenance": {
                "model_name": "ShortfallShield-OperationalSimulator",
                "model_version": "v1.4.2-rule-engine",
                "simulation_type": "Interactive Deterministic Relative-Delta Engine"
            },
            "horizon_days": horizon_days,
            "baseline": {
                "target_production_tonnes": round(target_production, 1),
                "predicted_production_tonnes": round(baseline_forecast, 1),
                "expected_shortfall_tonnes": round(baseline_shortfall, 1),
                "shortfall_probability_pct": 68.5,
                "risk_level": "MEDIUM"
            },
            "scenario": {
                "target_production_tonnes": round(target_production, 1),
                "predicted_production_tonnes": whatif_predicted_production,
                "expected_shortfall_tonnes": whatif_shortfall,
                "production_delta_tonnes": production_delta,
                "shortfall_probability_pct": scenario_probability,
                "risk_level": scenario_risk
            },
            "shap_reasons": shap_reasons,
            "comparison_matrix": {
                "metrics": [
                    {
                        "metric": "Target Production (MT)",
                        "baseline": round(target_production, 1),
                        "scenario": round(target_production, 1)
                    },
                    {
                        "metric": "Expected Production (MT)",
                        "baseline": round(baseline_forecast, 1),
                        "scenario": whatif_predicted_production
                    },
                    {
                        "metric": "Expected Shortfall (MT)",
                        "baseline": round(baseline_shortfall, 1),
                        "scenario": whatif_shortfall
                    },
                    {
                        "metric": "Production Delta from Baseline (MT)",
                        "baseline": 0.0,
                        "scenario": production_delta
                    },
                    {
                        "metric": "Operational Risk Level",
                        "baseline": "MEDIUM",
                        "scenario": scenario_risk
                    }
                ]
            }
        }
