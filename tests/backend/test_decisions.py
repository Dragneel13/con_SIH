import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.api.workflow import CURRENT_WORKFLOW_STATE
from app.api.whatif import SCENARIO_STORE
from app.services.audit_service import AUDIT_LOGS_STORE

client = TestClient(app)

def get_auth_headers(username="ops_manager", password="MoilOps@2026!"):
    """Helper to obtain a valid JWT Bearer token header."""
    res = client.post("/api/auth/login", json={"username": username, "password": password})
    assert res.status_code == 200
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def reset_workflow_context():
    """Resets backend workflow state and scenario store to known valid state."""
    CURRENT_WORKFLOW_STATE.targetTonnes = 2800.0
    CURRENT_WORKFLOW_STATE.forecastTonnes = 2450.0
    CURRENT_WORKFLOW_STATE.shortfallTonnes = 350.0
    CURRENT_WORKFLOW_STATE.optimizedTonnes = 2760.0
    CURRENT_WORKFLOW_STATE.forecastId = "FCST-2026-48B5"
    CURRENT_WORKFLOW_STATE.shortfallId = "SF-2026-48B5"
    CURRENT_WORKFLOW_STATE.scenarioId = "SCN-2026-48B5"
    CURRENT_WORKFLOW_STATE.whatifScenarioId = "SCN-2026-W001"
    
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

def test_signoff_requires_authentication():
    """Verify unauthenticated requests are rejected with 401."""
    res = client.post("/api/decisions/signoff", json={"decision_status": "APPROVED"})
    assert res.status_code == 401

def test_missing_target_tonnes_raises_authoritative_error():
    """Verify missing targetTonnes raises AUTHORITATIVE_WORKFLOW_DATA_UNAVAILABLE without silent 2800 fallback."""
    reset_workflow_context()
    CURRENT_WORKFLOW_STATE.targetTonnes = None
    headers = get_auth_headers("ops_manager", "MoilOps@2026!")
    
    res = client.post(
        "/api/decisions/signoff",
        json={"parent_scenario_id": "SCN-2026-48B5", "whatif_scenario_id": "SCN-2026-W001"},
        headers=headers
    )
    assert res.status_code == 400
    assert "AUTHORITATIVE_WORKFLOW_DATA_UNAVAILABLE" in res.json()["detail"]
    reset_workflow_context()

def test_missing_forecast_tonnes_raises_authoritative_error():
    """Verify missing forecastTonnes raises AUTHORITATIVE_WORKFLOW_DATA_UNAVAILABLE without silent 2450 fallback."""
    reset_workflow_context()
    CURRENT_WORKFLOW_STATE.forecastTonnes = None
    headers = get_auth_headers("ops_manager", "MoilOps@2026!")
    
    res = client.post(
        "/api/decisions/signoff",
        json={"parent_scenario_id": "SCN-2026-48B5", "whatif_scenario_id": "SCN-2026-W001"},
        headers=headers
    )
    assert res.status_code == 400
    assert "AUTHORITATIVE_WORKFLOW_DATA_UNAVAILABLE" in res.json()["detail"]
    reset_workflow_context()

def test_unrelated_whatif_scenario_rejected():
    """Verify nonexistent or unrelated What-If scenario ID is rejected."""
    reset_workflow_context()
    headers = get_auth_headers("ops_manager", "MoilOps@2026!")
    
    res = client.post(
        "/api/decisions/signoff",
        json={"parent_scenario_id": "SCN-2026-48B5", "whatif_scenario_id": "SCN-UNKNOWN-999"},
        headers=headers
    )
    assert res.status_code == 400
    assert "INVALID_WHATIF_SCENARIO" in res.json()["detail"]

