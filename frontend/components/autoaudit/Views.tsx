"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { uploadAndInspectImage, type InspectApiResponse } from "../../lib/api";
import { getStoredInspection } from "../../lib/inspection-store";
import type { FMEAEvaluation, InspectionUploadLog } from "../../lib/types";

type ViewName = "Main Dashboard" | "AI Inspection Studio" | "Inspection History" | "Batch Data" | "Fault Intelligence Board" | "Human Review";
type Props = { view: ViewName; uploadLogs: InspectionUploadLog[]; selectedPart: string; setSelectedPart: (id: string) => void; navigate: (view: ViewName, partId?: string) => void; backendOnline: boolean; inferenceMode: string; onInspectionCreated: (response: InspectApiResponse, thumbnailDataUrl: string, file: File) => void | Promise<void> };

function fmeaFailure(fmea: FMEAEvaluation) { return fmea.potential_failure_mode ?? fmea.failure_mode ?? "Failure mode"; }
function fmeaStation(fmea: FMEAEvaluation) { return fmea.station ?? fmea.station_origin ?? "Station not supplied"; }
function fmeaTier(fmea: FMEAEvaluation) { return fmea.rpn_rank_tier ?? fmea.priority_tier ?? "Priority unavailable"; }
function fmeaAction(fmea: FMEAEvaluation) { return fmea.recommended_action ?? fmea.station_action ?? "No corrective action supplied"; }
function isHighRiskFmea(fmea: FMEAEvaluation) {
  const tier = `${fmea.rpn_rank_tier ?? ""} ${fmea.priority_tier ?? ""}`.toLowerCase();
  return /critical|high|priority\s*[12]|top\s*(1-5|6-10)/.test(tier);
}
function needsHumanReview(entry: InspectionUploadLog) {
  const highRisk = Boolean(entry.topFmeaRisk && isHighRiskFmea(entry.topFmeaRisk)) || entry.detections.some((item) => Boolean(item.fmea && isHighRiskFmea(item.fmea))) || /priority\s*[12]|critical|high/i.test(entry.fmeaQualityControl?.rpn_priority_tier ?? "") || /reject|stop line/i.test(entry.fmeaQualityControl?.line_decision ?? "");
  return highRisk || entry.requiresHumanReview === true || entry.detections.some((item) => /unknown anomaly/i.test(item.defectType) || item.confidence < 0.5);
}
function fmeaTone(fmea: FMEAEvaluation) { const tier = fmeaTier(fmea).toLowerCase(); return tier.includes("critical") || tier.includes("priority 1") || tier.includes("top 1-5") ? "reject" : tier.includes("high") || tier.includes("priority 2") || tier.includes("top 6-10") ? "review" : "neutral"; }

function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: string }) { return <span className={`aa-badge ${tone}`}>{children}</span>; }
function Header({ eyebrow, title, subtitle, action }: { eyebrow: string; title: string; subtitle: string; action?: React.ReactNode }) { return <div className="aa-page-heading"><div><div className="eyebrow"><span className="eyebrow-line"/>{eyebrow}</div><h1>{title}</h1><p>{subtitle}</p></div>{action && <div className="aa-page-actions">{action}</div>}</div>; }
function MiniStat({ title, value, caption, tone = "blue" }: { title: string; value: string; caption: string; tone?: string }) { return <article className="stat-card aa-mini-stat"><div className="stat-top"><span>{title}</span><span className={`stat-icon ${tone}`}/></div><div className="stat-value">{value}</div><div className="stat-foot">{caption}</div></article>; }

async function makeThumbnail(file: File): Promise<string> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 144 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) return "";
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    return canvas.toDataURL("image/jpeg", .62);
  } catch { return ""; }
}

function LiveImageComparison({ source, result, selectedIndex, onSelect, zoom, annotatedSource }: { source: string; result: InspectApiResponse; selectedIndex: number; onSelect: (index: number) => void; zoom: number; annotatedSource: string }) {
  const [showBoxes, setShowBoxes] = useState(true);
  const [showBackendRaster, setShowBackendRaster] = useState(false);
  const colors = (type: string) => /crack/i.test(type) ? "#ed4545" : /scor|groov/i.test(type) ? "#ef9b32" : /pit|corros/i.test(type) ? "#a855d8" : "#3478e5";
  const image = (withOverlay: boolean) => <div className="aa-live-stage">
    <div className="aa-live-canvas" style={{ transform: `scale(${zoom})` }}>
      <Image unoptimized width={1200} height={1200} src={withOverlay && showBackendRaster && annotatedSource ? annotatedSource : source} alt={withOverlay && showBackendRaster && annotatedSource ? "Backend annotated inspection image" : "Original uploaded component"}/>
      {withOverlay && showBoxes && <svg className="aa-live-overlay" viewBox={`0 0 ${result.image_width} ${result.image_height}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label={`${result.detections.length} YOLO detections over original image`}>
        {result.detections.map((d, index) => {
          const [x1, y1, x2, y2] = d.bbox; const color = colors(d.defect_type); const label = `#${index + 1} ${d.defect_type} ${(d.confidence * 100).toFixed(0)}%`;
          return <g key={`${d.defect_type}-${index}`} role="button" tabIndex={0} aria-label={`Select ${label}`} onClick={() => onSelect(index)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(index); } }} style={{ cursor: "pointer" }}>
            {d.mask_polygon && d.mask_polygon.length >= 3 && <polygon points={d.mask_polygon.map(([x, y]) => `${x},${y}`).join(" ")} fill={color} fillOpacity={index === selectedIndex ? ".26" : ".14"} stroke={color} strokeWidth={Math.max(result.image_width, result.image_height) / 500} vectorEffect="non-scaling-stroke"/>}
            <rect x={x1} y={y1} width={x2 - x1} height={y2 - y1} fill="none" stroke={color} strokeWidth={Math.max(result.image_width, result.image_height) / (index === selectedIndex ? 180 : 300)} vectorEffect="non-scaling-stroke" className={index === selectedIndex ? "aa-live-box selected" : "aa-live-box"}/>
            <rect x={x1} y={Math.max(0, y1 - Math.max(result.image_height * .035, 22))} width={Math.min(x2 - x1, result.image_width * .48)} height={Math.max(result.image_height * .035, 22)} rx={4} fill={color}/>
            <text x={x1 + 6} y={Math.max(15, y1 - Math.max(result.image_height * .035, 22) / 2 + 4)} fill="white" fontSize={Math.max(result.image_width * .014, 12)} fontWeight="700">{label}</text>
          </g>;
        })}
      </svg>}
    </div>
  </div>;
  return <div className="aa-live-comparison">
    <section className="aa-compare-card"><div className="aa-compare-head"><b>ORIGINAL IMAGE</b><span>{result.image_width} × {result.image_height}px</span></div>{image(false)}</section>
    <section className="aa-compare-card"><div className="aa-compare-head"><b>YOLO MARKED IMAGE</b><span>{result.detections.length} areas marked</span></div>{image(true)}</section>
    <div className="aa-live-controls"><label><input type="checkbox" checked={showBoxes} onChange={(e) => setShowBoxes(e.target.checked)}/> Show marked areas</label>{annotatedSource && <label><input type="checkbox" checked={showBackendRaster} onChange={(e) => setShowBackendRaster(e.target.checked)}/> Show YOLO image</label>}</div>
    <details className="aa-live-results"><summary className="aa-live-results-head"><b>Image findings</b><span>{result.detections.length} · select to highlight ⌄</span></summary>{result.detections.length ? result.detections.map((d, index) => <button key={`${d.defect_type}-${index}`} className={`aa-live-detection ${selectedIndex === index ? "active" : ""}`} onClick={() => onSelect(index)}><span className="aa-live-number" style={{ background: colors(d.defect_type) }}>{index + 1}</span><span className="aa-live-detection-main"><b>{d.defect_type}</b><small>{d.location || "Location not provided"} · {(d.confidence * 100).toFixed(1)}% match · {d.severity} severity</small></span><span>↗</span></button>) : <p className="aa-muted">YOLO found no defects in this image.</p>}</details>
  </div>;
}

