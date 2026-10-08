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
