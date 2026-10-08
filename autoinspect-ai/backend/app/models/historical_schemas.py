from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Tuple


class HistoricalDefectPoint(BaseModel):
    defect_type: str
    process_code: str
    severity: str
    confidence: float
    component_type: str = Field(default="brake_rotor", description="'brake_rotor' or 'car_bonnet'")
    dx_normalized: float = Field(default=0.0, description="Normalized delta X from disc center (-0.5 to +0.5)")
    dy_normalized: float = Field(default=0.0, description="Normalized delta Y from disc center (-0.5 to +0.5, negative is top)")
    r_normalized: float = Field(default=0.0, description="Normalized radial distance from hub center (0.0 to 0.5)")
    theta_degrees: float = Field(default=0.0, description="Clock angle in degrees (0 = 12 o'clock, 90 = 3 o'clock)")
    clock_hour: float = Field(default=12.0, description="Clock hour position (e.g. 1.0 = 1 o'clock, 6.0 = 6 o'clock)")
    panel_x_normalized: Optional[float] = Field(default=None, description="Normalized panel X coordinate (0.0 to 1.0) for car bonnet")
    panel_y_normalized: Optional[float] = Field(default=None, description="Normalized panel Y coordinate (0.0 to 1.0) for car bonnet")
    zone_name: str = Field(default="Swept Friction Band", description="Rotor or Bonnet zone description")
    area_pct: float
    bbox: List[float] = Field(default_factory=list)
    mask_polygon: Optional[List[List[float]]] = None


class HistoricalInspectionRecord(BaseModel):
    id: Optional[int] = None
    part_id: str
    component_type: str = Field(default="brake_rotor", description="'brake_rotor' or 'car_bonnet'")
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
    component_type: str = Field(default="brake_rotor", description="'brake_rotor' or 'car_bonnet'")
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
    dx: float = 0.0
    dy: float = 0.0
    r_bin: float = 0.0
    theta_bin: float = 0.0
    clock_hour: float = 12.0
    panel_x: Optional[float] = None
    panel_y: Optional[float] = None
    die_zone: Optional[str] = None
    component_type: str = "brake_rotor"
    intensity: float
    defect_count: int
    top_process_code: str
    defect_type: str
    bbox: List[float] = Field(default_factory=list)
    mask_polygon: Optional[List[List[float]]] = None
    area_pct: float = 0.5


class MachineHeatmapData(BaseModel):
    machine_code: str
    station: str
    component_type: str = "brake_rotor"
    total_samples: int
    total_defects: int
    bins: List[HeatmapBin]
    raw_points: List[HistoricalDefectPoint] = Field(default_factory=list)
    signature_summary: str


class HistoricalAnalyticsResponse(BaseModel):
    component_type: str = "brake_rotor"
    supported_components: List[str] = Field(default_factory=lambda: ["brake_rotor", "car_bonnet"])
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
