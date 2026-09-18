import os
import json
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

from app.ml.optimizer import PrescriptiveMineOptimizer
from app.api.production import get_minetwin_state
from app.services.audit_service import log_audit_event

router = APIRouter()

class OptimizeRequest(BaseModel):
    forecast_id: Optional[str] = "FCST-2026-001"
    shortfall_id: Optional[str] = "SF-2026-001"
    target_id: Optional[str] = "MN-TGT-001"
    mine_id: Optional[str] = "MN-BAL-001"
    mine_code: Optional[str] = "MN-BAL-001"
    mine_type: Optional[str] = "UNDERGROUND"
    horizon_days: int = 7
    target_production_tonnes: Optional[float] = 2800.0
    predicted_production_tonnes: Optional[float] = 2450.0
    expected_tonnes_short: Optional[float] = 350.0
    risk_level: Optional[str] = "MEDIUM"
    custom_crusher_capacity: Optional[float] = 1200.0
    selected_action_ids: Optional[List[str]] = None

@router.post("/optimizer/optimize")
def run_optimization(req: OptimizeRequest):
    """
    POST /api/optimizer/optimize
    
    Evaluates operational state (MineTwin), shortfall forecast,
    and selected corrective actions to calculate feasible candidate recovery scenarios.
    """
    # 1. Fetch current MineTwin operational state
    mine_state = get_minetwin_state()

    mine_id = req.mine_id or req.mine_code or "MN-BAL-001"
    target_tonnes = req.target_production_tonnes or 2800.0
    forecast_tonnes = req.predicted_production_tonnes or 2450.0
    shortfall_tonnes = round(max(target_tonnes - forecast_tonnes, 0.0), 1)

    # 2. Build shortfall info
    shortfall_info = {
        "forecast_id": req.forecast_id or "FCST-2026-001",
        "shortfall_id": req.shortfall_id or "SF-2026-001",
        "target_id": req.target_id or "MN-TGT-001",
        "mine_id": mine_id,
        "mine_type": req.mine_type or "UNDERGROUND",
        "horizon_days": req.horizon_days,
        "target_production_tonnes": target_tonnes,
        "predicted_production_tonnes": forecast_tonnes,
        "expected_tonnes_short": shortfall_tonnes,
        "risk_level": req.risk_level,
        "selected_action_ids": req.selected_action_ids or ["ACT-EQ-001", "ACT-BLK-001"]
    }

    # 3. Instantiate and run Prescriptive Mine Optimizer engine
    engine = PrescriptiveMineOptimizer(crusher_capacity_daily=req.custom_crusher_capacity or 1200.0)
    result = engine.optimize(
        mine_state=mine_state,
        shortfall_info=shortfall_info,
        selected_action_ids=req.selected_action_ids
    )

    try:
        log_audit_event(
            username="system_user",
            role="Operations Manager",
            action="OPTIMIZER_EXECUTION",
            resource="/api/optimizer/optimize",
            status=result.get("status", "OPTIMIZED"),
            details=f"Evaluated Prescriptive Recovery Plans for shortfall -{shortfall_tonnes} MT over {req.horizon_days}d."
        )
    except Exception:
        pass

    return result
