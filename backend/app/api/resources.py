from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any, Optional
from pydantic import BaseModel

from app.api.targets import get_target, TARGETS_FIXTURE
from app.api.drilling import IN_MEMORY_ASSAYS
from app.ml.resource_estimation import ResourceEstimator

router = APIRouter()
estimator = ResourceEstimator()

class ResourceEstimateResponse(BaseModel):
    target_id: str
    resource_id: str
    resource_classification: str
    area_sqkm: float
    modeled_thickness_m: float
    bulk_density_t_m3: float
    gross_in_situ_tonnes: float
    estimated_mn_grade_pct: float
    estimated_fe_grade_pct: float
    resource_hierarchy: Dict[str, float]
    estimation_method: str
    data_provenance: str
    resource_note: str

@router.get("/resources", response_model=List[ResourceEstimateResponse])
def get_all_resource_estimates():
    """
    Returns geological 3D block model resource estimates for all identified drill targets.
    """
    results = []
    for t in TARGETS_FIXTURE:
        tid = t["target_id"]
        area = t.get("area_sqkm", 10.0)
        score = t.get("prospectivity_score", 0.75)
        assays = [a for a in IN_MEMORY_ASSAYS if a.get("target_id") == tid]
        est = estimator.estimate_target_resource(tid, area, score, assays)
        results.append(est)
    return results

@router.get("/resources/{target_id}", response_model=ResourceEstimateResponse)
def get_resource_estimate_by_target(target_id: str):
    """
    Returns geological 3D block model resource estimate for a specific target ID.
    """
    target = get_target(target_id)
    tid = target["target_id"]
    area = target.get("area_sqkm", 10.0)
    score = target.get("prospectivity_score", 0.75)
    assays = [a for a in IN_MEMORY_ASSAYS if a.get("target_id") == tid]
    return estimator.estimate_target_resource(tid, area, score, assays)
