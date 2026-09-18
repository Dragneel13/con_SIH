import sys
import os
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "backend"))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_run_optimization_success():
    payload = {
        "forecast_id": "FCST-2026-TEST",
        "shortfall_id": "SF-2026-TEST",
        "target_id": "MN-TGT-001",
        "mine_id": "MN-BAL-001",
        "mine_type": "UNDERGROUND",
        "target_production_tonnes": 2800.0,
        "predicted_production_tonnes": 2450.0,
        "selected_action_ids": ["ACT-EQ-001", "ACT-BLK-001"]
    }
    response = client.post("/api/optimizer/optimize", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "OPTIMIZED"
    assert "scenario_id" in data
    assert data["target_tonnes"] == 2800.0
    assert data["baseline_forecast_tonnes"] == 2450.0
    assert data["baseline_shortfall_tonnes"] == 350.0
    assert data["optimized_expected_production_tonnes"] > 2450.0
    assert len(data["candidate_plans"]) > 0
    assert len(data["active_constraints"]) == 3

def test_run_optimization_no_shortfall():
    payload = {
        "forecast_id": "FCST-2026-TEST",
        "target_production_tonnes": 2800.0,
        "predicted_production_tonnes": 2900.0
    }
    response = client.post("/api/optimizer/optimize", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "NO_ACTIVE_PRODUCTION_SHORTFALL"
    assert data["shortfall_tonnes"] == 0.0
