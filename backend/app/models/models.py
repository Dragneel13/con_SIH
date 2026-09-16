from sqlalchemy import Column, String, Boolean, DateTime, Numeric, Integer, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from geoalchemy2 import Geometry
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from app.database import Base

class DataSource(Base):
    __tablename__ = "data_sources"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_id = Column(String(100), unique=True, nullable=False)
    dataset_name = Column(String(255), nullable=False)
    provider = Column(String(255))
    source_url = Column(Text)
    data_type = Column(String(50))
    coverage = Column(String(100))
    resolution = Column(String(100))
    crs = Column(String(100), default="EPSG:4326")
    acquisition_date = Column(DateTime)
    version = Column(String(50))
    status = Column(String(50), default="UNAVAILABLE")
    license = Column(String(255))
    availability = Column(Numeric(5, 2))
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

class ModelVersion(Base):
    __tablename__ = "model_versions"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    model_name = Column(String(100), nullable=False)
    version = Column(String(50), nullable=False)
    model_type = Column(String(100))
    module = Column(String(100))
    features = Column(JSONB)
    hyperparameters = Column(JSONB)
    metrics = Column(JSONB)
    training_dataset_version = Column(String(100))
    validation_method = Column(String(100))
    training_date = Column(DateTime)
    mlflow_run_id = Column(String(255))
    status = Column(String(50), default="DEVELOPMENT")
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

class User(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String(100), unique=True, nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    full_name = Column(String(255))
    role = Column(String(50), default="viewer")
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    last_login = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)

class Mine(Base):
    __tablename__ = "mines"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    mine_code = Column(String(50), unique=True, nullable=False)
    mine_name = Column(String(255), nullable=False)
    location_district = Column(String(100))
    location_state = Column(String(100))
    geometry = Column(Geometry("POLYGON", srid=4326))
    centroid = Column(Geometry("POINT", srid=4326))
    area_sqkm = Column(Numeric(10, 4))
    mine_type = Column(String(50))
    depth_m = Column(Numeric(10, 2))
    annual_capacity_mt = Column(Numeric(10, 4))
    operational_status = Column(String(50), default="OPERATIONAL")
    established_year = Column(Integer)
    data_source = Column(String(50), default="PROTOTYPE_SIMULATION")
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

    blocks = relationship("MineBlock", back_populates="mine", cascade="all, delete-orphan")

class MineBlock(Base):
    __tablename__ = "mine_blocks"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    block_code = Column(String(100), nullable=False)
    mine_id = Column(UUID(as_uuid=True), ForeignKey("mines.id", ondelete="CASCADE"))
    geometry = Column(Geometry("POLYGON", srid=4326))
    centroid = Column(Geometry("POINT", srid=4326))
    level_m = Column(Numeric(10, 2))
    estimated_ore_tonnes = Column(Numeric(15, 4))
    estimated_grade_pct = Column(Numeric(8, 4))
    fe_grade_pct = Column(Numeric(8, 4))
    development_percent = Column(Numeric(5, 2), default=0)
    drilling_percent = Column(Numeric(5, 2), default=0)
    blasting_readiness = Column(String(50), default="NOT_READY")
    access_readiness = Column(String(50), default="NOT_READY")
    equipment_available = Column(Boolean, default=False)
    ventilation_status = Column(String(50), default="UNKNOWN")
    water_risk = Column(String(50), default="UNKNOWN")
    infrastructure_status = Column(String(50), default="UNKNOWN")
    readiness_score = Column(Numeric(5, 2))
    block_status = Column(String(50), default="EXPLORATION")
    data_source = Column(String(50), default="PROTOTYPE_SIMULATION")
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

    mine = relationship("Mine", back_populates="blocks")

class MnOccurrence(Base):
    __tablename__ = "mn_occurrences"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    occurrence_id = Column(String(100), unique=True, nullable=False)
    deposit_name = Column(String(255))
    mine_name = Column(String(255))
    geometry = Column(Geometry("POINT", srid=4326))
    latitude = Column(Numeric(12, 8))
    longitude = Column(Numeric(12, 8))
    formation = Column(String(255))
    lithology = Column(String(255))
    ore_type = Column(String(100))
    mn_grade_pct = Column(Numeric(8, 4))
    deposit_type = Column(String(100))
    source = Column(String(255))
    source_year = Column(Integer)
    confidence = Column(String(50), default="HIGH")
    label_type = Column(String(50), default="POSITIVE")
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

