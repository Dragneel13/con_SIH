from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from app.ml.whatif_simulator import WhatIfSimulator
from app.services.audit_service import log_audit_event

router = APIRouter(prefix="/api/whatif", tags=["What-If Simulator"])
simulator = WhatIfSimulator()

# In-memory store for validated What-If scenarios
SCENARIO_STORE: Dict[str, Dict[str, Any]] = {}

def register_seed_scenarios():
    """Populates standard active workflow scenario seeds in SCENARIO_STORE."""
    SCENARIO_STORE["SCN-2026-W001"] = {
        "whatif_scenario_id": "SCN-2026-W001",
        "parent_scenario_id": "SCN-2026-48B5",
        "forecast_id": "FCST-2026-48B5",
        "shortfall_id": "SF-2026-48B5",
        "mine_id": "MN-BAL-001",
        "target_production_tonnes": 2800.0,
        "predicted_production_tonnes": 3005.5,
        "expected_shortfall_tonnes": 0.0,
        "production_delta_tonnes": 555.5,
        "optimized_expected_tonnes": 2760.0
    }
    SCENARIO_STORE["SCN-OPTIMAL-01"] = {
        "whatif_scenario_id": "SCN-OPTIMAL-01",
        "parent_scenario_id": "SCN-OPTIMAL-01",
        "forecast_id": "FC-2026-04",
        "shortfall_id": "SF-2026-012",
        "mine_id": "MN-BAL-001",
        "target_production_tonnes": 2800.0,
        "predicted_production_tonnes": 2760.0,
        "expected_shortfall_tonnes": 40.0,
        "production_delta_tonnes": 310.0,
        "optimized_expected_tonnes": 2760.0
    }

register_seed_scenarios()

class WhatIfRequest(BaseModel):
    parent_scenario_id: Optional[str] = None
    forecast_id: Optional[str] = None
    shortfall_id: Optional[str] = None
    mine_id: Optional[str] = "MN-BAL-001"
    mine_type: Optional[str] = "Underground"
    target_production_tonnes: Optional[float] = 2800.0
    baseline_forecast_tonnes: Optional[float] = 2450.0
    baseline_shortfall_tonnes: Optional[float] = 350.0
    scenario_name: Optional[str] = "Custom Operational Scenario"
    scenario_type: Optional[str] = "EQUIPMENT_UNAVAILABLE"
    equipment_code: Optional[str] = "E-17"
    equipment_available: Optional[bool] = True
    duration_days: Optional[int] = 3
    downtime_hours: Optional[float] = None
    rainfall_mm: Optional[float] = None
    haul_road_condition: Optional[str] = None
    blasting_delay_hours: Optional[float] = None
    development_delay_days: Optional[float] = None
    block_code: Optional[str] = None
    block_available: Optional[bool] = True
    crusher_capacity_pct: Optional[float] = None
    horizon_days: Optional[int] = 7

@router.post("/simulate")
def simulate_scenario(request: WhatIfRequest):
    """
    Simulates operational what-if scenarios against an isolated copy of baseline state
    using relative delta calculations from authoritative persisted workflow context.
    
    Returns:
    - whatif_scenario_id (SCN-2026-WXXX)
    - parent_scenario_id, forecast_id, shortfall_id, mine_id, mine_type
    - baseline metrics
    - scenario metrics (predicted production, remaining shortfall, delta)
    - SHAP delta breakdown
    - Prototype simulation disclosure label
    """
    try:
        req_dict = request.dict()
        result = simulator.simulate(req_dict)
        
        scenario_id = result.get('whatif_scenario_id')
        if scenario_id:
            SCENARIO_STORE[scenario_id] = {
                "whatif_scenario_id": scenario_id,
                "parent_scenario_id": result.get('parent_scenario_id') or req_dict.get('parent_scenario_id'),
                "forecast_id": result.get('forecast_id') or req_dict.get('forecast_id'),
                "shortfall_id": result.get('shortfall_id') or req_dict.get('shortfall_id'),
                "mine_id": result.get('mine_id') or req_dict.get('mine_id'),
                "target_production_tonnes": result.get('scenario', {}).get('target_production_tonnes'),
                "predicted_production_tonnes": result.get('scenario', {}).get('predicted_production_tonnes'),
                "expected_shortfall_tonnes": result.get('scenario', {}).get('expected_shortfall_tonnes'),
                "production_delta_tonnes": result.get('scenario', {}).get('production_delta_tonnes')
            }
        
        prod_delta = result.get('scenario', {}).get('production_delta_tonnes', 0.0)
        log_audit_event(
            username="system_user",
            role="Operations Manager",
            action="WHATIF_SIMULATION",
            resource="/api/whatif/simulate",
            status="SUCCESS",
            details=f"Simulated what-if scenario '{result.get('whatif_scenario_id')}' (Delta: {'+' if prod_delta >= 0 else ''}{prod_delta} MT)."
        )
        return result
    except Exception as e:
        log_audit_event(
            username="system_user",
            role="Operations Manager",
            action="WHATIF_SIMULATION",
            resource="/api/whatif/simulate",
            status="FAILED",
            details=f"What-If Simulation failed: {str(e)}"
        )
        raise HTTPException(status_code=500, detail=f"What-If Simulation Error: {str(e)}")

@router.get("/baseline")
def get_baseline():
    """Returns default baseline mine state without modifications."""
    return simulator.get_baseline_state()
