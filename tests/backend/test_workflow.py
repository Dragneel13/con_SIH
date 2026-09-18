import sys
import os
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "backend"))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_workflow_state_get():
    response = client.get("/api/workflow/state")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "workflow" in data
    assert "mineId" in data["workflow"]
    assert "targetId" in data["workflow"]

def test_workflow_state_update():
    payload = {
        "currentStage": "explore",
        "targetId": "MN-TGT-005"
    }
    response = client.post("/api/workflow/state", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["workflow"]["targetId"] == "MN-TGT-005"
    assert data["workflow"]["currentStage"] == "explore"

def test_workflow_initialize():
    payload = {
        "mineId": "MN-BAL-001",
        "targetId": "MN-TGT-101"
    }
    response = client.post("/api/workflow/initialize", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["workflow"]["mineId"] == "MN-BAL-001"
    assert data["workflow"]["targetId"] == "MN-TGT-101"
    assert data["workflow"]["currentStage"] == "explore"
