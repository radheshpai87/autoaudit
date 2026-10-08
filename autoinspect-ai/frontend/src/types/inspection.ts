export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical'

export type OverallStatus = 'PASS' | 'REVIEW' | 'REJECT'

export type RotorCondition = 'GOOD' | 'ALMOST_WORN' | 'FAULTY'

export type AnomalyOrigin = 'surface_level' | 'thermal' | 'unknown'

export interface ConditionClassification {
  condition: RotorCondition
  confidence: number
  probabilities: Record<string, number>
  wear_index_score: number
  triage_verdict: string
}

export interface FMEAEvaluation {
  station: string
  process_code: string
  potential_failure_mode: string
  potential_failure_effects: string
  potential_causes: string
  severity_s: number
  occurrence_o: number
  detection_d: number
  rpn: number
  rpn_rank_tier: string
  recommended_action: string
  current_control_detection?: string
  associated_quality_defect?: string
}

export interface ProductionLineFMEASummary {
  paper_reference: string
  system_title: string
  critical_station: string
  highest_rpn: number
  max_severity_s: number
  rpn_priority_tier: string
  line_decision: string
  dtv_tolerance_status: string
  runout_tolerance_status: string
  parallelism_tolerance_status: string
  dtv_value_um?: number
  runout_value_um?: number
  parallelism_value_um?: number
  sensor_integration_note?: string
  recommended_process_adjustments: string[]
}

export interface DefectDetection {
  defect_type: string
  confidence: number
  severity: SeverityLevel
  bbox: [number, number, number, number]
  area_percentage: number
  location?: string
  mask_polygon?: [number, number][]
  is_unknown_anomaly?: boolean
  anomaly_origin?: AnomalyOrigin
  explanation?: string
  recommendation?: string
  fmea?: FMEAEvaluation
}

export interface InspectionResponse {
  image_id: string
  status: 'completed' | 'failed' | 'no_defect'
  overall_status: OverallStatus
  defect_count: number
  detections: DefectDetection[]
  condition_classification: ConditionClassification
  primary_anomaly_origin?: AnomalyOrigin | null
  top_fmea_risk?: FMEAEvaluation
  fmea_quality_control?: ProductionLineFMEASummary
  inference_mode: 'real_ai' | 'demo_mock'
  model_name: string
  summary_message: string
  image_width: number
  image_height: number
  annotated_image_base64?: string
  mask_overlay_base64?: string
  brake_component_type?: string
}

export interface HealthResponse {
  status: string
  version: string
  app_name: string
  inference_mode: 'real_ai' | 'demo_mock'
  model_loaded: boolean
  weights_path?: string
}

export interface MachineSignatureWarning {
  machine_code: string
  station: string
  failure_mode: string
  potential_causes: string
  confidence: number
  spatial_signature: string
  severity_level: 'warning' | 'critical'
  alert_message: string
  recommended_action: string
  evidence_count: number
  recent_trend_slope: number
}

export interface HeatmapBin {
  dx: number
  dy: number
  r_bin: number
  theta_bin: number
  clock_hour: number
  intensity: number
  defect_count: number
  top_process_code: string
  defect_type: string
}

export interface MachineHeatmapData {
  machine_code: string
  station: string
  total_samples: number
  total_defects: number
  bins: HeatmapBin[]
  raw_points?: any[]
  signature_summary: string
}

export interface HistoricalInspectionItem {
  id?: number
  part_id: string
  timestamp: string
  image_filename: string
  overall_status: string
  defect_count: number
  condition: string
  wear_index_score: number
  dtv_value_um: number
  runout_value_um: number
  parallelism_value_um: number
  highest_rpn: number
  primary_process_code?: string | null
  station?: string | null
  defects: {
    defect_type: string
    process_code: string
    severity: string
    confidence: number
    dx_normalized?: number
    dy_normalized?: number
    r_normalized: number
    theta_degrees: number
    clock_hour?: number
    zone_name?: string
    area_pct: number
    bbox: number[]
  }[]
}

export interface HistoricalAnalyticsResponse {
  total_inspections: number
  pass_rate: number
  reject_rate: number
  review_rate: number
  records: HistoricalInspectionItem[]
  active_early_warnings: MachineSignatureWarning[]
  machine_heatmaps: Record<string, MachineHeatmapData>
  time_series: {
    timestamp: string
    part_id: string
    dtv_um: number
    runout_um: number
    parallelism_um: number
    rpn: number
    status: string
    defect_count: number
    process_code: string
    wear_index: number
  }[]
  latest_inspected_defect?: any
  latest_machine_code?: string | null
  collection_status_message?: string
}

