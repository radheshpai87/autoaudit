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
