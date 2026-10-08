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
