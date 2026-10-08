import type { DefectClass, Inspection, Machine, ManufacturingBatch, ProductionLine } from "./types";
import { defectCounts } from "./calculations";

const crack = { id: "d-1047-1", className: "Surface Crack" as const, confidence: 0.94, region: "Outer friction track", bbox: [400, 127, 453, 200] as [number, number, number, number], severity: "Critical" as const };

const initialInspections: Inspection[] = [
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
  { id: "BATCH_2026_B123", total: 50, passed: 45, needsReview: 3, rejected: 2, flaggedRate: 10 },
  { id: "BATCH_2026_B124", total: 50, passed: 44, needsReview: 4, rejected: 2, flaggedRate: 12 },
  { id: "BATCH_2026_B125", total: 52, passed: 44, needsReview: 5, rejected: 3, flaggedRate: 15.4 },
  { id: "BATCH_2026_B126", total: 48, passed: 41, needsReview: 4, rejected: 3, flaggedRate: 14.6 },
  { id: "BATCH_2026_B127", total: 50, passed: 37, needsReview: 5, rejected: 8, flaggedRate: 26 },
];

const classTargets: Record<string, Partial<Record<DefectClass, number>>> = {
  BATCH_2026_B123: { "Surface Crack": 2, Scratch: 2, Pitting: 1 },
  BATCH_2026_B124: { "Surface Crack": 3, Scratch: 2, Pitting: 2, Inclusion: 1 },
  BATCH_2026_B125: { "Surface Crack": 5, Scratch: 3, Pitting: 2, Inclusion: 1 },
  BATCH_2026_B126: { "Surface Crack": 6, Scratch: 4, Pitting: 2, Inclusion: 1, "Casting Defect": 1 },
  BATCH_2026_B127: { "Surface Crack": 11, Scratch: 3, Scoring: 2, Pitting: 3, Inclusion: 2, "Casting Defect": 1, "Chipping / edge damage": 2 },
};

function makeDetection(partId: string, defectClass: DefectClass, index: number) {
  const region = defectClass === "Surface Crack" || defectClass === "Scratch" || defectClass === "Scoring" ? "Outer Friction Boundary" : defectClass === "Inclusion" ? "Bolt-Hole Region" : defectClass === "Casting Defect" ? "Ventilation Region" : "Rotor Hat / Hub";
  return { id: `d-${partId}-${index}`, className: defectClass as import("./types").DefectClass, confidence: .76 + ((index * 7) % 20) / 100, region, bbox: [400, 127, 453, 200] as [number, number, number, number], severity: "Medium" as const };
}

