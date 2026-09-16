import os
import json
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

from backend.app.ml.optimizer import PrescriptiveMineOptimizer
from app.api.production import get_minetwin_state, get_shortfallshield_forecasts

router = APIRouter()

class OptimizeRequest(BaseModel):
    mine_code: Optional[str] = "MN-BAL-001"
    horizon_days: int = 7
    target_production_tonnes: Optional[float] = 2800.0
    predicted_production_tonnes: Optional[float] = 2450.0
    expected_tonnes_short: Optional[float] = 350.0
    risk_level: Optional[str] = "MEDIUM"
    custom_crusher_capacity: Optional[float] = 1200.0

@router.post("/optimizer/optimize")
def run_optimization(req: OptimizeRequest):
    """
    POST /api/optimizer/optimize
    
    Evaluates operational state (MineTwin), shortfall forecast (ShortfallShield),
    and SHAP root causes to calculate feasible candidate recovery plans.
    """
    # 1. Fetch current MineTwin operational state
    mine_state = get_minetwin_state()

    # 2. Build shortfall info
    shortfall_info = {
        "horizon_days": req.horizon_days,
        "target_production_tonnes": req.target_production_tonnes,
        "predicted_production_tonnes": req.predicted_production_tonnes,
        "expected_tonnes_short": req.expected_tonnes_short,
        "risk_level": req.risk_level
    }

    # 3. Instantiate and run Prescriptive Mine Optimizer engine
    engine = PrescriptiveMineOptimizer(crusher_capacity_daily=req.custom_crusher_capacity or 1200.0)
    result = engine.optimize(mine_state=mine_state, shortfall_info=shortfall_info)

    return result
