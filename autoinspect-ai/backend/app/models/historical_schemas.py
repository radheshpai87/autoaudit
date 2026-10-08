from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Tuple
from datetime import datetime


class HistoricalDefectPoint(BaseModel):
    defect_type: str
    process_code: str
    severity: str
    confidence: float
    r_normalized: float = Field(..., description="Normalized radial distance from hub center (0.0 to 1.0)")
    theta_degrees: float = Field(..., description="Angular position in degrees (0 to 360)")
    area_pct: float
    bbox: List[float]


class HistoricalInspectionRecord(BaseModel):
    id: Optional[int] = None
    part_id: str
    timestamp: str
    image_filename: str
    overall_status: str
    defect_count: int
    condition: str
    wear_index_score: float
    dtv_value_um: float
    runout_value_um: float
    parallelism_value_um: float
    highest_rpn: int
    primary_process_code: Optional[str] = None
    station: Optional[str] = None
    defects: List[HistoricalDefectPoint] = Field(default_factory=list)


class MachineSignatureWarning(BaseModel):
    machine_code: str
    station: str
    failure_mode: str
    potential_causes: str
    confidence: float
    spatial_signature: str
    severity_level: str  # "warning" or "critical"
    alert_message: str
    recommended_action: str
    evidence_count: int
    recent_trend_slope: float


class HeatmapBin(BaseModel):
    r_bin: float
    theta_bin: float
    intensity: float
    defect_count: int
    top_process_code: str


class MachineHeatmapData(BaseModel):
    machine_code: str
    station: str
    total_samples: int
    total_defects: int
    bins: List[HeatmapBin]
    signature_summary: str


class HistoricalAnalyticsResponse(BaseModel):
    total_inspections: int
    pass_rate: float
    reject_rate: float
    review_rate: float
    records: List[HistoricalInspectionRecord]
    active_early_warnings: List[MachineSignatureWarning]
    machine_heatmaps: Dict[str, MachineHeatmapData]
    time_series: List[Dict[str, Any]]