function buildDemoRecords(): Inspection[] {
  const all: Inspection[] = [];
  for (const batch of demoBatches) {
    const existing = initialInspections.filter((row) => row.batchId === batch.id);
    const present = { PASS: existing.filter((row) => row.status === "PASS").length, REVIEW: existing.filter((row) => row.status === "REVIEW").length, REJECT: existing.filter((row) => row.status === "REJECT").length };
    const extraStatuses: Inspection["status"][] = [
      ...Array(Math.max(0, batch.passed - present.PASS)).fill("PASS" as const),
      ...Array(Math.max(0, batch.needsReview - present.REVIEW)).fill("REVIEW" as const),
      ...Array(Math.max(0, batch.rejected - present.REJECT)).fill("REJECT" as const),
    ];
    const generated: Inspection[] = Array.from({ length: Math.max(0, batch.total - existing.length) }, (_, index) => {
      const id = `BD-${batch.id.slice(-3)}-${String(index + 1).padStart(3, "0")}`;
      const status = extraStatuses[index] ?? "PASS";
      const machineId = ["M-01", "M-02", "M-03", "M-04"][index % 4];
      const line = machineId === "M-01" ? "Line 01 · High-speed" : machineId === "M-02" ? "Line 02 · Standard" : "Line 03 · Precision";
      return { id, batchId: batch.id, model: batch.id === "BATCH_2026_B125" ? "Carbon-Ceramic Track Rotor" : "Ventilated 340mm Sport Rotor", line, machine: machineId, station: machineId === "M-04" ? "Station 03 · Thermal Processing" : "Optical / machining station", time: `${String(9 + Math.floor(index / 60)).padStart(2, "0")}:${String(index % 60).padStart(2, "0")}:00`, defect: "None detected", severity: "None", status, confidence: 0, detections: [] };
    });
    let rows = [...existing, ...generated];
    let detectionIndex = 0;
    for (const [className, targetCount] of Object.entries(classTargets[batch.id] ?? {})) {
      const detectedRows = rows.filter((row) => row.detections.some((detection) => detection.className === className));
      const missing = Math.max(0, targetCount - detectedRows.length);
      for (let index = 0; index < missing; index += 1) {
        const eligible = rows.filter((row) => row.status !== "PASS" && !row.detections.some((detection) => detection.className === className));
        if (className === "Surface Crack") eligible.sort((a, b) => Number(b.status === "REJECT") - Number(a.status === "REJECT"));
        const candidate = eligible.find((row) => row.id.startsWith("BD-" + batch.id.slice(-3)));
        const fallback = eligible[0];
        const target = candidate ?? fallback;
        if (!target) break;
        detectionIndex += 1;
        const detection = makeDetection(target.id, className as DefectClass, detectionIndex);
        rows = rows.map((row) => row.id !== target.id ? row : { ...row, machine: className === "Surface Crack" ? "M-04" : row.machine, line: className === "Surface Crack" ? "Line 03 · Precision" : row.line, defect: row.defect === "None detected" ? className as DefectClass : row.defect, severity: className === "Surface Crack" || row.detections.some((d) => d.className === "Surface Crack") ? "Critical" : "Medium", confidence: detection.confidence, detections: [...row.detections, detection] });
      }
    }
    all.push(...rows);
  }
  return all;
}

export const seedInspections: Inspection[] = buildDemoRecords();

export const productionLines: ProductionLine[] = [
  { id: "Line 01", name: "High-speed", station: "Machining · Cell A", status: "Operational", inspected: 1024, yield: 98.9 },
  { id: "Line 02", name: "Standard", station: "Machining · Cell B", status: "Operational", inspected: 846, yield: 97.4 },
  { id: "Line 03", name: "Precision", station: "Casting / Thermal", status: "Requires attention", inspected: 611, yield: 96.8 },
];

export const machines: Machine[] = [
  { id: "M-01", station: "CNC face machining", line: "Line 01", status: "Operational", recentParts: 412, flaggedRate: 1.8, telemetry: { temperatureC: 181.2, referenceLimitC: 210, pressureBar: 6.1, vibrationMmS: 1.8, cycleSeconds: 42, rpm: 920 } },
  { id: "M-02", station: "Finish machining", line: "Line 02", status: "Operational", recentParts: 387, flaggedRate: 3.2, telemetry: { temperatureC: 193.4, referenceLimitC: 210, pressureBar: 6.4, vibrationMmS: 2.1, cycleSeconds: 48, rpm: 740 } },
  { id: "M-03", station: "Optical inspection", line: "Line 03", status: "Operational", recentParts: 522, flaggedRate: 2.1, telemetry: { temperatureC: 188.1, referenceLimitC: 210, pressureBar: 6.0, vibrationMmS: 1.4, cycleSeconds: 9, rpm: 0 } },
  { id: "M-04", station: "Station 03 · Thermal Processing", line: "Line 03", status: "Investigate", recentParts: 238, flaggedRate: 12.6, telemetry: { temperatureC: 234.5, referenceLimitC: 210, pressureBar: 6.8, vibrationMmS: 3.7, cycleSeconds: 56, rpm: 680 } },
];

export const defectDistribution = (batchId: string) => defectCounts(seedInspections.filter((row) => row.batchId === batchId));

export const engineeringRule = {
  id: "ROTOR_CRACK_01",
  version: "demo-v1.2",
  description: "Crack-like region overlaps the configured critical friction-track boundary.",
  evidence: ["Defect area ratio: 4.8% (demonstration value)", "Crack length: 148 px (image-space only)", "Critical boundary intersection: Yes"],
};