def test_mismatched_parent_scenario_rejected():
    """Verify What-If scenario with mismatched parent scenario ID is rejected."""
    reset_workflow_context()
    headers = get_auth_headers("ops_manager", "MoilOps@2026!")
    
    res = client.post(
        "/api/decisions/signoff",
        json={"parent_scenario_id": "SCN-MISMATCHED-PARENTS", "whatif_scenario_id": "SCN-2026-W001"},
        headers=headers
    )
    assert res.status_code == 400
    assert "MISMATCHED_PARENT_SCENARIO" in res.json()["detail"]

def test_valid_matching_whatif_scenario_accepted():
    """Verify valid matching What-If scenario is accepted and derives snapshot correctly."""
    reset_workflow_context()
    headers = get_auth_headers("ops_manager", "MoilOps@2026!")
    payload = {
        "parent_scenario_id": "SCN-2026-48B5",
        "whatif_scenario_id": "SCN-2026-W001",
        "decision_status": "APPROVED",
        "executive_notes": "Operations Director approval for Balaghat Mine dispatch."
    }
    res = client.post("/api/decisions/signoff", json=payload, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "SUCCESS"
    assert data["decision_id"].startswith("DEC-2026-W")
    
    snapshot = data["snapshot"]
    assert snapshot["actor"]["username"] == "ops_manager"
    assert snapshot["actor"]["role"] == "Operations Manager"
    assert snapshot["authoritative_metrics"]["target_production_tonnes"] == 2800.0
    assert snapshot["authoritative_metrics"]["baseline_forecast_tonnes"] == 2450.0

def test_client_cannot_override_actor_or_metrics():
    """Verify client-submitted fake approver or metrics are ignored/rejected."""
    reset_workflow_context()
    headers = get_auth_headers("ops_manager", "MoilOps@2026!")
    payload = {
        "parent_scenario_id": "SCN-2026-48B5",
        "whatif_scenario_id": "SCN-2026-W001",
        "decision_status": "APPROVED",
        "approved_by": "Fake Chairman",
        "target_production_tonnes": 99999.0
    }
    res = client.post("/api/decisions/signoff", json=payload, headers=headers)
    assert res.status_code == 200
    snapshot = res.json()["snapshot"]
    
    # Approver MUST be ops_manager from JWT, NOT Fake Chairman
    assert snapshot["actor"]["username"] == "ops_manager"
    # Target tonnes MUST be 2800.0 from backend state, NOT 99999.0
    assert snapshot["authoritative_metrics"]["target_production_tonnes"] == 2800.0

def test_audit_event_recorded_on_signoff():
    """Verify DECISION_SIGNOFF event is recorded in security audit stream."""
    reset_workflow_context()
    headers = get_auth_headers("ops_manager", "MoilOps@2026!")
    res = client.post(
        "/api/decisions/signoff",
        json={"parent_scenario_id": "SCN-2026-48B5", "whatif_scenario_id": "SCN-2026-W001", "decision_status": "APPROVED"},
        headers=headers
    )
    assert res.status_code == 200
    
    audit_events = [log for log in AUDIT_LOGS_STORE if log.get("action") == "DECISION_SIGNOFF"]
    assert len(audit_events) > 0
    latest_event = audit_events[0]
    assert latest_event["username"] == "ops_manager"

def test_get_decision_history_and_by_id():
    """Verify decision history and lookup by decision_id."""
    reset_workflow_context()
    headers = get_auth_headers("ops_manager", "MoilOps@2026!")
    res_signoff = client.post(
        "/api/decisions/signoff",
        json={"parent_scenario_id": "SCN-2026-48B5", "whatif_scenario_id": "SCN-2026-W001", "decision_status": "APPROVED"},
        headers=headers
    )
    dec_id = res_signoff.json()["decision_id"]
    
    res_hist = client.get("/api/decisions/history", headers=headers)
    assert res_hist.status_code == 200
    assert res_hist.json()["count"] > 0
    
    res_id = client.get(f"/api/decisions/{dec_id}", headers=headers)
    assert res_id.status_code == 200
    assert res_id.json()["decision"]["decision_id"] == dec_id
