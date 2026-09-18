from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
import uuid

router = APIRouter(prefix="/workflow", tags=["Workflow State"])

class WorkflowStateModel(BaseModel):
    mineId: str = Field(default="MN-BAL-001", description="Active MOIL Mine ID")
    mineType: str = Field(default="Underground & Opencast", description="Mine operational type")
    targetId: str = Field(default="MN-TGT-001", description="Active diamond core drill target ID")
    investigationId: str = Field(default="INV-2026-001", description="Field investigation log ID")
    resourceId: str = Field(default="RES-BAL-001", description="3D JORC resource estimation model ID")
    blockIds: List[str] = Field(default_factory=lambda: ["BLK-BAL-01", "BLK-BAL-02", "BLK-BAL-03"], description="Associated mine blocks")
    forecastId: str = Field(default="FC-2026-04", description="ShortfallShield production forecast ID")
    shortfallId: str = Field(default="SF-2026-012", description="Production shortfall alert ID")
    actionIds: List[str] = Field(default_factory=lambda: ["ACT-001", "ACT-002"], description="Selected corrective actions")
    scenarioId: str = Field(default="SCN-OPTIMAL-01", description="Prescriptive optimizer scenario ID")
    whatifScenarioId: Optional[str] = Field(default="SCN-2026-W001", description="Active What-If scenario ID")
    decisionId: str = Field(default="DEC-2026-88", description="Executive sign-off decision ID")
    latitude: Optional[float] = Field(default=21.84, description="Selected location latitude")
    longitude: Optional[float] = Field(default=80.72, description="Selected location longitude")
    prospectivityScore: Optional[float] = Field(default=0.92, description="Selected location prospectivity score")
    
    # Authoritative production metrics (set by workflow pipeline)
    targetTonnes: Optional[float] = Field(default=2800.0, description="Authoritative target production tonnes")
    forecastTonnes: Optional[float] = Field(default=2450.0, description="Authoritative baseline forecast tonnes")
    shortfallTonnes: Optional[float] = Field(default=350.0, description="Authoritative baseline shortfall tonnes")
    optimizedTonnes: Optional[float] = Field(default=2760.0, description="Authoritative MILP optimized tonnes")
    
    currentStage: str = Field(default="home", description="Current active stage in end-to-end workflow")
    completedStages: List[str] = Field(default_factory=lambda: ["home"], description="List of completed stage keys")
    status: str = Field(default="ACTIVE", description="Workflow lifecycle status: ACTIVE, COMPLETED, PAUSED")
    lastUpdated: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

# Global in-memory workflow state store
CURRENT_WORKFLOW_STATE = WorkflowStateModel()

class UpdateWorkflowRequest(BaseModel):
    mineId: Optional[str] = None
    mineType: Optional[str] = None
    targetId: Optional[str] = None
    investigationId: Optional[str] = None
    resourceId: Optional[str] = None
    blockIds: Optional[List[str]] = None
    forecastId: Optional[str] = None
    shortfallId: Optional[str] = None
    actionIds: Optional[List[str]] = None
    scenarioId: Optional[str] = None
    whatifScenarioId: Optional[str] = None
    decisionId: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    prospectivityScore: Optional[float] = None
    targetTonnes: Optional[float] = None
    forecastTonnes: Optional[float] = None
    shortfallTonnes: Optional[float] = None
    optimizedTonnes: Optional[float] = None
    currentStage: Optional[str] = None
    completedStages: Optional[List[str]] = None
    status: Optional[str] = None

class InitializeWorkflowRequest(BaseModel):
    mineId: Optional[str] = "MN-BAL-001"
    targetId: Optional[str] = "MN-TGT-001"

@router.get("/state", response_model=dict)
def get_workflow_state():
    """Retrieve the current end-to-end workflow state and sequential stage tracking IDs."""
    return {
        "status": "success",
        "workflow": CURRENT_WORKFLOW_STATE.dict()
    }

@router.post("/state", response_model=dict)
def update_workflow_state(payload: UpdateWorkflowRequest):
    """Update workflow state parameters and advance completed stage trackers."""
    global CURRENT_WORKFLOW_STATE
    data = payload.dict(exclude_unset=True)
    
    current_data = CURRENT_WORKFLOW_STATE.dict()
    for key, val in data.items():
        if val is not None:
            current_data[key] = val
            
    # Auto-add currentStage to completedStages if not already present
    if "currentStage" in data and data["currentStage"]:
        if data["currentStage"] not in current_data["completedStages"]:
            current_data["completedStages"].append(data["currentStage"])
            
    current_data["lastUpdated"] = datetime.utcnow().isoformat()
    CURRENT_WORKFLOW_STATE = WorkflowStateModel(**current_data)
    
    return {
        "status": "success",
        "message": "Workflow state updated successfully",
        "workflow": CURRENT_WORKFLOW_STATE.dict()
    }

@router.post("/initialize", response_model=dict)
def initialize_workflow(payload: InitializeWorkflowRequest):
    """Initialize or reset guided workflow session starting from HOME / Exploration CTA."""
    global CURRENT_WORKFLOW_STATE
    
    session_num = uuid.uuid4().hex[:6].upper()
    new_state = WorkflowStateModel(
        mineId=payload.mineId or "MN-BAL-001",
        mineType="Underground & Opencast",
        targetId=payload.targetId or f"MN-TGT-{session_num[:3]}",
        investigationId=f"INV-2026-{session_num[:4]}",
        resourceId=f"RES-BAL-{session_num[:3]}",
        blockIds=["BLK-BAL-01", "BLK-BAL-02", "BLK-BAL-03"],
        forecastId=f"FC-2026-{session_num[:2]}",
        shortfallId=f"SF-2026-{session_num[:3]}",
        actionIds=["ACT-001", "ACT-002"],
        scenarioId="SCN-OPTIMAL-01",
        decisionId=f"DEC-2026-{session_num[:4]}",
        currentStage="explore",
        completedStages=["home", "explore"],
        status="ACTIVE",
        lastUpdated=datetime.utcnow().isoformat()
    )
    CURRENT_WORKFLOW_STATE = new_state
    
    return {
        "status": "success",
        "message": "Workflow initialized for exploration run",
        "workflow": CURRENT_WORKFLOW_STATE.dict()
    }