function LiveInspectionAnalysis({ result, selectedIndex, navigate }: { result: InspectApiResponse; selectedIndex: number; navigate: Props["navigate"] }) {
  const primary = result.detections[selectedIndex] ?? result.detections[0];
  const fmea = result.top_fmea_risk ?? primary?.fmea ?? result.detections.find((item) => item.fmea)?.fmea;
  const quality = result.fmea_quality_control;
  const unknown = result.detections.some((item) => /unknown anomaly/i.test(item.defect_type) || item.is_unknown_anomaly === true || item.confidence < 0.5);
  const verdict = result.overall_status === "REJECT" ? "REJECT & STOP LINE" : result.overall_status;
  const verdictTone = result.overall_status === "REJECT" ? "reject" : result.overall_status === "REVIEW" ? "review" : "passed";
  const origin = fmea?.station_origin ?? fmea?.station ?? quality?.critical_station ?? "Not supplied by backend";
  const rootCause = fmea?.machine_root_cause_reason ?? fmea?.potential_causes ?? "Cause not identified by image inspection";
  const failureMode = fmea?.failure_mode ?? fmea?.potential_failure_mode ?? "Not supplied by backend";
  const priority = fmea ? fmeaTier(fmea) : quality?.rpn_priority_tier ?? "Not supplied by backend";
  const technical = (children: React.ReactNode) => <details className="aa-manager-details"><summary>Expand for Detailed Engineering Data</summary><div>{children}</div></details>;
  return <section className="aa-manager-cards" aria-label="Inspection decision and engineering details">
    <article className="panel aa-manager-card aa-manager-verdict"><div className="aa-manager-card-head"><span>🚦 Final QA Verdict & Part Health</span><Badge tone={verdictTone}>{verdict}</Badge></div><div className="aa-manager-highlights"><div><small>Triage verdict</small><b>{result.condition_classification.triage_verdict}</b></div><div><small>Component condition</small><b>{result.condition_classification.condition}</b></div><div><small>Damage rating</small><b>Wear Index {result.condition_classification.wear_index_score.toFixed(1)} / 100</b></div></div>{technical(<div className="aa-technical-details"><div><small>Triage model confidence</small><b>{(result.condition_classification.confidence * 100).toFixed(1)}%</b></div><div><small>Component classification</small><b>{result.brake_component_type || "Not supplied"}</b></div><div><small>Inspection tracking ID</small><b>{result.image_id}</b></div><div><small>Inference execution engine</small><b>{result.model_name} · {result.inference_mode.toUpperCase()}</b></div></div>)}</article>
    <article className="panel aa-manager-card"><div className="aa-manager-card-head"><span>🔍 Visual Defect Detection & Location</span><Badge tone={primary ? (primary.severity === "critical" || primary.severity === "high" ? "reject" : "review") : "passed"}>{primary ? primary.severity.toUpperCase() : "NO DEFECT FOUND"}</Badge></div>{primary ? <div className="aa-manager-highlights"><div><small>Primary defect</small><b>{primary.defect_type}</b></div><div><small>AI confidence</small><b>{(primary.confidence * 100).toFixed(1)}% certainty</b></div><div><small>Damaged surface footprint</small><b>{primary.area_percentage.toFixed(2)}% of rotor surface</b></div><div><small>Location zone</small><b>{primary.location || "Outer Friction Track"}</b></div></div> : <p className="aa-manager-empty">The backend returned no detected defect regions.</p>}{technical(<div className="aa-technical-details">{primary && <><div><small>Exact pixel coordinates</small><b>[X₁: {primary.bbox[0].toFixed(1)}, Y₁: {primary.bbox[1].toFixed(1)} — X₂: {primary.bbox[2].toFixed(1)}, Y₂: {primary.bbox[3].toFixed(1)}] px</b></div><div><small>Segmentation polygon</small><b>{primary.mask_polygon?.length ?? 0} contour points returned</b></div></>}<div><small>Total defects localized</small><b>{result.defect_count} regions flagged</b></div><div><small>Image resolution</small><b>{result.image_width} × {result.image_height} px</b></div>{result.detections.map((item, index) => <div key={`defect-tech-${index}`}><small>Region {index + 1} · {item.defect_type}</small><b>{item.location || "Location not supplied"} · {(item.confidence * 100).toFixed(1)}% · {item.severity}</b></div>)}</div>)}</article>
    {(fmea || quality) && <article className="panel aa-manager-card"><div className="aa-manager-card-head"><span>🏭 Station Risk & Root Cause (FMEA)</span><Badge tone={fmea ? fmeaTone(fmea) : "neutral"}>{fmea ? `RPN ${fmea.rpn}` : `RPN ${quality?.highest_rpn ?? "—"}`}</Badge></div><div className="aa-manager-highlights"><div><small>Faulty station</small><b>{origin}</b></div><div><small>Root cause summary</small><b>{rootCause}</b></div><div><small>Failure mode</small><b>{failureMode}</b></div><div><small>Visual effect code</small><b>{fmea?.visual_effect_code ?? "Not supplied by backend"}</b></div></div>{technical(<div className="aa-technical-details">{fmea && <><div><small>Risk Priority Number</small><b>RPN {fmea.rpn}</b></div><div><small>Formula breakdown</small><b>Severity ({fmea.severity_s}) × Occurrence ({fmea.occurrence_o}) × Detection ({fmea.detection_d})</b></div></>}<div><small>Priority tier rank</small><b>{priority}</b></div><div className="aa-technical-detection"><small>Mechanical explanation</small><b>{primary?.explanation || "No mechanical explanation returned by the backend."}</b></div></div>)}</article>}
    {quality && <article className="panel aa-manager-card"><div className="aa-manager-card-head"><span>🛠️ Production Line Decision & Corrective Action</span><Badge tone={/reject|stop line/i.test(quality.line_decision) ? "reject" : /rework|review/i.test(quality.line_decision) ? "review" : "passed"}>{quality.line_decision}</Badge></div><div className="aa-manager-highlights"><div><small>Immediate station action</small><b>{fmea ? fmeaAction(fmea) : "See process adjustments below"}</b></div><div><small>Highest RPN</small><b>{quality.highest_rpn} · {quality.rpn_priority_tier}</b></div></div>{technical(<div className="aa-technical-details"><div><small>DTV (limit ≤ 5 µm)</small><b>{quality.dtv_value_um} µm · {quality.dtv_tolerance_status}</b></div><div><small>Lateral runout (limit ≤ 25 µm)</small><b>{quality.runout_value_um} µm · {quality.runout_tolerance_status}</b></div><div><small>Parallelism (limit ≤ 40 µm)</small><b>{quality.parallelism_value_um} µm · {quality.parallelism_tolerance_status}</b></div><div className="aa-technical-detection"><small>Multi-sensor fusion note</small><b>{quality.sensor_integration_note}</b><span>These returned values are rule-derived estimates, not live readings from connected calibrated probes.</span></div><div className="aa-technical-detection"><small>Engineering workshop action</small><b>{primary?.recommendation || (fmea ? fmeaAction(fmea) : "No corrective action returned")}</b></div>{quality.recommended_process_adjustments.length > 0 && <div className="aa-technical-detection"><small>Maintenance adjustments</small>{quality.recommended_process_adjustments.map((action, index) => <label className="aa-maintenance-check" key={`adjustment-${index}`}><input type="checkbox"/><span>{action}</span></label>)}</div>}</div>)}</article>}
    {unknown && <div className="aa-anomaly-banner" role="alert"><b>Unclassified Visual Anomaly Spotted — Quarantined for Expert Evaluation</b><button className="button button-secondary" onClick={() => navigate("Human Review", result.image_id)}>Open in Human Review Workspace →</button></div>}
    <div className="aa-analysis-actions"><button className="button button-secondary" onClick={() => navigate("Main Dashboard")}>Main dashboard</button></div>
  </section>;
}

