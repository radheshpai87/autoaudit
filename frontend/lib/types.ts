export type Disposition = "PASS" | "REVIEW" | "REJECT";
export type Severity = "Low" | "Medium" | "High" | "Critical";
export type DefectClass = "Surface Crack" | "Scratch" | "Scoring" | "Pitting" | "Inclusion" | "Casting Defect" | "Machining Defect" | "Unknown Anomaly" | "Chipping / edge damage";

export interface BrakeDisc {
  id: string;
  batchId: string;
  model: string;
  line: string;
  machineId: string;
}

export interface DefectDetection {
  id: string;
  className: DefectClass;
  confidence: number;
  region: string;
  bbox: [number, number, number, number];
  severity: Severity;
}

export interface InspectorReview {
  reviewer: string;
  timestamp: string;
  originalClass: DefectClass;
  finalClass: DefectClass;
  originalDisposition: Disposition;
  finalDisposition: Disposition;
  notes: string;
  reason: string;
}

export interface EngineeringAssessment {
  severity: Severity;
  disposition: Disposition;
  ruleId: string;
  ruleDescription: string;
  defectAreaRatioPercent?: number;
  lengthPx?: number;
  criticalBoundaryIntersection?: boolean;
  provisional: boolean;
}

export interface MechanicalExplanation {
  defectClass: DefectClass;
  whatItIs: string;
  principle: string;
  possibleContributors: string[];
  potentialEffect: string;
  suggestedAction: string;
}

export interface Inspection {
  id: string;
  batchId: string;
  model: string;
  line: string;
  machine: string;
  time: string;
  defect: DefectClass | "None detected";
  severity: Severity | "None";
  status: Disposition;
  confidence: number;
  detections: DefectDetection[];
  station?: string;
  mechanicalExplanation?: MechanicalExplanation;
  assessment?: EngineeringAssessment;
  review?: InspectorReview;
}

export interface ManufacturingBatch {
  id: string;
  total: number;
  passed: number;
  needsReview: number;
  rejected: number;
  flaggedRate: number;
}

export interface ProductionLine {
  id: string;
  name: string;
  station: string;
  status: "Operational" | "Requires attention";
  inspected: number;
  yield: number;
}

export interface ProcessTelemetry {
  temperatureC: number;
  referenceLimitC: number;
  pressureBar: number;
  vibrationMmS: number;
  cycleSeconds: number;
  rpm: number;
}

export interface Machine {
  id: string;
  station: string;
  line: string;
  status: "Operational" | "Investigate";
  recentParts: number;
  flaggedRate: number;
  telemetry: ProcessTelemetry;
}

export interface AuditLog {
  id: string;
  partId: string;
  action: string;
  actor: string;
  timestamp: string;
  details: string;
}

export interface FMEAEvaluation {
  station?: string;
  station_origin?: string;
  process_code?: string;
  potential_failure_mode?: string;
  failure_mode?: string;
  potential_failure_effects?: string;
  visual_effect_code?: string;
  potential_causes?: string;
  machine_root_cause_reason?: string;
  severity_s: number;
  occurrence_o: number;
  detection_d: number;
  rpn: number;
  rpn_rank_tier?: string;
  priority_tier?: "Priority 1 (Critical)" | "Priority 2 (High)" | "Priority 3 (Medium)" | "Priority 4 (Low)" | string;
  recommended_action?: string;
  station_action?: string;
  current_control_detection?: string;
  associated_quality_defect?: string;
}

export interface ProductionLineFMEASummary {
  paper_reference: string;
  system_title: string;
  critical_station: string;
  highest_rpn: number;
  max_severity_s: number;
  rpn_priority_tier: string;
  line_decision: string;
  dtv_tolerance_status: string;
  runout_tolerance_status: string;
  parallelism_tolerance_status: string;
  dtv_value_um: number;
  runout_value_um: number;
  parallelism_value_um: number;
  sensor_integration_note: string;
  recommended_process_adjustments: string[];
}

export interface QualityAlert {
  id: string;
  severity: "Info" | "Monitor" | "Warning";
  title: string;
  detail: string;
  batchId?: string;
  machineId?: string;
}

export interface FaultTrend {
  defectClass: DefectClass;
  countsByBatch: Array<{ batchId: string; count: number; ratePercent: number; inspected: number }>;
  direction: "Stable" | "Monitor" | "Increasing" | "Investigation Recommended";
  changePercentPoints: number;
  machineId?: string;
}

export type HumanReview = InspectorReview;
export type AuditEntry = AuditLog;

export interface InspectionUploadLog {
  id: string;
  fileName: string;
  uploadedAt: string;
  component: string;
  result: Disposition;
  condition: string;
  conditionConfidence: number;
  wearIndex: number;
  defectCount: number;
  inferenceMode: string;
  modelName: string;
  summary: string;
  thumbnailDataUrl: string;
  defectType: string;
  confidence: number;
  stationOrigin?: string;
  rpn?: number;
  requiresHumanReview?: boolean;
  topFmeaRisk?: FMEAEvaluation | null;
  fmeaQualityControl?: ProductionLineFMEASummary | null;
  detections: Array<{
    defectType: string;
    confidence: number;
    severity: string;
    bbox: [number, number, number, number];
    areaPercentage: number;
    location?: string;
    explanation?: string;
    recommendation?: string;
    maskPolygon?: Array<[number, number]>;
    fmea?: FMEAEvaluation | null;
  }>;
}
