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


class FMEAEvaluation(BaseModel):
    station: str = Field(..., description="Production line station from research paper: Grinding Station, Balancing Station, Picking-up Station, or Inspection Station")
    process_code: str = Field(..., description="FMEA Process Code from research paper (e.g. DT17, DT15, DT16, DT13, DT18, DT14, BA02, PU01, IN01, CR01)")
    potential_failure_mode: str = Field(..., description="Potential failure mode identified in FMEA")
    potential_failure_effects: str = Field(..., description="Effect on braking performance (DTV, runout, steering pulsation, uneven wear)")
    potential_causes: str = Field(..., description="Root cause / mechanism from research paper (e.g., CBN wheel wear, bearing anti-backlash, clamping pressure, coolant ratio)")
    severity_s: int = Field(..., ge=1, le=10, description="Severity score S (1-10) from FMEA datasheet")
    occurrence_o: int = Field(..., ge=1, le=10, description="Occurrence score O (1-10) from production line data")
    detection_d: int = Field(..., ge=1, le=10, description="Detection score D (1-10) based on current process control inspection")
    rpn: int = Field(..., description="Risk Priority Number = S * O * D (range 1-1000)")
    rpn_rank_tier: str = Field(..., description="RPN Rank Tier from paper: 'Top 1-5 (Critical)', 'Top 6-10 (High)', 'Top 11-15 (Medium)', or 'Top 16+ (Low)'")
    recommended_action: str = Field(..., description="Rule-based recommended corrective action from research paper decision table")
    current_control_detection: str = Field(..., description="Current process control detection method from research paper")
    associated_quality_defect: str = Field(..., description="Quality defect category from paper: DTV, Runout, Parallelism, or Surface Roughness")


class ProductionLineFMEASummary(BaseModel):
    paper_reference: str = Field(default="Applied Sciences 2020, 10, 6565 (Febriani, Park, Lee)")
    system_title: str = Field(default="Rule-Based Quality Control System for Brake Disc Production Lines")
    critical_station: str = Field(..., description="Station requiring highest priority maintenance action")
    highest_rpn: int = Field(..., description="Maximum Risk Priority Number across detected failure modes")
    max_severity_s: int = Field(..., description="Maximum Severity score (1-10)")
    rpn_priority_tier: str = Field(..., description="Top RPN priority rank tier")
    line_decision: str = Field(..., description="Production line action: REJECT & STOP LINE, REWORK / PROCESS ADJUSTMENT, MONITOR & REVIEW, or ACCEPT")
    dtv_tolerance_status: str = Field(default="≤ 5 µm (Pass)", description="Disc Thickness Variation status")
    runout_tolerance_status: str = Field(default="≤ 25 µm (Pass)", description="Runout tolerance limit status")
    parallelism_tolerance_status: str = Field(default="≤ 40 µm (Pass)", description="Parallelism tolerance status")
    dtv_value_um: float = Field(default=2.1, description="Measured/correlated DTV in micrometers (limit ≤ 5 µm)")
    runout_value_um: float = Field(default=11.4, description="Measured/correlated Runout in micrometers (limit ≤ 25 µm)")
    parallelism_value_um: float = Field(default=16.2, description="Measured/correlated Parallelism in micrometers (limit ≤ 40 µm)")
    sensor_integration_note: str = Field(
        default="Top-view optical vision detects 2D surface anomalies (cracks, scoring, cavities); DTV and Parallelism are measured via automated 12-point contact displacement probes at the final gauge station (per Appl. Sci. 2020, 10, 6565, Section 3).",
        description="Explanation of multi-sensor fusion: top-down camera vs contact thickness probes"
    )
    recommended_process_adjustments: List[str] = Field(default_factory=list, description="List of rule-based corrective maintenance actions")


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
    fmea: Optional[FMEAEvaluation] = Field(
        default=None,
        description="FMEA severity and rule-based decision metrics based on Applied Sciences 2020, 10, 6565"
    )


class InspectionResponse(BaseModel):
    image_id: str
    batch_id: Optional[str] = None
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
    top_fmea_risk: Optional[FMEAEvaluation] = Field(
        default=None,
        description="Highest priority FMEA failure mode risk from Applied Sciences 2020, 10, 6565"
    )
    fmea_quality_control: Optional[ProductionLineFMEASummary] = Field(
        default=None,
        description="Production line FMEA summary and rule-based quality control decision from Applied Sciences 2020, 10, 6565"
    )
    inference_mode: str = Field(..., description="'real_ai' or 'demo_mock' so the UI clearly reflects real vs mock")
    model_name: str
    summary_message: str
    image_width: int
    image_height: int
    annotated_image_base64: Optional[str] = None
    mask_overlay_base64: Optional[str] = None
    heatmap_overlay_base64: Optional[str] = None
    raw_image_url: Optional[str] = None
    annotated_image_url: Optional[str] = None
    heatmap_image_url: Optional[str] = None
    brake_component_type: str = Field(default="Ventilated Brake Disc Rotor", description="Component classification")


class HealthResponse(BaseModel):
    status: str
    version: str
    app_name: str
    inference_mode: str
    model_loaded: bool
    weights_path: Optional[str] = None