export function AutoAuditView(props: Props) {
  if (props.view === "AI Inspection Studio") return <Inspector {...props}/>;
  if (props.view === "Inspection History") return <UploadHistory uploadLogs={props.uploadLogs} navigate={props.navigate} title="Inspection History"/>;
  if (props.view === "Batch Data") return <BatchData {...props}/>;
  if (props.view === "Fault Intelligence Board") return <MachineIntelligence {...props}/>;
  if (props.view === "Human Review") return <HumanReview {...props}/>;
  return <Overview {...props}/>;
}

function UploadHistory({ uploadLogs, navigate, title = "Inspection Upload History" }: Pick<Props, "uploadLogs" | "navigate"> & { title?: string }) {
  const [requestedPage, setRequestedPage] = useState(1);
  const pageSize = 50;
  const pageCount = Math.max(1, Math.ceil(uploadLogs.length / pageSize));
  const page = Math.min(requestedPage, pageCount);
  const first = uploadLogs.length ? (page - 1) * pageSize + 1 : 0;
  const last = Math.min(page * pageSize, uploadLogs.length);
  const visibleLogs = uploadLogs.slice((page - 1) * pageSize, page * pageSize);
  return <section className="panel aa-upload-log"><div className="panel-heading"><div><h2>{title}</h2><p>Saved inspections with backend verdict and part details</p></div><Badge>{uploadLogs.length} uploads</Badge></div>{uploadLogs.length ? <><div className="table-scroll"><table><thead><tr><th>IMAGE</th><th>PART / DEFECT</th><th>RESULT</th><th>CONFIDENCE</th><th>STATION · RPN</th><th>DATE</th><th/></tr></thead><tbody>{visibleLogs.map((entry) => <tr key={entry.id}><td>{entry.thumbnailDataUrl ? <Image unoptimized width={48} height={48} src={entry.thumbnailDataUrl} alt={`Thumbnail of ${entry.fileName}`} className="aa-history-thumb"/> : <span className="aa-upload-thumb-empty">◉</span>}</td><td><b>{entry.fileName}</b><small className="aa-history-subline">{entry.defectType || entry.detections[0]?.defectType || "No defect detected"} · {entry.component}</small></td><td><Badge tone={entry.result === "PASS" ? "passed" : entry.result === "REJECT" ? "reject" : "review"}>{entry.result}</Badge></td><td>{((entry.confidence ?? entry.detections[0]?.confidence ?? entry.conditionConfidence) * 100).toFixed(1)}%</td><td>{entry.stationOrigin || "—"}{entry.rpn !== undefined && <small className="aa-history-subline">RPN {entry.rpn}</small>}</td><td>{new Date(entry.uploadedAt).toLocaleString()}</td><td><button className="button button-secondary small-button" onClick={() => navigate("AI Inspection Studio", entry.id)}>Open result</button></td></tr>)}</tbody></table></div><div className="aa-history-pagination"><span>Showing {first}–{last} of {uploadLogs.length} records · Page {page} of {pageCount}</span><div><button className="button button-secondary" onClick={() => setRequestedPage((current) => Math.max(1, current - 1))} disabled={page === 1}>Previous</button><button className="button button-secondary" onClick={() => setRequestedPage((current) => Math.min(pageCount, current + 1))} disabled={page === pageCount}>Next</button></div></div></> : <div className="aa-upload-log-empty"><b>No components inspected yet</b><span>Upload an image in AI Inspection Studio to begin tracking real plant metrics.</span></div>}</section>;
}

