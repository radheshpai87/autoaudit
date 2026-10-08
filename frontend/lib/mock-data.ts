import type { Inspection, Machine, ManufacturingBatch, ProductionLine } from "./types";

const crack = { id: "d-1047-1", className: "Surface Crack" as const, confidence: 0.94, region: "Outer friction track", bbox: [400, 127, 453, 200] as [number, number, number, number], severity: "Critical" as const };

export const seedInspections: Inspection[] = [
  { id: "BD-1047", batchId: "BATCH_2026_B127", model: "Ventilated 340mm Sport Rotor", line: "Line 03 · Precision", machine: "M-04", time: "10:45:12", defect: "Surface Crack", severity: "Critical", status: "REJECT", confidence: 0.94, detections: [crack] },
  { id: "BD-1048", batchId: "BATCH_2026_B127", model: "Ventilated 340mm Sport Rotor", line: "Line 01 · High-speed", machine: "M-01", time: "10:44:30", defect: "None detected", severity: "None", status: "PASS", confidence: 0.997, detections: [] },
  { id: "BD-1049", batchId: "BATCH_2026_B127", model: "Ventilated 340mm Sport Rotor", line: "Line 02 · Standard", machine: "M-02", time: "10:43:02", defect: "Scratch", severity: "Medium", status: "REVIEW", confidence: 0.88, detections: [{ id: "d-1049-1", className: "Scratch", confidence: 0.88, region: "Friction track", bbox: [228, 222, 306, 245], severity: "Medium" }] },
  { id: "BD-1050", batchId: "BATCH_2026_B127", model: "Ventilated 340mm Sport Rotor", line: "Line 03 · Precision", machine: "M-04", time: "10:42:18", defect: "Pitting", severity: "High", status: "REJECT", confidence: 0.91, detections: [{ id: "d-1050-1", className: "Pitting", confidence: 0.91, region: "Rotor hat", bbox: [286, 272, 345, 316], severity: "High" }] },
  { id: "BD-1051", batchId: "BATCH_2026_B127", model: "Ventilated 340mm Sport Rotor", line: "Line 01 · High-speed", machine: "M-01", time: "10:41:36", defect: "None detected", severity: "None", status: "PASS", confidence: 0.991, detections: [] },
  { id: "BD-1052", batchId: "BATCH_2026_B127", model: "Ventilated 340mm Sport Rotor", line: "Line 02 · Standard", machine: "M-02", time: "10:40:55", defect: "Chipping / edge damage", severity: "High", status: "REJECT", confidence: 0.89, detections: [{ id: "d-1052-1", className: "Chipping / edge damage", confidence: 0.89, region: "Outer circumference", bbox: [473, 206, 510, 257], severity: "High" }] },
  { id: "BD-1053", batchId: "BATCH_2026_B127", model: "Ventilated 340mm Sport Rotor", line: "Line 03 · Precision", machine: "M-04", time: "10:39:22", defect: "Inclusion", severity: "Medium", status: "REVIEW", confidence: 0.79, detections: [{ id: "d-1053-1", className: "Inclusion", confidence: 0.79, region: "Bolt-hole region", bbox: [258, 180, 293, 213], severity: "Medium" }] },
  { id: "BD-1054", batchId: "BATCH_2026_B127", model: "Ventilated 340mm Sport Rotor", line: "Line 01 · High-speed", machine: "M-01", time: "10:38:19", defect: "None detected", severity: "None", status: "PASS", confidence: 0.994, detections: [] },
  { id: "BD-1021", batchId: "BATCH_2026_B126", model: "Solid 300mm Urban Rotor", line: "Line 02 · Standard", machine: "M-02", time: "09:54:08", defect: "None detected", severity: "None", status: "PASS", confidence: 0.991, detections: [] },
  { id: "BD-1022", batchId: "BATCH_2026_B126", model: "Solid 300mm Urban Rotor", line: "Line 01 · High-speed", machine: "M-01", time: "09:52:44", defect: "Scratch", severity: "Medium", status: "REVIEW", confidence: 0.82, detections: [{ id: "d-1022-1", className: "Scratch", confidence: 0.82, region: "Friction track", bbox: [228, 222, 306, 245], severity: "Medium" }] },
  { id: "BD-1023", batchId: "BATCH_2026_B126", model: "Solid 300mm Urban Rotor", line: "Line 02 · Standard", machine: "M-02", time: "09:50:31", defect: "None detected", severity: "None", status: "PASS", confidence: 0.995, detections: [] },
  { id: "BD-1024", batchId: "BATCH_2026_B126", model: "Solid 300mm Urban Rotor", line: "Line 01 · High-speed", machine: "M-01", time: "09:48:16", defect: "Casting Defect", severity: "High", status: "REJECT", confidence: 0.9, detections: [{ id: "d-1024-1", className: "Casting Defect", confidence: 0.9, region: "Ventilation region", bbox: [330, 88, 365, 126], severity: "High" }] },
  { id: "BD-0991", batchId: "BATCH_2026_B125", model: "Carbon-Ceramic Track Rotor", line: "Line 03 · Precision", machine: "M-03", time: "08:42:03", defect: "None detected", severity: "None", status: "PASS", confidence: 0.996, detections: [] },
  { id: "BD-0992", batchId: "BATCH_2026_B125", model: "Carbon-Ceramic Track Rotor", line: "Line 03 · Precision", machine: "M-03", time: "08:39:58", defect: "Pitting", severity: "Low", status: "REVIEW", confidence: 0.76, detections: [{ id: "d-0992-1", className: "Pitting", confidence: 0.76, region: "Rotor hat", bbox: [286, 272, 345, 316], severity: "Low" }] },
  { id: "BD-0993", batchId: "BATCH_2026_B125", model: "Carbon-Ceramic Track Rotor", line: "Line 03 · Precision", machine: "M-03", time: "08:37:20", defect: "None detected", severity: "None", status: "PASS", confidence: 0.998, detections: [] },
  { id: "BD-0994", batchId: "BATCH_2026_B125", model: "Carbon-Ceramic Track Rotor", line: "Line 03 · Precision", machine: "M-03", time: "08:35:12", defect: "Scratch", severity: "Medium", status: "REVIEW", confidence: 0.87, detections: [{ id: "d-0994-1", className: "Scratch", confidence: 0.87, region: "Outer circumference", bbox: [473, 206, 510, 257], severity: "Medium" }] },
];

