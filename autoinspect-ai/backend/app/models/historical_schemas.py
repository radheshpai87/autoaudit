from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Tuple


class HistoricalDefectPoint(BaseModel):
    defect_type: str
    process_code: str
    severity: str
    confidence: float
    dx_normalized: float = Field(..., description="Normalized delta X from disc center (-0.5 to +0.5)")
    dy_normalized: float = Field(..., description="Normalized delta Y from disc center (-0.5 to +0.5, negative is top)")
    r_normalized: float = Field(..., description="Normalized radial distance from hub center (0.0 to 0.5)")
    theta_degrees: float = Field(..., description="Clock angle in degrees (0 = 12 o'clock, 90 = 3 o'clock)")
    clock_hour: float = Field(..., description="Clock hour position (e.g. 1.0 = 1 o'clock, 6.0 = 6 o'clock)")
    zone_name: str = Field(default="Swept Friction Band", description="Rotor zone description")
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
    dx: float
    dy: float
    r_bin: float
    theta_bin: float
    clock_hour: float
    intensity: float
    defect_count: int
    top_process_code: str
    defect_type: str


class MachineHeatmapData(BaseModel):
    machine_code: str
    station: str
    total_samples: int
    total_defects: int
    bins: List[HeatmapBin]
    raw_points: List[HistoricalDefectPoint] = Field(default_factory=list)
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
    latest_inspection_record: Optional[HistoricalInspectionRecord] = None
    latest_inspected_defect: Optional[HistoricalDefectPoint] = None
    latest_machine_code: Optional[str] = None
    latest_conveyor_status: str = ""
    collection_status_message: str = ""
