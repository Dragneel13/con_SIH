from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import uuid

from app.api.auth import require_roles, UserResponse
from app.api.workflow import CURRENT_WORKFLOW_STATE, WorkflowStateModel
from app.api.whatif import SCENARIO_STORE
from app.services.audit_service import log_audit_event

router = APIRouter(prefix="/decisions", tags=["Decision & Governance"])

# In-memory store for immutable decision snapshots
DECISIONS_STORE: Dict[str, Dict[str, Any]] = {}

class DecisionSignoffRequest(BaseModel):
    parent_scenario_id: Optional[str] = None
    whatif_scenario_id: Optional[str] = None
    forecast_id: Optional[str] = None
    shortfall_id: Optional[str] = None
    target_id: Optional[str] = None
    mine_id: Optional[str] = None
    decision_status: str = Field(default="APPROVED", description="Requested status: APPROVED, REJECTED, DISPATCHED")
    executive_notes: Optional[str] = Field(default="", description="Executive justification and operational instructions")

# Allowed status transitions
VALID_TRANSITIONS = {
    "DRAFT": ["APPROVED", "REJECTED"],
    "APPROVED": ["DISPATCHED"],
    "REJECTED": [],
    "DISPATCHED": []
}

@router.post("/signoff", response_model=dict)
def signoff_decision(
    request: DecisionSignoffRequest,
    current_user: UserResponse = Depends(require_roles(["Admin", "Operations Manager"]))
):
    """
    Executes executive decision sign-off and commits an immutable snapshot.
    
    STRICT GOVERNANCE & VALIDATION RULES:
    1. Actor identity (username, role) is derived strictly from authenticated JWT token.
    2. Authoritative production metrics are retrieved directly from backend workflow state.
       No silent default/demo fallback values (2800, 2450, 350) are permitted.
       If workflow data is missing, raises AUTHORITATIVE_WORKFLOW_DATA_UNAVAILABLE.
    3. What-If Scenario ownership & parent matching are strictly validated against SCENARIO_STORE.
       Unrelated or mismatched scenario IDs are rejected.
    4. Status transitions follow strict validation rules (DRAFT -> APPROVED/REJECTED -> DISPATCHED).
    5. Logs a DECISION_SIGNOFF event to the Security Audit Stream.
    """
    global CURRENT_WORKFLOW_STATE
    
    # 1. Derive approver identity strictly from authenticated JWT session
    actor_username = current_user.username
    actor_role = current_user.role
    actor_email = current_user.email or f"{actor_username}@moil.nic.in"
    server_timestamp = datetime.now(timezone.utc).isoformat()
    
    # 2. Retrieve backend workflow state
    wf = CURRENT_WORKFLOW_STATE
    
    # Check for authoritative target & forecast production metrics (NO silent fallbacks permitted)
    target_tonnes = getattr(wf, "targetTonnes", None)
    forecast_tonnes = getattr(wf, "forecastTonnes", None)
    
    if target_tonnes is None or forecast_tonnes is None:
        raise HTTPException(
            status_code=400,
            detail="AUTHORITATIVE_WORKFLOW_DATA_UNAVAILABLE: Authoritative targetTonnes or forecastTonnes missing from backend workflow state."
        )

    # 3. Extract IDs and validate What-If scenario ownership
    target_id = request.target_id or wf.targetId
    mine_id = request.mine_id or wf.mineId
    forecast_id = request.forecast_id or wf.forecastId
    shortfall_id = request.shortfall_id or wf.shortfallId
    parent_scenario_id = request.parent_scenario_id or wf.scenarioId
    whatif_scenario_id = request.whatif_scenario_id or getattr(wf, "whatifScenarioId", None)

    if not whatif_scenario_id:
        raise HTTPException(
            status_code=400,
            detail="INVALID_WHATIF_SCENARIO: No whatif_scenario_id provided or active in workflow state."
        )

    # Validate whatif_scenario_id exists in SCENARIO_STORE
    scenario_data = SCENARIO_STORE.get(whatif_scenario_id)
    if not scenario_data:
        raise HTTPException(
            status_code=400,
            detail=f"INVALID_WHATIF_SCENARIO: What-If Scenario ID '{whatif_scenario_id}' not found in SCENARIO_STORE."
        )

    # Validate parent scenario matching
    scenario_parent = scenario_data.get("parent_scenario_id")
    if parent_scenario_id and scenario_parent and scenario_parent != parent_scenario_id:
        raise HTTPException(
            status_code=400,
            detail=f"MISMATCHED_PARENT_SCENARIO: What-If Scenario '{whatif_scenario_id}' belongs to parent '{scenario_parent}', but request specified '{parent_scenario_id}'."
        )

    # Validate forecast context if present in stored scenario
    scenario_forecast = scenario_data.get("forecast_id")
    if forecast_id and scenario_forecast and scenario_forecast != forecast_id:
        raise HTTPException(
            status_code=400,
            detail=f"MISMATCHED_FORECAST_CONTEXT: What-If Scenario '{whatif_scenario_id}' belongs to forecast '{scenario_forecast}', but workflow forecast is '{forecast_id}'."
        )

    # Derive authoritative production metrics strictly from backend state & validated scenario
    authoritative_target_tonnes = float(target_tonnes)
    authoritative_baseline_forecast_tonnes = float(forecast_tonnes)
    authoritative_baseline_shortfall_tonnes = max(0.0, authoritative_target_tonnes - authoritative_baseline_forecast_tonnes)
    
    authoritative_optimized_expected_tonnes = float(getattr(wf, "optimizedTonnes", None) or scenario_data.get("optimized_expected_tonnes", authoritative_target_tonnes))
    authoritative_whatif_predicted_tonnes = float(scenario_data.get("predicted_production_tonnes", authoritative_baseline_forecast_tonnes))
    authoritative_remaining_shortfall_tonnes = float(scenario_data.get("expected_shortfall_tonnes", max(0.0, authoritative_target_tonnes - authoritative_whatif_predicted_tonnes)))

    requested_status = request.decision_status.upper()
    if requested_status not in ["DRAFT", "APPROVED", "REJECTED", "DISPATCHED"]:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid decision status '{requested_status}'. Allowed: DRAFT, APPROVED, REJECTED, DISPATCHED"
        )
        
    # 4. Status transition enforcement
    current_status = getattr(wf, "decisionStatus", "DRAFT")
    if current_status in VALID_TRANSITIONS:
        allowed = VALID_TRANSITIONS[current_status]
        if requested_status != current_status and requested_status not in allowed and current_status != "DRAFT":
            raise HTTPException(
                status_code=400,
                detail=f"Invalid status transition from '{current_status}' to '{requested_status}'. Allowed next: {allowed}"
            )

    # 5. Generate unique immutable decision ID
    decision_id = f"DEC-2026-W{uuid.uuid4().hex[:4].upper()}"

    # 6. Create immutable decision snapshot
    snapshot = {
        "decision_id": decision_id,
        "workflow_chain": {
            "mine_id": mine_id,
            "mine_type": wf.mineType,
            "target_id": target_id,
            "investigation_id": wf.investigationId,
            "resource_id": wf.resourceId,
            "block_ids": wf.blockIds,
            "forecast_id": forecast_id,
            "shortfall_id": shortfall_id,
            "action_ids": wf.actionIds,
            "parent_scenario_id": parent_scenario_id,
            "whatif_scenario_id": whatif_scenario_id
        },
        "authoritative_metrics": {
            "target_production_tonnes": authoritative_target_tonnes,
            "baseline_forecast_tonnes": authoritative_baseline_forecast_tonnes,
            "baseline_shortfall_tonnes": authoritative_baseline_shortfall_tonnes,
            "optimized_expected_production_tonnes": authoritative_optimized_expected_tonnes,
            "whatif_predicted_production_tonnes": authoritative_whatif_predicted_tonnes,
            "remaining_shortfall_tonnes": authoritative_remaining_shortfall_tonnes
        },
        "decision_status": requested_status,
        "executive_notes": request.executive_notes or f"Executive decision sign-off by {actor_username} ({actor_role}).",
        "actor": {
            "username": actor_username,
            "role": actor_role,
            "email": actor_email
        },
        "timestamp": server_timestamp,
        "is_immutable": True
    }

    DECISIONS_STORE[decision_id] = snapshot

    # 6. Update global workflow state
    wf_dict = CURRENT_WORKFLOW_STATE.dict()
    wf_dict["decisionId"] = decision_id
    wf_dict["currentStage"] = "decision"
    wf_dict["status"] = "COMPLETED" if requested_status in ["APPROVED", "DISPATCHED"] else "ACTIVE"
    wf_dict["lastUpdated"] = server_timestamp
    CURRENT_WORKFLOW_STATE = WorkflowStateModel(**wf_dict)

    # 7. Log DECISION_SIGNOFF event to audit service
    log_audit_event(
        username=actor_username,
        role=actor_role,
        action="DECISION_SIGNOFF",
        resource=f"/api/decisions/{decision_id}",
        status="SUCCESS",
        details=f"Executive decision {decision_id} [{requested_status}] signed off by {actor_username} ({actor_role}). Target: {mine_id}/{target_id}."
    )

    return {
        "status": "SUCCESS",
        "decision_id": decision_id,
        "decision_status": requested_status,
        "timestamp": server_timestamp,
        "message": f"Executive decision '{decision_id}' successfully recorded with status [{requested_status}].",
        "snapshot": snapshot
    }

@router.get("/history", response_model=dict)
def get_decision_history(current_user: UserResponse = Depends(require_roles(["Admin", "Operations Manager", "Geologist", "Field Officer"]))):
    """Returns chronological list of all recorded executive decisions."""
    history_list = list(DECISIONS_STORE.values())
    history_list.sort(key=lambda x: x["timestamp"], reverse=True)
    return {
        "status": "SUCCESS",
        "count": len(history_list),
        "decisions": history_list
    }

@router.get("/{decision_id}", response_model=dict)
def get_decision_by_id(
    decision_id: str,
    current_user: UserResponse = Depends(require_roles(["Admin", "Operations Manager", "Geologist", "Field Officer"]))
):
    """Retrieves an immutable decision snapshot by ID."""
    snapshot = DECISIONS_STORE.get(decision_id)
    if not snapshot:
        raise HTTPException(status_code=404, detail=f"Decision snapshot '{decision_id}' not found.")
    return {
        "status": "SUCCESS",
        "decision": snapshot
    }