class DrillTarget(Base):
    __tablename__ = "drill_targets"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    target_id = Column(String(100), unique=True, nullable=False)
    geometry = Column(Geometry("POLYGON", srid=4326))
    centroid = Column(Geometry("POINT", srid=4326))
    area_sqkm = Column(Numeric(10, 6))
    mean_prospectivity = Column(Numeric(8, 6))
    max_prospectivity = Column(Numeric(8, 6))
    uncertainty = Column(Numeric(8, 6))
    geological_support = Column(String(50))
    structural_support = Column(String(50))
    spectral_support = Column(String(50))
    geochemical_support = Column(String(50))
    geophysical_support = Column(String(50))
    accessibility = Column(String(50), default="UNKNOWN")
    data_completeness = Column(Numeric(5, 2))
    estimated_survey_cost_inr = Column(Numeric(15, 2))
    priority_rank = Column(Integer)
    priority_level = Column(String(50))
    status = Column(String(50), default="IDENTIFIED")
    model_version_id = Column(UUID(as_uuid=True), ForeignKey("model_versions.id"))
    is_prototype = Column(Boolean, default=True)
    shap_summary = Column(JSONB)
    recommended_action = Column(Text)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

# ── CLOSED-LOOP EXPLORATION ENTITIES (Requirement 4) ───────────────────────

class FieldObservation(Base):
    __tablename__ = "field_observations"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    observation_id = Column(String(100), unique=True, nullable=False)
    target_id = Column(String(100), nullable=False)
    latitude = Column(Numeric(12, 8), nullable=False)
    longitude = Column(Numeric(12, 8), nullable=False)
    elevation_m = Column(Numeric(10, 2), default=300.0)
    observer_name = Column(String(255))
    lithology = Column(String(255))
    rock_type = Column(String(100))
    sample_id = Column(String(100))
    photo_url = Column(Text)
    drillhole_id = Column(String(100))
    sync_status = Column(String(50), default="Synced") # "Saved Offline", "Pending Sync", "Synced", "Sync Failed"
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

class Drillhole(Base):
    __tablename__ = "drillholes"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    drillhole_id = Column(String(100), unique=True, nullable=False)
    target_id = Column(String(100), nullable=False)
    latitude = Column(Numeric(12, 8), nullable=False)
    longitude = Column(Numeric(12, 8), nullable=False)
    elevation_m = Column(Numeric(10, 2), default=320.0)
    total_depth_m = Column(Numeric(10, 2), nullable=False)
    dip_deg = Column(Numeric(5, 2), default=-90.0)
    azimuth_deg = Column(Numeric(5, 2), default=0.0)
    drilling_method = Column(String(100), default="Diamond Core")
    status = Column(String(50), default="COMPLETED") # PLANNED, DRILLING, COMPLETED
    drilled_date = Column(DateTime, default=datetime.utcnow)
    contractor = Column(String(255), default="MOIL Exploration Wing")
    notes = Column(Text)

class Sample(Base):
    __tablename__ = "samples"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sample_id = Column(String(100), unique=True, nullable=False)
    drillhole_id = Column(String(100), nullable=False)
    target_id = Column(String(100), nullable=False)
    from_depth_m = Column(Numeric(10, 2), nullable=False)
    to_depth_m = Column(Numeric(10, 2), nullable=False)
    lithology = Column(String(255))
    sample_type = Column(String(100), default="Diamond Core Interval")
    collected_by = Column(String(255))
    collected_date = Column(DateTime, default=datetime.utcnow)
    notes = Column(Text)

