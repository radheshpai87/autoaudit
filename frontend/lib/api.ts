import type { FMEAEvaluation, Inspection, InspectorReview, ProductionLineFMEASummary } from "./types";
export type { FMEAEvaluation, ProductionLineFMEASummary } from "./types";

export interface AutoAuditApi {
  listInspections(): Promise<Inspection[]>;
  getInspection(id: string): Promise<Inspection | undefined>;
  saveReview(id: string, review: InspectorReview): Promise<void>;
}

// Mock provider is the active adapter until service endpoints are available.
export const mockApi: AutoAuditApi = {
  async listInspections() { const { seedInspections } = await import("./mock-data"); return structuredClone(seedInspections); },
  async getInspection(id) { return (await this.listInspections()).find((item) => item.id === id); },
  async saveReview() { return Promise.resolve(); },
};

// Proposed future contract; these endpoints are not assumed to exist yet.
export const httpApi: AutoAuditApi = {
  async listInspections() { const response = await fetch("/api/inspections"); if (!response.ok) throw new Error("Could not load inspections"); return response.json() as Promise<Inspection[]>; },
  async getInspection(id) { const response = await fetch(`/api/inspections/${encodeURIComponent(id)}`); if (response.status === 404) return undefined; if (!response.ok) throw new Error("Could not load inspection"); return response.json() as Promise<Inspection>; },
  async saveReview(id, review) { const response = await fetch("/api/reviews", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ partId: id, ...review }) }); if (!response.ok) throw new Error("Could not save review"); },
};

export const autoAuditApi: AutoAuditApi = process.env.NEXT_PUBLIC_AUTOAUDIT_API === "http" ? httpApi : mockApi;

export interface InspectApiResponse {
  image_id: string;
  status: "completed" | "failed" | "no_defect";
  overall_status: "PASS" | "REVIEW" | "REJECT";
  defect_count: number;
  inference_mode: "real_ai" | "demo_mock";
  model_name: string;
  summary_message: string;
  annotated_image_base64?: string;
  mask_overlay_base64?: string;
  image_width: number;
  image_height: number;
  brake_component_type?: string;
  primary_anomaly_origin?: "thermal" | "surface_level" | "unknown" | null;
  top_fmea_risk?: FMEAEvaluation | null;
  fmea_quality_control?: ProductionLineFMEASummary | null;
  condition_classification: {
    condition: "GOOD" | "ALMOST_WORN" | "FAULTY";
    confidence: number;
    wear_index_score: number;
    triage_verdict: string;
  };
  detections: Array<{
    defect_type: string;
    confidence: number;
    severity: "low" | "medium" | "high" | "critical";
    is_unknown_anomaly?: boolean;
    bbox: [number, number, number, number];
    area_percentage: number;
    location?: string;
    mask_polygon?: Array<[number, number]> | null;
    explanation?: string;
    recommendation?: string;
    fmea?: FMEAEvaluation | null;
  }>;
}

export interface MachineHeatmapBin {
  dx: number;
  dy: number;
  r_bin: number;
  theta_bin: number;
  clock_hour: number;
  intensity: number;
  defect_count: number;
  top_process_code: string;
  defect_type: string;
  bbox?: number[];
  mask_polygon?: number[][] | null;
  area_pct?: number;
  severity?: string;
  image_width?: number | null;
  image_height?: number | null;
}

export interface MachineHeatmapData {
  machine_code: string;
  station: string;
  total_samples: number;
  total_defects: number;
  bins: MachineHeatmapBin[];
  signature_summary: string;
}

export interface MachineSignatureWarning {
  machine_code: string;
  station: string;
  failure_mode: string;
  potential_causes: string;
  confidence: number;
  spatial_signature: string;
  severity_level: "warning" | "critical";
  alert_message: string;
  recommended_action: string;
  evidence_count: number;
  recent_trend_slope: number;
}

export interface HistoricalInspectionRecord {
  id?: number;
  part_id: string;
  timestamp: string;
  image_filename: string;
  overall_status: "PASS" | "REVIEW" | "REJECT" | string;
  defect_count: number;
  condition: string;
  wear_index_score: number;
  dtv_value_um: number;
  runout_value_um: number;
  parallelism_value_um: number;
  highest_rpn: number;
  primary_process_code?: string | null;
  station?: string | null;
  defects: Array<{
    defect_type: string;
    process_code: string;
    severity: string;
    confidence: number;
    dx_normalized: number;
    dy_normalized: number;
    r_normalized: number;
    theta_degrees: number;
    clock_hour: number;
    zone_name: string;
    area_pct: number;
    bbox: number[];
    mask_polygon?: number[][] | null;
  }>;
}

