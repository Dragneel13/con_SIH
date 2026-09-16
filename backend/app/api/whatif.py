from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from app.ml.whatif_simulator import WhatIfSimulator
from app.services.audit_service import log_audit_event

router = APIRouter(prefix="/api/whatif", tags=["What-If Simulator"])
simulator = WhatIfSimulator()

class WhatIfRequest(BaseModel):
    scenario_name: Optional[str] = "Custom Operational Scenario"
    scenario_type: Optional[str] = "EQUIPMENT_UNAVAILABLE"
    equipment_code: Optional[str] = "E-17"
    equipment_available: Optional[bool] = False
    duration_days: Optional[int] = 3
    downtime_hours: Optional[float] = 0.0
    rainfall_mm: Optional[float] = 0.0
    haul_road_condition: Optional[str] = "GOOD"
    blasting_delay_hours: Optional[float] = 0.0
    development_delay_days: Optional[int] = 0
    block_code: Optional[str] = None
    crusher_capacity_pct: Optional[float] = 100.0
    horizon_days: Optional[int] = 7

@router.post("/simulate")
def simulate_scenario(request: WhatIfRequest):
    """
    Simulates operational what-if scenarios against an isolated copy of baseline state.
    
    Returns:
    - baseline metrics
    - scenario metrics
    - SHAP root causes
    - Prescriptive Optimizer recovery plans
    - Baseline vs Scenario vs Recovery Comparison Matrix
    """
    try:
        req_dict = request.dict()
        result = simulator.simulate(req_dict)
        
        log_audit_event(
            username="system_user",
            role="Operations Manager",
            action="WHATIF_SIMULATION",
            resource="/api/whatif/simulate",
            status="SUCCESS",
            details=f"Simulated scenario '{result.get('scenario_title')}' (Loss: -{result.get('scenario', {}).get('production_loss_delta_tonnes')} MT)."
        )
        return result
    except Exception as e:
        log_audit_event(
            username="system_user",
            role="Operations Manager",
            action="WHATIF_SIMULATION",
            resource="/api/whatif/simulate",
            status="FAILED",
            details=f"Simulation failed: {str(e)}"
        )
        raise HTTPException(status_code=500, detail=f"What-If Simulation Error: {str(e)}")

@router.get("/baseline")
def get_baseline():
    """Returns default baseline mine state without modifications."""
    return simulator.get_baseline_state()