class Assay(Base):
    __tablename__ = "assays"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    assay_id = Column(String(100), unique=True, nullable=False)
    sample_id = Column(String(100), nullable=False)
    target_id = Column(String(100), nullable=False)
    mn_grade_pct = Column(Numeric(8, 4), nullable=False)
    fe_grade_pct = Column(Numeric(8, 4), default=8.5)
    sio2_grade_pct = Column(Numeric(8, 4), default=12.4)
    p_grade_pct = Column(Numeric(8, 4), default=0.15)
    recovery_rate_pct = Column(Numeric(5, 2), default=92.5)
    lab_name = Column(String(255), default="MOIL Central Analytical Lab")
    assay_date = Column(DateTime, default=datetime.utcnow)
    certified_by = Column(String(255), default="Dr. A. K. Sharma")

class GroundTruth(Base):
    __tablename__ = "ground_truth"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ground_truth_id = Column(String(100), unique=True, nullable=False)
    target_id = Column(String(100), nullable=False)
    assay_id = Column(String(100), nullable=False)
    validated_mn_pct = Column(Numeric(8, 4), nullable=False)
    is_occurrence = Column(Boolean, default=True)
    validation_status = Column(String(50), default="Pending Validation") # "Pending Validation", "Validated", "Rejected"
    validated_by = Column(String(255))
    validation_date = Column(DateTime)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

class Equipment(Base):
    __tablename__ = "equipment"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    equipment_code = Column(String(100), unique=True, nullable=False)
    mine_id = Column(UUID(as_uuid=True), ForeignKey("mines.id"))
    equipment_type = Column(String(100))
    model_name = Column(String(255))
    manufacturer = Column(String(255))
    capacity_unit = Column(String(50))
    capacity_value = Column(Numeric(10, 2))
    status = Column(String(50), default="OPERATIONAL")
    data_source = Column(String(50), default="PROTOTYPE_SIMULATION")
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

class Production(Base):
    __tablename__ = "production"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    mine_id = Column(UUID(as_uuid=True), ForeignKey("mines.id"))
    block_id = Column(UUID(as_uuid=True), ForeignKey("mine_blocks.id"))
    production_date = Column(DateTime, nullable=False)
    shift = Column(String(20))
    target_tonnes = Column(Numeric(12, 4))
    actual_tonnes = Column(Numeric(12, 4))
    ore_grade_pct = Column(Numeric(8, 4))
    equipment_availability_pct = Column(Numeric(8, 4))
    haulage_cycles = Column(Integer)
    downtime_hours = Column(Numeric(8, 4))
    data_source = Column(String(50), default="PROTOTYPE_SIMULATION")
    created_at = Column(DateTime, default=datetime.utcnow)

class ShortfallPrediction(Base):
    __tablename__ = "shortfall_predictions"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    mine_id = Column(UUID(as_uuid=True), ForeignKey("mines.id"))
    prediction_date = Column(DateTime, nullable=False)
    forecast_period_days = Column(Integer, default=7)
    target_tonnes = Column(Numeric(12, 4))
    predicted_tonnes = Column(Numeric(12, 4))
    expected_gap_tonnes = Column(Numeric(12, 4))
    shortfall_flag = Column(Boolean, default=False)
    risk_score = Column(Numeric(8, 6))
    risk_level = Column(String(50))
    shap_values = Column(JSONB)
    model_version_id = Column(UUID(as_uuid=True), ForeignKey("model_versions.id"))
    is_prototype = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Recommendation(Base):
    __tablename__ = "recommendations"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    recommendation_id = Column(String(100), unique=True, nullable=False)
    action = Column(String(255), nullable=False)
    action_type = Column(String(100))
    reason = Column(Text)
    confidence = Column(Numeric(8, 6))
    expected_benefit = Column(Text)
    affected_mine_id = Column(UUID(as_uuid=True), ForeignKey("mines.id"))
    affected_block_id = Column(UUID(as_uuid=True), ForeignKey("mine_blocks.id"))
    affected_target_id = Column(UUID(as_uuid=True), ForeignKey("drill_targets.id"))
    status = Column(String(50), default="PENDING_REVIEW")
    reviewed_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    reviewed_at = Column(DateTime)
    review_notes = Column(Text)
    is_prototype = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)
