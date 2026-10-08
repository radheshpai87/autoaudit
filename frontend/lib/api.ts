import type { Inspection, InspectorReview } from "./types";

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
    bbox: [number, number, number, number];
    area_percentage: number;
    location?: string;
    explanation?: string;
    recommendation?: string;
  }>;
}

export async function uploadAndInspectImage(file: File): Promise<InspectApiResponse> {
  const formData = new FormData();
  formData.append("image", file);
  const response = await fetch("/api/py/inspect", { method: "POST", body: formData });
  if (!response.ok) throw new Error(`Inference failed with status ${response.status}`);
  return response.json() as Promise<InspectApiResponse>;
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
