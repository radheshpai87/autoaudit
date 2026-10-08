import type { DefectClass, FaultTrend, Inspection, ManufacturingBatch } from "./types";

export function statusCounts(rows: Inspection[]) {
  return rows.reduce((counts, row) => {
    counts[row.status] += 1;
    return counts;
  }, { PASS: 0, REVIEW: 0, REJECT: 0 });
}

export function toCsv(rows: Inspection[]) {
  const quote = (value: string) => `"${value.replaceAll('"', '""')}"`;
  return ["Part ID,Batch ID,Production line,Machine,Time,Defect class,Severity,Disposition", ...rows.map((row) => [row.id, row.batchId, row.line, row.machine, row.time, row.review?.finalClass ?? row.defect, row.severity, row.review?.finalDisposition ?? row.status].map((value) => quote(String(value))).join(","))].join("\n");
}

export function effectiveClasses(row: Inspection): DefectClass[] {
  if (row.review) return [row.review.finalClass];
  if (row.detections.length) return [...new Set(row.detections.map((detection) => detection.className))];
  return row.defect === "None detected" ? [] : [row.defect];
}

export function defectCounts(rows: Inspection[]): Array<{ defectClass: DefectClass; count: number; percent: number }> {
  const count = new Map<DefectClass, number>();
  for (const row of rows) for (const defectClass of effectiveClasses(row)) count.set(defectClass, (count.get(defectClass) ?? 0) + 1);
  const total = [...count.values()].reduce((sum, value) => sum + value, 0);
  return [...count.entries()].map(([defectClass, value]) => ({ defectClass, count: value, percent: total ? value / total * 100 : 0 })).sort((a, b) => b.count - a.count);
}

export function calculateFaultTrends(rows: Inspection[], batches: ManufacturingBatch[]): FaultTrend[] {
  const classes = [...new Set(rows.flatMap(effectiveClasses))];
  return classes.map((defectClass) => {
    const countsByBatch = batches.map((batch) => {
      const batchRows = rows.filter((row) => row.batchId === batch.id);
      const count = batchRows.filter((row) => effectiveClasses(row).includes(defectClass)).length;
      return { batchId: batch.id, count, inspected: batchRows.length, ratePercent: batchRows.length ? count / batchRows.length * 100 : 0 };
    });
    const previous = countsByBatch.at(-2); const current = countsByBatch.at(-1);
    const changePercentPoints = previous && current ? current.ratePercent - previous.ratePercent : 0;
    const direction: FaultTrend["direction"] = changePercentPoints >= 5 ? "Investigation Recommended" : changePercentPoints >= 2 ? "Increasing" : changePercentPoints > 0 ? "Monitor" : "Stable";
    const machineId = rows.filter((row) => effectiveClasses(row).includes(defectClass)).reduce<Record<string, number>>((counts, row) => { counts[row.machine] = (counts[row.machine] ?? 0) + 1; return counts; }, {});
    const associatedMachine = Object.entries(machineId).sort((a, b) => b[1] - a[1])[0]?.[0];
    return { defectClass, countsByBatch, direction, changePercentPoints, machineId: associatedMachine };
  }).sort((a, b) => (b.countsByBatch.at(-1)?.count ?? 0) - (a.countsByBatch.at(-1)?.count ?? 0));
}

export function filteredTrend(trend: FaultTrend, range: number) {
  return trend.countsByBatch.slice(-range);
}
