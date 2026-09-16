from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any, Optional
from pydantic import BaseModel

router = APIRouter()

# Schema for Target Handoff
class DrillTargetHandoff(BaseModel):
    id: str
    target_id: str
    name: str
    rank: int
    priority_level: str
    prospectivity_score: float
    confidence_pct: float
    applicability: str
    area_sqkm: float
    latitude: float
    longitude: float
    predicted_grade: str
    geology_match: str
    recommended_action: str
    evidence: Dict[str, Any]
    scientific_safety_note: str

TARGETS_FIXTURE = [
    {
        "id": "Target-1",
        "target_id": "Target-1",
        "name": "Target 1",
        "rank": 1,
        "priority_level": "Very High",
        "prospectivity_score": 0.92,
        "confidence_pct": 86.0,
        "applicability": "HIGH",
        "area_sqkm": 12.8,
        "latitude": 21.84,
        "longitude": 80.72,
        "predicted_grade": "28.4% - 34.7% Mn",
        "geology_match": "High (Mansar Formation Quartzite / Mn Ore)",
        "recommended_action": "Priority diamond core verification drillhole recommended at (21.84 N, 80.72 E).",
        "evidence": {
            "cem_anomaly": 0.88,
            "structural_lineament_density": 0.81,
            "geophysics_gravity": 0.62,
            "geochemistry_mn_ppm": 2840.0,
            "sar_polarization_ratio": 0.68,
            "dem_slope_deg": 12.6
        },
        "scientific_safety_note": "Priority exploration target - Requires field validation."
    },
    {
        "id": "Target-3",
        "target_id": "Target-3",
        "name": "Target 3",
        "rank": 2,
        "priority_level": "Very High",
        "prospectivity_score": 0.87,
        "confidence_pct": 84.0,
        "applicability": "HIGH",
        "area_sqkm": 10.4,
        "latitude": 21.91,
        "longitude": 79.82,
        "predicted_grade": "26.1% - 32.0% Mn",
        "geology_match": "High (Tirodi Gneiss Shear Zone)",
        "recommended_action": "Geophysical survey and 95m incline drillhole recommended.",
        "evidence": {
            "cem_anomaly": 0.82,
            "structural_lineament_density": 0.76,
            "geophysics_gravity": 0.58,
            "geochemistry_mn_ppm": 2420.0,
            "sar_polarization_ratio": 0.64,
            "dem_slope_deg": 11.2
        },
        "scientific_safety_note": "Priority exploration target - Requires field validation."
    },
    {
        "id": "Target-2",
        "target_id": "Target-2",
        "name": "Target 2",
        "rank": 3,
        "priority_level": "High",
        "prospectivity_score": 0.76,
        "confidence_pct": 79.0,
        "applicability": "HIGH",
        "area_sqkm": 14.2,
        "latitude": 21.68,
        "longitude": 79.92,
        "predicted_grade": "22.0% - 28.5% Mn",
        "geology_match": "Medium (Chorbaoli Formation)",
        "recommended_action": "Outcrop geological mapping & geochemical trenching recommended.",
        "evidence": {
            "cem_anomaly": 0.74,
            "structural_lineament_density": 0.69,
            "geophysics_gravity": 0.52,
            "geochemistry_mn_ppm": 1950.0,
            "sar_polarization_ratio": 0.58,
            "dem_slope_deg": 9.8
        },
        "scientific_safety_note": "Priority exploration target - Requires field validation."
    },
    {
        "id": "Target-4",
        "target_id": "Target-4",
        "name": "Target 4",
        "rank": 4,
        "priority_level": "High",
        "prospectivity_score": 0.69,
        "confidence_pct": 74.0,
        "applicability": "MEDIUM",
        "area_sqkm": 9.7,
        "latitude": 21.62,
        "longitude": 80.31,
        "predicted_grade": "19.5% - 24.8% Mn",
        "geology_match": "Medium (Sausar Group Contact)",
        "recommended_action": "Ground magnetics survey to resolve structural uncertainty.",
        "evidence": {
            "cem_anomaly": 0.61,
            "structural_lineament_density": 0.62,
            "geophysics_gravity": 0.48,
            "geochemistry_mn_ppm": 1620.0,
            "sar_polarization_ratio": 0.52,
            "dem_slope_deg": 8.4
        },
        "scientific_safety_note": "Priority exploration target - Requires field validation."
    },
    {
        "id": "Target-5",
        "target_id": "Target-5",
        "name": "Target 5",
        "rank": 5,
        "priority_level": "Medium",
        "prospectivity_score": 0.58,
        "confidence_pct": 68.0,
        "applicability": "LOW",
        "area_sqkm": 11.3,
        "latitude": 21.78,
        "longitude": 80.12,
        "predicted_grade": "15.0% - 20.2% Mn",
        "geology_match": "Moderate (Bichua Formation)",
        "recommended_action": "Reconnaissance stream sediment sampling (Applicability domain LOW).",
        "evidence": {
            "cem_anomaly": 0.45,
            "structural_lineament_density": 0.48,
            "geophysics_gravity": 0.41,
            "geochemistry_mn_ppm": 1280.0,
            "sar_polarization_ratio": 0.46,
            "dem_slope_deg": 7.1
        },
        "scientific_safety_note": "Priority exploration target - Requires field validation."
    }
]

@router.get("/targets", response_model=List[DrillTargetHandoff])
def get_targets():
    return TARGETS_FIXTURE

@router.get("/targets/{target_id}", response_model=DrillTargetHandoff)
def get_target(target_id: str):
    for t in TARGETS_FIXTURE:
        if t["target_id"].lower() == target_id.lower() or t["id"].lower() == target_id.lower():
            return t
    return TARGETS_FIXTURE[0]

@router.get("/targets/{target_id}/explain")
def explain_target(target_id: str):
    target = get_target(target_id)
    return {
        "target_id": target["target_id"],
        "mean_prospectivity": target["prospectivity_score"],
        "confidence_pct": target["confidence_pct"],
        "applicability": target["applicability"],
        "evidence_summary": target["evidence"],
        "shap_summary": [
            {"feature": "dist_chem_km", "contribution": 0.476, "direction": "positive"},
            {"feature": "nearest_mno_pct", "contribution": 0.165, "direction": "positive"},
            {"feature": "cem_anomaly", "contribution": 0.142, "direction": "positive"},
            {"feature": "soil_moisture", "contribution": 0.076, "direction": "positive"},
            {"feature": "structural_lineaments", "contribution": 0.051, "direction": "positive"}
        ],
        "explanation_type": "Multi-Source Evidence Model Attribution (Not direct causality)",
        "scientific_safety_note": "Priority exploration target - Requires field validation."
    }
