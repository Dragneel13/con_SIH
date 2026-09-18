import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.ml.whatif_simulator import WhatIfSimulator

client = TestClient(app)

def test_whatif_baseline():
    response = client.get("/api/whatif/baseline")
    assert response.status_code == 200
    data = response.json()
    assert "mine_id" in data
    assert "blocks" in data
    assert "equipment" in data

def test_whatif_deterioration_scenario():
    """Verify downtime increase results in production deterioration (delta < 0)."""
    payload = {
        "parent_scenario_id": "SCN-2026-48B5",
        "forecast_id": "FCST-2026-0001",
        "shortfall_id": "SF-2026-0001",
        "mine_id": "MN-BAL-001",
        "target_production_tonnes": 2800.0,
        "baseline_forecast_tonnes": 2450.0,
        "baseline_shortfall_tonnes": 350.0,
        "equipment_code": "E-17",
        "downtime_hours": 35.0 # Baseline E-17 downtime is 4.0h -> Deterioration of +31.0h
    }
    response = client.post("/api/whatif/simulate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "SUCCESS"
    assert data["whatif_scenario_id"].startswith("SCN-2026-W")
    assert data["parent_scenario_id"] == "SCN-2026-48B5"
    assert "recovery_plans" not in data # Verified: Optimizer NOT invoked
    
    # Baseline forecast must be preserved
    assert data["baseline"]["predicted_production_tonnes"] == 2450.0
    
    # Deterioration check: predicted production < baseline forecast
    assert data["scenario"]["predicted_production_tonnes"] < 2450.0
    assert data["scenario"]["production_delta_tonnes"] < 0.0
    assert data["scenario"]["expected_shortfall_tonnes"] > 350.0

def test_whatif_improvement_scenario():
    """Verify downtime reduction / EX-104 restoration results in production improvement (delta > 0)."""
    payload = {
        "parent_scenario_id": "SCN-2026-48B5",
        "forecast_id": "FCST-2026-0001",
        "shortfall_id": "SF-2026-0001",
        "mine_id": "MN-BAL-001",
        "target_production_tonnes": 2800.0,
        "baseline_forecast_tonnes": 2450.0,
        "baseline_shortfall_tonnes": 350.0,
        "equipment_code": "EX-104",
        "equipment_available": True, # EX-104 baseline is MAINTENANCE -> Restoring to AVAILABLE
        "downtime_hours": 5.0 # EX-104 baseline downtime is 28.0h -> Reduction of -23.0h
    }
    response = client.post("/api/whatif/simulate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "SUCCESS"
    
    # Baseline forecast preserved
    assert data["baseline"]["predicted_production_tonnes"] == 2450.0
    
    # Improvement check: predicted production > baseline forecast
    assert data["scenario"]["predicted_production_tonnes"] > 2450.0
    assert data["scenario"]["production_delta_tonnes"] > 0.0
    assert data["scenario"]["expected_shortfall_tonnes"] < 350.0

def test_whatif_prototype_disclosure_label():
    """Verify prototype disclosure label is present in response."""
    payload = {
        "target_production_tonnes": 2800.0,
        "baseline_forecast_tonnes": 2450.0,
    }
    response = client.post("/api/whatif/simulate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "Prototype" in data["data_honesty_label"]
    assert "Domain Rule" in data["data_honesty_label"]
