import sys
import os
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "backend"))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_explain_shortfall_endpoint_success():
    payload = {
        "forecast_id": "FCST-2026-TEST",
        "shortfall_id": "SF-2026-TEST",
        "mine_id": "MN-BAL-001",
        "target_id": "MN-TGT-001",
        "target_tonnes": 2800.0,
        "forecast_tonnes": 2450.0
    }
    response = client.post("/api/production/explain-shortfall", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "EXPLANATION_SUCCESS"
    assert data["forecast_id"] == "FCST-2026-TEST"
    assert data["shortfall_id"] == "SF-2026-TEST"
    assert data["target_tonnes"] == 2800.0
    assert data["forecast_tonnes"] == 2450.0
    assert data["shortfall_tonnes"] == 350.0
    assert len(data["top_contributing_factors"]) == 5
    assert len(data["all_attributions"]) == 28
    assert len(data["category_breakdown"]) > 0

def test_explain_shortfall_invalid_mine():
    payload = {
        "forecast_id": "FCST-2026-TEST",
        "mine_id": "NON_EXISTENT_MINE_ID"
    }
    response = client.post("/api/production/explain-shortfall", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "INSUFFICIENT_DATA_FOR_EXPLANATION"
    assert "No operational feature records found" in data["message"]

def test_corrective_actions_endpoint_success():
    payload = {
        "forecast_id": "FCST-2026-TEST",
        "shortfall_id": "SF-2026-TEST",
        "mine_id": "MN-BAL-001",
        "target_id": "MN-TGT-001",
        "mine_type": "UNDERGROUND",
        "target_tonnes": 2800.0,
        "forecast_tonnes": 2450.0
    }
    response = client.post("/api/production/corrective-actions", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "CORRECTIVE_ACTIONS_READY"
    assert len(data["candidate_actions"]) > 0
    assert data["shortfall_tonnes"] == 350.0

def test_corrective_actions_no_shortfall():
    payload = {
        "forecast_id": "FCST-2026-TEST",
        "target_tonnes": 2800.0,
        "forecast_tonnes": 2900.0
    }
    response = client.post("/api/production/corrective-actions", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "NO_ACTIVE_PRODUCTION_SHORTFALL"
    assert data["shortfall_tonnes"] == 0.0
    assert len(data["candidate_actions"]) == 0

