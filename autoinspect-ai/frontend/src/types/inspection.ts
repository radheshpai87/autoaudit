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
}

export interface InspectionResponse {
  image_id: string
  status: 'completed' | 'failed' | 'no_defect'
  overall_status: OverallStatus
  defect_count: number
  detections: DefectDetection[]
  condition_classification: ConditionClassification
  primary_anomaly_origin?: AnomalyOrigin | null
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
