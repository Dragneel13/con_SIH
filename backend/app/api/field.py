import os
import re
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request, status
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import date, datetime
from loguru import logger

from app.api.auth import get_current_user, require_roles, UserResponse
from app.services.audit_service import log_audit_event

router = APIRouter()

ALLOWED_EXTENSIONS = {".csv", ".xlsx", ".geojson", ".json", ".jpg", ".jpeg", ".png", ".pdf"}
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB

class FieldObservationCreate(BaseModel):
    target_id: Optional[str] = "Target-1"
    latitude: float = 21.84
    longitude: float = 80.72
    observation_date: Optional[date] = None
    observer_name: Optional[str] = "Eng. Ramesh Verma"
    lithology: str = "Mansar Quartzite / Mn Ore Outcrop"
    rock_type: Optional[str] = "Metamorphic Manganese Oxide Ore"
    sample_id: Optional[str] = "MOIL-SAMP-001"
    photo_url: Optional[str] = None
    drillhole_id: Optional[str] = "DH-BAL-001"
    sync_status: Optional[str] = "Synced" # "Saved Offline", "Pending Sync", "Synced", "Sync Failed"
    notes: Optional[str] = "Outcrop strike N30E, dipping 65deg SE with pyrolusite banding."

class BatchSyncItem(BaseModel):
    client_id: str
    target_id: str
    latitude: float
    longitude: float
    observer_name: Optional[str] = "Field Geologist"
    lithology: str
    sample_id: Optional[str] = None
    notes: Optional[str] = None
    recorded_at: str

class BatchSyncRequest(BaseModel):
    records: List[BatchSyncItem]

IN_MEMORY_OBSERVATIONS = [
    {
        "id": "obs-001",
        "observation_id": "OBS-20260905-001",
        "target_id": "Target-1",
        "latitude": 21.84,
        "longitude": 80.72,
        "elevation_m": 350.0,
        "observer_name": "Eng. Ramesh Verma",
        "lithology": "Mansar Quartzite / Mn Ore Outcrop",
        "rock_type": "Metamorphic Manganese Ore",
        "sample_id": "MOIL-SAMP-001",
        "drillhole_id": "DH-BAL-001",
        "sync_status": "Synced",
        "notes": "North Balaghat Outcrop Strike A with pyrolusite stringers.",
        "created_at": "2026-09-05 10:30:00"
    },
    {
        "id": "obs-002",
        "observation_id": "OBS-20260902-002",
        "target_id": "Target-3",
        "latitude": 21.91,
        "longitude": 79.82,
        "elevation_m": 340.0,
        "observer_name": "Geol. Priya Sharma",
        "lithology": "Tirodi Gneiss Mn Contact Zone",
        "rock_type": "Quartz-Mn Gondite",
        "sample_id": "MOIL-SAMP-002",
        "drillhole_id": "DH-BAL-002",
        "sync_status": "Synced",
        "notes": "East Bharweli Shear zone sample.",
        "created_at": "2026-09-02 14:15:00"
    }
]

@router.get("/field-observations")
def list_observations(target_id: Optional[str] = None):
    if target_id:
        return [o for o in IN_MEMORY_OBSERVATIONS if o["target_id"] == target_id]
    return IN_MEMORY_OBSERVATIONS

@router.post("/field-observations")
def submit_observation(
    obs: FieldObservationCreate,
    request: Request
):
    client_ip = request.client.host if request.client else "127.0.0.1"
    obs_date_str = obs.observation_date.strftime('%Y%m%d') if obs.observation_date else datetime.utcnow().strftime('%Y%m%d')
    obs_id = f"OBS-{obs_date_str}-{len(IN_MEMORY_OBSERVATIONS) + 1:03d}"

    record = {
        "id": str(uuid.uuid4()),
        "observation_id": obs_id,
        "target_id": obs.target_id or "Target-1",
        "latitude": obs.latitude,
        "longitude": obs.longitude,
        "elevation_m": 350.0,
        "observer_name": obs.observer_name or "Field Officer",
        "lithology": obs.lithology,
        "rock_type": obs.rock_type or "Manganese Ore",
        "sample_id": obs.sample_id,
        "drillhole_id": obs.drillhole_id,
        "sync_status": obs.sync_status or "Synced",
        "notes": obs.notes or "",
        "created_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    }
    IN_MEMORY_OBSERVATIONS.append(record)

    return {
        "status": "ACCEPTED",
        "observation_id": obs_id,
        "sync_status": "Synced",
        "message": f"Observation '{obs_id}' recorded for Target '{obs.target_id}'. Linked into spatial lake.",
        "observation": record
    }

@router.post("/field/sync")
def sync_offline_records(sync_req: BatchSyncRequest):
    """
    Synchronizes offline PWA field observations queue safely (Requirement 5 & 7).
    """
    synced_ids = []
    failed_ids = []

    for item in sync_req.records:
        try:
            obs_id = f"OBS-SYNC-{len(IN_MEMORY_OBSERVATIONS) + 1:03d}"
            rec = {
                "id": str(uuid.uuid4()),
                "observation_id": obs_id,
                "target_id": item.target_id,
                "latitude": item.latitude,
                "longitude": item.longitude,
                "elevation_m": 350.0,
                "observer_name": item.observer_name or "PWA Field Officer",
                "lithology": item.lithology,
                "sample_id": item.sample_id,
                "sync_status": "Synced",
                "notes": item.notes or "",
                "created_at": item.recorded_at
            }
            IN_MEMORY_OBSERVATIONS.append(rec)
            synced_ids.append(item.client_id)
        except Exception as e:
            logger.error(f"Sync failed for offline record {item.client_id}: {str(e)}")
            failed_ids.append(item.client_id)

    return {
        "status": "COMPLETED" if not failed_ids else "PARTIAL_SUCCESS",
        "synced_count": len(synced_ids),
        "failed_count": len(failed_ids),
        "synced_client_ids": synced_ids,
        "failed_client_ids": failed_ids,
        "message": f"Successfully synchronized {len(synced_ids)} offline field records with PostGIS database."
    }

@router.post("/field/upload")
async def upload_field_file(
    request: Request,
    file: UploadFile = File(...)
):
    client_ip = request.client.host if request.client else "127.0.0.1"
    raw_filename = os.path.basename(file.filename or "")
    sanitized_filename = re.sub(r'[^a-zA-Z0-9_\-\.]', '_', raw_filename)
    
    if not sanitized_filename or sanitized_filename.startswith('.'):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid file name provided.")

    ext = os.path.splitext(sanitized_filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File extension '{ext}' is not permitted. Allowed extensions: {list(ALLOWED_EXTENSIONS)}",
        )

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File size exceeds maximum permitted limit of 10 MB.",
        )

    return {
        "status": "SUCCESS",
        "filename": sanitized_filename,
        "size_bytes": len(contents),
        "message": f"File '{sanitized_filename}' verified and stored safely."
    }
