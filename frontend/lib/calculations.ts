import type { Inspection } from "./types";

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