function Overview({ uploadLogs, navigate }: Props) {
  const totalInspected = uploadLogs.length;
  const passedCount = uploadLogs.filter((entry) => entry.result === "PASS").length;
  const rejectedCount = uploadLogs.filter((entry) => entry.result === "REJECT").length;
  const fpy = totalInspected ? passedCount / totalInspected * 100 : 0;
  const rejectRate = totalInspected ? rejectedCount / totalInspected * 100 : 0;
  const realAiCount = uploadLogs.filter((entry) => entry.inferenceMode === "real_ai").length;
  const defectCounts = uploadLogs.flatMap((entry) => entry.detections.map((detection) => detection.defectType)).reduce<Record<string, number>>((counts, defect) => { counts[defect] = (counts[defect] ?? 0) + 1; return counts; }, {});
  const defectRanking = Object.entries(defectCounts).sort((a, b) => b[1] - a[1]);
  const topDefectName = defectRanking[0]?.[0] ?? "No Defects Detected";
  const defectTotal = defectRanking.reduce((sum, [, count]) => sum + count, 0);
  const stationRanking: Record<string, { rpn: number; tier: string; mode: string; action: string }> = {};
  for (const entry of uploadLogs) {
    const risks = [entry.topFmeaRisk, ...entry.detections.map((detection) => detection.fmea)].filter((risk): risk is FMEAEvaluation => Boolean(risk));
    for (const risk of risks) {
      const station = fmeaStation(risk);
      if (!stationRanking[station] || risk.rpn > stationRanking[station].rpn) stationRanking[station] = { rpn: risk.rpn, tier: fmeaTier(risk), mode: fmeaFailure(risk), action: fmeaAction(risk) };
    }
  }
  const stations = Object.entries(stationRanking).sort((a, b) => b[1].rpn - a[1].rpn);
  const topStationName = stations[0]?.[0] ?? "All Stations Nominal";
  const buckets: { name: string; match: (defectName: string) => boolean; color: string }[] = [
    { name: "Thermal Crack", match: (name) => /thermal|crack/i.test(name), color: "#dc3545" },
    { name: "Deep Scoring", match: (name) => /scor|groov/i.test(name), color: "#e6a23c" },
    { name: "Surface Cavity / Pitting", match: (name) => /cavit|pit|corros/i.test(name), color: "#a855d8" },
    { name: "Unknown Anomaly", match: (name) => /unknown|anomal/i.test(name), color: "#3478e5" },
  ];
  const groupedDefects = buckets.map((bucket) => ({ ...bucket, count: defectRanking.filter(([name]) => bucket.match(name)).reduce((sum, [, count]) => sum + count, 0) }));
  const knownDefects = new Set(defectRanking.filter(([name]) => buckets.some((bucket) => bucket.match(name))).map(([name]) => name));
  const otherDefects = defectRanking.filter(([name]) => !knownDefects.has(name)).reduce((sum, [, count]) => sum + count, 0);
  if (otherDefects) groupedDefects.push({ name: "Other Defects", match: () => false, color: "#64748b", count: otherDefects });
  const batchMap = uploadLogs.reduce<Record<string, InspectionUploadLog[]>>((groups, entry) => {
    const date = new Date(entry.uploadedAt);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    (groups[key] ??= []).push(entry); return groups;
  }, {});
  const trendPoints = Object.entries(batchMap).sort(([a], [b]) => a.localeCompare(b)).slice(-8).map(([batchId, entries]) => {
    const defectCount = entries.filter((entry) => entry.detections.length > 0).length;
    return { batchId, totalParts: entries.length, defectCount, defectRate: entries.length ? defectCount / entries.length * 100 : 0, yieldRate: entries.length ? (entries.length - defectCount) / entries.length * 100 : 0 };
  });
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
  const [pinnedPoint, setPinnedPoint] = useState<number | null>(null);
  const chart = { width: 640, height: 238, left: 46, right: 625, top: 24, bottom: 164 };
  const maxRate = Math.max(12, Math.ceil(Math.max(10, ...trendPoints.map((point) => point.defectRate)) / 5) * 5);
  const xFor = (index: number) => trendPoints.length <= 1 ? (chart.left + chart.right) / 2 : chart.left + index * (chart.right - chart.left) / (trendPoints.length - 1);
  const yFor = (rate: number) => chart.bottom - Math.min(rate, maxRate) / maxRate * (chart.bottom - chart.top);
  const linePoints = trendPoints.map((point, index) => `${xFor(index)},${yFor(point.defectRate)}`).join(" ");
  const areaPoints = trendPoints.length ? `${chart.left},${chart.bottom} ${linePoints} ${xFor(trendPoints.length - 1)},${chart.bottom}` : "";
  const activePoint = hoveredPoint ?? pinnedPoint;
  const yTicks = Array.from({ length: 5 }, (_, index) => Math.round(maxRate * index / 4));
  return <div className="aa-executive-dashboard">
    <Header eyebrow="AUTOAUDIT · PLANT QUALITY" title="Main Dashboard" subtitle="Executive view of saved component inspections" action={<div className="aa-overview-actions"><button className="button button-secondary" onClick={() => navigate("Batch Data")}>Batch data</button><button className="button button-secondary" onClick={() => navigate("Inspection History")}>Inspection history</button><button className="button button-primary" onClick={() => navigate("AI Inspection Studio")}>Inspect component</button></div>}/>
    <section className="aa-executive-kpis" aria-label="Executive quality metrics">
      <article className="panel aa-executive-kpi"><span className="aa-executive-label">PLANT QUALITY YIELD</span><b className={fpy >= 90 ? "good" : "bad"}>{fpy.toFixed(1)}%</b><small>Target: 95.0% · Calculated from {totalInspected} parts</small><Badge tone={fpy >= 95 ? "passed" : "reject"}>{fpy >= 95 ? "ON TARGET" : "BELOW SPEC"}</Badge></article>
      <article className="panel aa-executive-kpi"><span className="aa-executive-label">COMPONENTS PROCESSED</span><b>{totalInspected}</b><small>{realAiCount} Real AI verified · {totalInspected - realAiCount} demo / other</small></article>
      <article className="panel aa-executive-kpi"><span className="aa-executive-label">PARTS REJECTED</span><b>{rejectedCount} <small>({rejectRate.toFixed(1)}%)</small></b><small>Rejected out of {totalInspected} inspected parts</small></article>
      <article className="panel aa-executive-kpi"><span className="aa-executive-label">PRIMARY DEFECT MODE</span><b className="aa-executive-hazard">{topDefectName}</b><small>Attributed station: {topStationName}</small></article>
    </section>
    <section className="panel aa-trend-panel"><div className="aa-section-heading"><div><h2>Batch Defect Rate Trend &amp; SPC Quality Limit</h2><p>Each point is a daily upload group · latest {trendPoints.length} shown</p></div><div className="aa-trend-legend"><span><i className="aa-legend-blue"/>Defect rate</span><span className="aa-ucl-legend"><i/>10.0% scrap limit</span></div></div>
      {trendPoints.length ? <><div className="aa-trend-plot"><svg viewBox={`0 0 ${chart.width} ${chart.height}`} role="img" aria-label="Interactive defect rate and yield trend for recent daily upload groups">
        <defs><linearGradient id="aa-trend-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#3b82f6" stopOpacity=".2"/><stop offset="100%" stopColor="#3b82f6" stopOpacity="0"/></linearGradient></defs>
        <text x="13" y={(chart.top + chart.bottom) / 2} transform={`rotate(-90 13 ${(chart.top + chart.bottom) / 2})`} textAnchor="middle" fill="#64748b" fontSize="10" fontWeight="700">DEFECT RATE (%)</text>
        {yTicks.map((tick) => <g key={tick}><line x1={chart.left} x2={chart.right} y1={yFor(tick)} y2={yFor(tick)} stroke="#e8edf4" strokeWidth="1"/><text x={chart.left - 9} y={yFor(tick) + 4} textAnchor="end" fill="#64748b" fontSize="10">{tick}%</text></g>)}
        <line x1={chart.left} x2={chart.right} y1={yFor(10)} y2={yFor(10)} stroke="#ef4444" strokeWidth="1.5" strokeDasharray="6 4"/><text x={chart.right - 2} y={yFor(10) - 6} textAnchor="end" fill="#dc4545" fontSize="10" fontWeight="700">10% Scrap Limit</text>
        <polygon points={areaPoints} fill="url(#aa-trend-fill)"/>
        {trendPoints.length > 1 && <polyline points={linePoints} fill="none" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>}
        {trendPoints.map((point, index) => { const x = xFor(index); const y = yFor(point.defectRate); const over = point.defectRate > 10; const dateLabel = new Date(`${point.batchId}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" }); return <g key={point.batchId} tabIndex={0} role="button" aria-label={`${point.batchId}: ${point.defectRate.toFixed(1)} percent defect rate, ${point.yieldRate.toFixed(1)} percent yield, ${point.defectCount} defective of ${point.totalParts} parts`} onMouseEnter={() => setHoveredPoint(index)} onMouseLeave={() => setHoveredPoint(null)} onFocus={() => setHoveredPoint(index)} onBlur={() => setHoveredPoint(null)} onClick={() => setPinnedPoint(pinnedPoint === index ? null : index)} className="aa-trend-point"><title>{`${point.batchId} · ${point.defectRate.toFixed(1)}% defects · ${point.yieldRate.toFixed(1)}% yield · n=${point.totalParts}`}</title>{over && <circle cx={x} cy={y} r="12" className="aa-trend-pulse"/>}<circle cx={x} cy={y} r="6.5" fill={over ? "#ef4444" : "#3b82f6"} stroke="white" strokeWidth="2.5"/><text x={x} y={Math.max(14, y - 13)} textAnchor="middle" fill={over ? "#dc2626" : "#1e3a8a"} fontSize="12" fontWeight="700">{point.defectRate.toFixed(1)}%</text><text x={x} y={chart.bottom + 20} textAnchor="middle" fill="#64748b" fontSize="11">{dateLabel}</text><text x={x} y={chart.bottom + 35} textAnchor="middle" fill="#64748b" fontSize="10">n={point.totalParts}</text></g>; })}
        <text x={(chart.left + chart.right) / 2} y="234" textAnchor="middle" fill="#64748b" fontSize="10" fontWeight="700">UPLOAD DATE · PARTS INSPECTED</text>
      </svg></div>{activePoint !== null && trendPoints[activePoint] && <div className="aa-trend-detail" aria-live="polite"><b>{new Date(`${trendPoints[activePoint].batchId}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</b><span>{trendPoints[activePoint].defectCount} defective of {trendPoints[activePoint].totalParts} parts</span><span>Defect rate {trendPoints[activePoint].defectRate.toFixed(1)}%</span><span>Yield {trendPoints[activePoint].yieldRate.toFixed(1)}%</span></div>}<p className="aa-trend-note">Defect rate = parts with one or more detected defects ÷ all inspected parts in that daily group. Hover, focus, or click a point for details.</p></> : <div className="aa-dashboard-empty">Upload inspections to build the defect-rate trend.</div>}
    </section>
    <section className="aa-dashboard-split"><article className="panel aa-breakdown-panel"><div className="aa-section-heading"><div><h2>Defect Type Breakdown</h2><p>{defectTotal} detected regions in {totalInspected} parts</p></div></div>{defectTotal ? <div className="aa-pareto-list">{groupedDefects.filter((item) => item.count > 0).map((item) => <div className="aa-pareto-row" key={item.name}><span>{item.name}</span><div><i style={{ width: `${item.count / Math.max(...groupedDefects.map((row) => row.count)) * 100}%`, backgroundColor: item.color }}/></div><b>{(item.count / defectTotal * 100).toFixed(1)}%</b><small>{item.count}</small></div>)}</div> : <div className="aa-dashboard-empty">No defect types returned yet.</div>}</article>
      <article className="panel aa-station-panel"><div className="aa-section-heading"><div><h2>Station Root Cause Ranking</h2><p>FMEA returned by inspection results</p></div></div>{stations.length ? <div className="aa-station-ranking">{stations.slice(0, 5).map(([name, risk]) => <div className="aa-station-risk" key={name}><div className="aa-station-risk-head"><b>{name}</b><Badge tone={/critical|priority 1|top 1-5/i.test(risk.tier) ? "reject" : /high|priority 2|top 6-10/i.test(risk.tier) ? "review" : "neutral"}>RPN {risk.rpn} · {risk.tier}</Badge></div><span>{risk.mode}</span><small>Corrective action: {risk.action}</small></div>)}</div> : <div className="aa-dashboard-empty">Station ranking appears when the backend returns FMEA data.</div>}</article>
    </section>
  </div>;
}

function Inspector({ uploadLogs, selectedPart, setSelectedPart, navigate, backendOnline, inferenceMode, onInspectionCreated }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [annotatedPreview, setAnnotatedPreview] = useState("");
  const [fileMessage, setFileMessage] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [scanning, setScanning] = useState(false);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [liveResult, setLiveResult] = useState<InspectApiResponse | null>(null);
  const [liveSelection, setLiveSelection] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const activeUpload = useRef(0);
  const [zoom, setZoom] = useState(1);
  const [full, setFull] = useState(false);

  useEffect(() => {
    if (!file) { setPreview(""); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (!selectedPart) return;
    let cancelled = false;
    setLoadingSaved(true);
    setLiveResult(null);
    setFile(null);
    void getStoredInspection(selectedPart).then((saved) => {
      if (cancelled) return;
      if (!saved) {
        setLiveResult(null);
        setUploadError("This older result has no saved image. Upload it again to run a fresh YOLO check.");
        setLoadingSaved(false);
        return;
      }
      setFile(new File([saved.image], saved.fileName, { type: saved.image.type || "image/jpeg" }));
      setLiveResult(saved.response);
      const annotated = saved.response.annotated_image_base64;
      setAnnotatedPreview(annotated ? (annotated.startsWith("data:") ? annotated : `data:image/jpeg;base64,${annotated}`) : "");
      setLiveSelection(0);
      setUploadError("");
      setFileMessage("Saved inspection restored from this browser.");
      setLoadingSaved(false);
    }).catch(() => {
      if (!cancelled) { setUploadError("Could not restore this inspection from browser storage."); setLoadingSaved(false); }
    });
    return () => { cancelled = true; };
  }, [selectedPart]);

  const inspectFile = async (next: File) => {
    const uploadId = ++activeUpload.current;
    setSelectedPart("");
    setFile(next); setAnnotatedPreview(""); setLiveResult(null); setUploadError(""); setFileMessage("Running YOLOv8 Inspection..."); setLiveSelection(0); setScanning(true);
    try {
      const response = await uploadAndInspectImage(next);
      if (uploadId !== activeUpload.current) return;
      if (response.status === "failed") throw new Error(response.summary_message || "The backend could not inspect this image.");
      setLiveResult(response);
      if (response.annotated_image_base64) setAnnotatedPreview(response.annotated_image_base64.startsWith("data:") ? response.annotated_image_base64 : `data:image/jpeg;base64,${response.annotated_image_base64}`);
      await onInspectionCreated(response, await makeThumbnail(next), next);
      setFileMessage(response.defect_count ? `Check complete · ${response.defect_count} finding${response.defect_count === 1 ? "" : "s"} marked.` : "Check complete · no visible issues found.");
    } catch (error) {
      if (uploadId !== activeUpload.current) return;
      setUploadError(`${!backendOnline ? "Backend offline on :8000 — live image inspection is unavailable." : error instanceof Error ? error.message : "Inspection request failed."} The uploaded image remains available as a preview.`);
      setFileMessage("Inspection unavailable · preview only.");
    } finally { if (uploadId === activeUpload.current) setScanning(false); }
  };

  const chooseFile = (next?: File) => {
    if (!next) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(next.type) || next.size > 20 * 1024 * 1024) {
      setFileMessage("Choose a JPG, PNG, or WEBP image under 20 MB.");
      return;
    }
    void inspectFile(next);
  };
  const clearUpload = () => {
    activeUpload.current += 1;
    setScanning(false); setFile(null); setPreview(""); setAnnotatedPreview(""); setLiveResult(null); setLiveSelection(0); setUploadError(""); setFileMessage(""); setSelectedPart("");
    if (inputRef.current) inputRef.current.value = "";
  };
  const current = liveResult;
  const currentLog = uploadLogs.find((entry) => entry.id === selectedPart);
  return <div className="aa-inspector-dark">
    <Header eyebrow="AI INSPECTION STUDIO" title="AI Inspection Studio" subtitle="Upload a brake component image to run the live YOLO quality gate" action={<div className="aa-inspector-actions">{uploadLogs.length > 0 && <label className="aa-part-select"><span>Previous parts · latest 8</span><select aria-label="Previously inspected parts" value={selectedPart} onChange={(event) => { setUploadError(""); setSelectedPart(event.target.value); }}><option value="">Select a previous part</option>{uploadLogs.slice(0, 8).map((entry) => <option key={entry.id} value={entry.id}>{entry.fileName} · {new Date(entry.uploadedAt).toLocaleDateString()}</option>)}</select></label>}<button className="button button-primary" onClick={clearUpload}>+ Inspect New Component</button>{current && <Badge tone={current.inference_mode === "real_ai" ? "passed" : "neutral"}>{current.inference_mode === "real_ai" ? "REAL YOLO AI" : "MOCK BACKEND"}</Badge>}{!current && <Badge tone={backendOnline && inferenceMode === "real_ai" ? "passed" : "neutral"}>{backendOnline ? `${inferenceMode.toUpperCase()} READY` : "BACKEND OFFLINE"}</Badge>}</div>}/>
    {!current && <section className={`aa-primary-upload aa-upload-hero ${scanning ? "scanning" : ""}`} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); if (!scanning) chooseFile(event.dataTransfer.files?.[0]); }} aria-label="Upload brake component image"><input ref={inputRef} type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" hidden onChange={(event) => { chooseFile(event.currentTarget.files?.[0]); event.currentTarget.value = ""; }}/><span className="aa-primary-upload-icon">⇧</span><div className="aa-primary-upload-copy"><b>{scanning ? "Checking image with YOLO…" : "Drop or choose a brake image"}</b><span>{scanning ? "Your inspection results will appear here." : "JPG, PNG or WEBP · Up to 20 MB · YOLO starts automatically"}</span>{file && <small>{file.name}</small>}</div><div className="aa-primary-upload-actions"><button className="button button-primary aa-primary-upload-button" disabled={scanning} onClick={() => inputRef.current?.click()}>{scanning ? "Checking…" : "Choose image"}</button>{file && <button className="button button-secondary" disabled={scanning} onClick={clearUpload}>Clear</button>}</div>{scanning && <span className="aa-spinner" aria-label="Inspection in progress"/>}</section>}
    {!current && uploadError && <div className="aa-upload-feedback" role="alert"><span>{uploadError}</span><button className="button button-secondary" onClick={() => { clearUpload(); inputRef.current?.click(); }}>Choose image</button></div>}
    {!current && file && preview && <section className="panel aa-inspector-image"><div className="panel-heading"><div><h2>Uploaded image</h2><p>{file.name} · {scanning ? "YOLO inference in progress" : "Preview"}</p></div></div><Image unoptimized width={1200} height={1200} src={preview} alt={`Uploaded brake component ${file.name}`} className="aa-upload-preview"/>{scanning && <div className="aa-scanning-overlay"><span className="aa-spinner"/>Running YOLOv8 Inspection...</div>}</section>}
    {current && preview && <><div className={`aa-inspector-grid ${full ? "fullscreen-image" : ""}`}><section className={`panel aa-inspector-image has-live-result ${full ? "aa-image-full" : ""}`}><div className="panel-heading"><div><h2>Original & YOLO detection</h2><p>{currentLog?.fileName ?? file?.name ?? current.brake_component_type}</p></div><button className="icon-button" onClick={() => setFull(!full)} aria-label={full ? "Exit fullscreen" : "Expand image"}>⛶</button></div><LiveImageComparison source={preview} annotatedSource={annotatedPreview} result={current} selectedIndex={liveSelection} zoom={zoom} onSelect={setLiveSelection}/><div className="aa-viewer-toolbar"><button onClick={() => setZoom(Math.max(.8, zoom - .1))} aria-label="Zoom out">−</button><span>{Math.round(zoom * 100)}%</span><button onClick={() => setZoom(Math.min(1.5, zoom + .1))} aria-label="Zoom in">+</button><button onClick={() => setZoom(1)}>Reset zoom</button></div></section></div><LiveInspectionAnalysis result={current} selectedIndex={liveSelection} navigate={navigate}/>{fileMessage && <p className="aa-inspection-message">{fileMessage}</p>}<button className="button button-secondary aa-replace-upload" onClick={clearUpload}>Replace this image</button></>}
    {loadingSaved && <div className="panel aa-live-empty"><span className="aa-spinner"/>Restoring the saved inspection…</div>}
  </div>;
}

function HumanReview({ uploadLogs, navigate }: Props) {
  const queued = uploadLogs.filter(needsHumanReview);
  return <><Header eyebrow="HUMAN REVIEW QUEUE" title="Human Review Workspace" subtitle="High-priority risks, low-confidence results, and unclassified detections" action={<Badge tone="review">{queued.length} for review</Badge>}/>{queued.length ? <UploadHistory uploadLogs={queued} navigate={navigate} title="Inspections Requiring Review"/> : <section className="panel aa-manager-empty"><h2>No inspections awaiting review</h2><p>Critical or high FMEA tiers, unclassified findings, and detections below 50% confidence are added here.</p><button className="button button-secondary" onClick={() => navigate("AI Inspection Studio")}>Return to AI Inspection Studio</button></section>}</>;
}

function BatchData({ uploadLogs, navigate }: Props) {
  const groups = Object.values(uploadLogs.reduce<Record<string, { date: string; entries: InspectionUploadLog[] }>>((all, entry) => {
    const time = new Date(entry.uploadedAt);
    const date = `${time.getFullYear()}-${String(time.getMonth() + 1).padStart(2, "0")}-${String(time.getDate()).padStart(2, "0")}`;
    (all[date] ??= { date, entries: [] }).entries.push(entry);
    return all;
  }, {})).sort((a, b) => b.date.localeCompare(a.date));
  return <><Header eyebrow="BATCH RECORDS" title="Batch Data" subtitle="Every saved inspection, grouped by the local upload date" action={<button className="button button-secondary" onClick={() => navigate("Inspection History")}>Full inspection history</button>}/><div className="stat-grid aa-batch-summary"><MiniStat title="TOTAL PROCESSED" value={String(uploadLogs.length)} caption="Saved component inspections" tone="blue"/><MiniStat title="DAILY UPLOAD GROUPS" value={String(groups.length)} caption="Date-based groups · not production batch IDs" tone="violet"/></div>{groups.length ? <div className="aa-batch-groups">{groups.map((group) => {
    const outcomes = group.entries.reduce((counts, entry) => { counts[entry.result] += 1; return counts; }, { PASS: 0, REVIEW: 0, REJECT: 0 });
    const dateLabel = new Date(`${group.date}T12:00:00`).toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    return <details className="panel aa-batch-group" key={group.date}><summary><span><b>{dateLabel}</b><small>Daily upload group · {group.entries.length} inspection{group.entries.length === 1 ? "" : "s"}</small></span><span className="aa-batch-group-metrics"><Badge tone="passed">{outcomes.PASS} pass</Badge><Badge tone="review">{outcomes.REVIEW} review</Badge><Badge tone="reject">{outcomes.REJECT} reject</Badge><b>View details⌄</b></span></summary><div className="table-scroll"><table><thead><tr><th>IMAGE / FILE</th><th>COMPONENT</th><th>DEFECTS</th><th>RESULT</th><th>CONFIDENCE</th><th>STATION · RPN</th><th/></tr></thead><tbody>{group.entries.map((entry) => <tr key={entry.id}><td><span className="aa-batch-file">{entry.thumbnailDataUrl && <Image unoptimized width={44} height={44} src={entry.thumbnailDataUrl} alt=""/>}<span><b>{entry.fileName}</b><small>{new Date(entry.uploadedAt).toLocaleTimeString()}</small></span></span></td><td>{entry.component}</td><td>{entry.defectCount ? entry.detections.map((d) => d.defectType).join(", ") : "No defect detected"}</td><td><Badge tone={entry.result === "PASS" ? "passed" : entry.result === "REJECT" ? "reject" : "review"}>{entry.result}</Badge></td><td>{(entry.conditionConfidence * 100).toFixed(1)}%</td><td>{entry.stationOrigin || "—"}{entry.rpn !== undefined && <small className="aa-history-subline">RPN {entry.rpn}</small>}</td><td><button className="button button-secondary small-button" onClick={() => navigate("AI Inspection Studio", entry.id)}>Open inspection</button></td></tr>)}</tbody></table></div></details>;
  })}</div> : <section className="panel aa-manager-empty"><h2>No batch data yet</h2><p>Completed inspections will appear here, grouped by upload date.</p><button className="button button-primary" onClick={() => navigate("AI Inspection Studio")}>Inspect a component</button></section>}<p className="aa-caution">The backend does not currently provide production batch IDs. These groups use the local upload date and are not manufacturing batch identifiers.</p></>;
}

function MachineIntelligence({ uploadLogs, navigate }: Props) {
  const stationCounts: Record<string, { count: number; highestRpn: number; mode: string }> = {};
  for (const entry of uploadLogs) {
    const risk = entry.topFmeaRisk ?? entry.detections.find((item) => item.fmea)?.fmea;
    if (!risk) continue;
    const station = fmeaStation(risk);
    stationCounts[station] ??= { count: 0, highestRpn: 0, mode: fmeaFailure(risk) };
    stationCounts[station].count += 1;
    if (risk.rpn > stationCounts[station].highestRpn) {
      stationCounts[station].highestRpn = risk.rpn;
      stationCounts[station].mode = fmeaFailure(risk);
    }
  }
  const stations = Object.entries(stationCounts).sort((a,b) => b[1].highestRpn-a[1].highestRpn);
  const maxRpn = stations.reduce((max, [, value]) => Math.max(max, value.highestRpn), 0);
  return <><Header eyebrow="FAULT INTELLIGENCE BOARD" title="Fault Intelligence Board" subtitle="FMEA station patterns and machine risks returned by inspection results" action={<Badge>{stations.length} stations</Badge>}/><div className="stat-grid"><MiniStat title="SAVED INSPECTIONS" value={String(uploadLogs.length)} caption="Images checked"/><MiniStat title="STATIONS WITH FMEA" value={String(stations.length)} caption="Backend-linked station records" tone="blue"/><MiniStat title="HIGHEST RPN" value={maxRpn ? String(maxRpn) : "—"} caption={maxRpn ? "From returned FMEA evaluation" : "No FMEA data returned"} tone="amber"/><MiniStat title="MACHINE RISK" value="Not linked" caption="No machine telemetry attached" tone="violet"/></div><section className="panel aa-telemetry-panel"><div className="panel-heading"><div><h2>Failure frequency by station</h2><p>Counts are based on saved inspections that include FMEA station data</p></div></div>{stations.length ? stations.map(([station, value]) => <div className="aa-distribution-row" key={station}><span>{station}</span><div><i style={{width:`${Math.max(5, value.highestRpn / maxRpn * 100)}%`}}/></div><b>RPN {value.highestRpn}</b><small>{value.count} inspection{value.count === 1 ? "" : "s"} · {value.mode}</small></div>) : <div className="empty-state">FMEA station frequencies will appear after an upload returns FMEA data.</div>}<p className="aa-muted">These are counts in the images inspected here, not plant-wide failure rates. Machine sensor telemetry is not connected to this inspection feed.</p><button className="button button-secondary" onClick={() => navigate("Inspection History")}>Open inspection history</button></section></>;
}