export interface HistoricalAnalyticsResponse {
  total_inspections: number;
  pass_rate: number;
  reject_rate: number;
  review_rate: number;
  records: HistoricalInspectionRecord[];
  active_early_warnings: MachineSignatureWarning[];
  machine_heatmaps: Record<string, MachineHeatmapData>;
  time_series: Array<{
    timestamp: string;
    part_id?: string;
    dtv_um?: number;
    runout_um?: number;
    parallelism_um?: number;
    rpn?: number;
    status?: string;
    defect_count?: number;
    process_code?: string;
    wear_index?: number;
    defect_rate?: number;
  }>;
  latest_inspection_record?: HistoricalInspectionRecord | null;
  latest_inspected_defect?: HistoricalInspectionRecord["defects"][number] | null;
  latest_machine_code?: string | null;
  latest_conveyor_status?: string;
  collection_status_message?: string;
}

export async function fetchHistoricalAnalytics(): Promise<HistoricalAnalyticsResponse> {
  const response = await fetch("/api/py/analytics", { cache: "no-store" });
  if (!response.ok) throw new Error(`Analytics request failed (${response.status})`);
  return response.json() as Promise<HistoricalAnalyticsResponse>;
}

export async function fetchInspectionHistory(limit = 100): Promise<HistoricalInspectionRecord[]> {
  const response = await fetch(`/api/py/history?limit=${encodeURIComponent(String(limit))}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`History request failed (${response.status})`);
  const records = await response.json() as unknown;
  if (!Array.isArray(records)) throw new Error("History endpoint returned an invalid response.");
  return records as HistoricalInspectionRecord[];
}

export async function uploadAndInspectImage(file: File): Promise<InspectApiResponse> {
  const formData = new FormData();
  formData.append("image", file);
  const response = await fetch("/api/py/inspect", { method: "POST", body: formData });
  if (!response.ok) throw new Error(`Inference failed with status ${response.status}`);
  const body = await response.json() as Partial<InspectApiResponse>;
  if (!body || typeof body.image_id !== "string" || !["completed", "failed", "no_defect"].includes(body.status ?? "") || !["PASS", "REVIEW", "REJECT"].includes(body.overall_status ?? "") || typeof body.model_name !== "string" || !Array.isArray(body.detections) || !Number.isFinite(body.image_width) || !Number.isFinite(body.image_height) || (body.image_width ?? 0) <= 0 || (body.image_height ?? 0) <= 0) {
    throw new Error("The backend returned an invalid inspection response (missing image dimensions or detection data).");
  }
  if (body.detections.some((detection) => !Array.isArray(detection.bbox) || detection.bbox.length !== 4 || !detection.bbox.every(Number.isFinite) || detection.bbox[2] <= detection.bbox[0] || detection.bbox[3] <= detection.bbox[1] || !Number.isFinite(detection.confidence))) {
    throw new Error("The backend returned invalid detection coordinates. No annotations were drawn.");
  }
  if (body.defect_count !== body.detections.length) {
    throw new Error("The backend defect count did not match its detection list. No incomplete annotations were shown.");
  }
  return body as InspectApiResponse;
}

export async function checkBackendHealth(): Promise<{ isOnline: boolean; mode: string }> {
  try {
    const response = await fetch("/api/py/health", { signal: AbortSignal.timeout(5000) });
    if (!response.ok) return { isOnline: false, mode: "offline" };
    const data = await response.json() as { inference_mode?: string };
    return { isOnline: true, mode: data.inference_mode ?? "unknown" };
  } catch {
    return { isOnline: false, mode: "offline" };
  }
}

export interface WhatsAppDirectoryEntry {
  name: string;
  phone: string;
  station: string;
}

export interface WhatsAppStatusResponse {
  isConnected: boolean;
  qrDataUrl: string | null;
  directory: Record<string, WhatsAppDirectoryEntry>;
  senderMatchesExpected?: boolean | null;
}

export async function fetchWhatsAppStatus(): Promise<WhatsAppStatusResponse> {
  try {
    const response = await fetch("/api/whatsapp/status", { cache: "no-store" });
    if (!response.ok) return { isConnected: false, qrDataUrl: null, directory: {} };
    return await response.json() as WhatsAppStatusResponse;
  } catch {
    return { isConnected: false, qrDataUrl: null, directory: {} };
  }
}

export async function dispatchWhatsAppAlert(payload: {
  phone?: string;
  stationKey: string;
  station: string;
  failureMode: string;
  rpn?: number;
  probability?: string;
  action: string;
  partId?: string;
}): Promise<{ success: boolean; error?: string; recipientName?: string; dispatchId?: string }> {
  const response = await fetch("/api/whatsapp/send-alert", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await response.json() as { success?: boolean; error?: string; recipientName?: string; dispatchId?: string };
  if (!response.ok) return { success: false, error: body.error ?? `Dispatch failed (${response.status})` };
  return { success: body.success === true, error: body.error, recipientName: body.recipientName, dispatchId: body.dispatchId };
}