export const demoBatches: ManufacturingBatch[] = [
  { id: "BATCH_2026_B127", total: 50, passed: 37, needsReview: 5, rejected: 8, flaggedRate: 26 },
  { id: "BATCH_2026_B126", total: 48, passed: 41, needsReview: 4, rejected: 3, flaggedRate: 14.6 },
  { id: "BATCH_2026_B125", total: 52, passed: 44, needsReview: 5, rejected: 3, flaggedRate: 15.4 },
];

export const productionLines: ProductionLine[] = [
  { id: "Line 01", name: "High-speed", station: "Machining · Cell A", status: "Operational", inspected: 1024, yield: 98.9 },
  { id: "Line 02", name: "Standard", station: "Machining · Cell B", status: "Operational", inspected: 846, yield: 97.4 },
  { id: "Line 03", name: "Precision", station: "Casting / Thermal", status: "Requires attention", inspected: 611, yield: 96.8 },
];

export const machines: Machine[] = [
  { id: "M-01", station: "CNC face machining", line: "Line 01", status: "Operational", recentParts: 412, flaggedRate: 1.8, telemetry: { temperatureC: 181.2, referenceLimitC: 210, pressureBar: 6.1, vibrationMmS: 1.8, cycleSeconds: 42 } },
  { id: "M-02", station: "Finish machining", line: "Line 02", status: "Operational", recentParts: 387, flaggedRate: 3.2, telemetry: { temperatureC: 193.4, referenceLimitC: 210, pressureBar: 6.4, vibrationMmS: 2.1, cycleSeconds: 48 } },
  { id: "M-03", station: "Optical inspection", line: "Line 03", status: "Operational", recentParts: 522, flaggedRate: 2.1, telemetry: { temperatureC: 188.1, referenceLimitC: 210, pressureBar: 6.0, vibrationMmS: 1.4, cycleSeconds: 9 } },
  { id: "M-04", station: "Station 03 · Casting / thermal processing", line: "Line 03", status: "Investigate", recentParts: 238, flaggedRate: 12.6, telemetry: { temperatureC: 234.5, referenceLimitC: 210, pressureBar: 6.8, vibrationMmS: 3.7, cycleSeconds: 56 } },
];

export const defectDistribution = [
  { name: "Cracks", percent: 40, count: 8 },
  { name: "Chipping / edge damage", percent: 30, count: 6 },
  { name: "Pitting / porosity", percent: 20, count: 4 },
  { name: "Other", percent: 10, count: 2 },
];

export const engineeringRule = {
  id: "RULE_ROTOR_01",
  version: "demo-v1.2",
  description: "Detected crack intersects the configured critical friction-track boundary.",
  evidence: ["Defect area ratio: 4.8% (demonstration value)", "Crack length: 148 px (image-space only)", "Critical boundary intersection: Yes"],
};
