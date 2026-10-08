from pydantic import BaseModel, Field
from typing import List, Optional, Literal, Tuple, Dict
from enum import Enum


class SeverityLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class InspectionOverallStatus(str, Enum):
    PASS = "PASS"
    REVIEW = "REVIEW"
    REJECT = "REJECT"


class RotorConditionClass(str, Enum):
    GOOD = "GOOD"
    ALMOST_WORN = "ALMOST_WORN"
    FAULTY = "FAULTY"


class AnomalyOrigin(str, Enum):
    SURFACE = "surface_level"      # Roll marks, inclusions, oil spots, water stains, surface pits, scratches
    THERMAL = "thermal"            # Thermal fatigue crack, heat checking fissure, cementite hot spot
    UNKNOWN = "unknown"            # Unclassified geometric anomaly or low confidence pattern


class ConditionClassification(BaseModel):
    condition: RotorConditionClass = Field(
        ...,
        description="Brake disc triage condition: GOOD (serviceable), ALMOST_WORN (near discard thickness/minor scoring), or FAULTY (cracked, heat damaged, condemned)"
    )
    confidence: float = Field(..., description="Classification probability score between 0.0 and 1.0")
    probabilities: Dict[str, float] = Field(
        default_factory=dict,
        description="Multi-class softmax/SVM probabilities for GOOD, ALMOST_WORN, and FAULTY"
    )
    wear_index_score: float = Field(
        ...,
        description="Quantified wear & damage index between 0.0 (factory new) and 100.0 (critically failed)"
    )
    triage_verdict: str = Field(..., description="High-level engineering triage summary")


class BoundingBox(BaseModel):
    x1: float
    y1: float
    x2: float
    y2: float


class DefectDetection(BaseModel):
    defect_type: str = Field(..., description="Brake disc defect class: Thermal Crack, Radial Crack, Deep Scoring / Grooving, Oxidation Corrosion, Hot Spot / Heat Checking, Pitting / Cavitation, Flange Distortion, Unknown Anomaly")
    confidence: float = Field(..., description="Confidence score between 0.0 and 1.0")
    severity: SeverityLevel = Field(..., description="Calculated severity: low, medium, high, or critical")
    bbox: List[float] = Field(..., description="Bounding box [x1, y1, x2, y2] in pixel coordinates")
    area_percentage: float = Field(..., description="Percentage of brake rotor surface area occupied by defect")
    location: Optional[str] = Field(default="Friction Ring", description="Specific brake disc zone: Outer Friction Ring, Inner Hub Hat, Cooling Vane / Edge, Mounting Bore")
    mask_polygon: Optional[List[List[float]]] = Field(default=None, description="Segmentation mask polygon [[x, y], ...]")
    is_unknown_anomaly: bool = Field(default=False, description="True if marked as unknown anomaly due to low classification confidence")
    anomaly_origin: AnomalyOrigin = Field(
        default=AnomalyOrigin.THERMAL,
        description="Triage origin of the anomaly: 'surface_level', 'thermal', or 'unknown'"
    )
    
    # Brake-specific engineering diagnosis & explanation
    explanation: Optional[str] = Field(
        default=None,
        description="Engineering explanation of why this defect occurred and the risk to vehicle braking performance"
    )
    recommendation: Optional[str] = Field(
        default=None,
        description="Recommended workshop/QA action: immediate replacement, resurfacing/lathe skim, pad inspection, or monitoring"
    )


class InspectionResponse(BaseModel):
    image_id: str
    status: Literal["completed", "failed", "no_defect"] = "completed"
    overall_status: InspectionOverallStatus
    defect_count: int
    detections: List[DefectDetection]
    condition_classification: ConditionClassification = Field(
        ...,
        description="Trained 3-class classifier result: GOOD vs ALMOST_WORN vs FAULTY"
    )
    primary_anomaly_origin: Optional[AnomalyOrigin] = Field(
        default=None,
        description="Overall triage origin of detected anomalies: 'surface_level', 'thermal', or 'unknown'"
    )
    inference_mode: str = Field(..., description="'real_ai' or 'demo_mock' so the UI clearly reflects real vs mock")
    model_name: str
    summary_message: str
    image_width: int
    image_height: int
    annotated_image_base64: Optional[str] = None
    mask_overlay_base64: Optional[str] = None
    brake_component_type: str = Field(default="Ventilated Brake Disc Rotor", description="Component classification")


class HealthResponse(BaseModel):
    status: str
    version: str
    app_name: str
    inference_mode: str
    model_loaded: bool
    weights_path: Optional[str] = None
