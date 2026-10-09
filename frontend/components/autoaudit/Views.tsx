"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { updateInspectionReview, uploadAndInspectImage, type BatchSummary, type DashboardAnalytics, type HistoricalAnalyticsResponse, type HistoricalInspectionRecord, type InspectApiResponse } from "../../lib/api";
import { getStoredInspection } from "../../lib/inspection-store";
import type { FMEAEvaluation, InspectionUploadLog } from "../../lib/types";
import { RotorHeatmap } from "./RotorHeatmap";
import { WhatsAppDispatchAction } from "./WhatsAppDispatch";

type ViewName = "Main Dashboard" | "AI Inspection Studio" | "Inspection History" | "Historical Data & Prediction" | "Batch Data" | "Fault Intelligence Board" | "Human Review";
type Props = { view: ViewName; uploadLogs: InspectionUploadLog[]; selectedPart: string; setSelectedPart: (id: string) => void; navigate: (view: ViewName, partId?: string) => void; backendOnline: boolean; inferenceMode: string; onInspectionCreated: (response: InspectApiResponse, thumbnailDataUrl: string, file: File) => void | Promise<void>; historicalAnalytics: HistoricalAnalyticsResponse | null; historicalRecords: HistoricalInspectionRecord[]; dashboardAnalytics: DashboardAnalytics | null; batchSummaries: BatchSummary[]; analyticsStatus: "loading" | "refreshing" | "online" | "offline"; analyticsError: string; refreshAnalytics: () => void };

function fmeaTier(fmea: FMEAEvaluation) { return fmea.rpn_rank_tier ?? fmea.priority_tier ?? "Priority unavailable"; }
function fmeaAction(fmea: FMEAEvaluation) { return fmea.recommended_action ?? fmea.station_action ?? "No corrective action supplied"; }
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
  const criticalFinding = result.detections.find((item) => item.severity === "critical");
  const dispatchRpn = fmea?.rpn ?? quality?.highest_rpn;
  const automaticDispatchEligible = Boolean(criticalFinding || (dispatchRpn !== undefined && dispatchRpn >= 200));
  const technical = (children: React.ReactNode) => <details className="aa-manager-details"><summary>Expand for Detailed Engineering Data</summary><div>{children}</div></details>;
  return <section className="aa-manager-cards" aria-label="Inspection decision and engineering details">
    <WhatsAppDispatchAction details={{ station: origin, failureMode: criticalFinding?.defect_type ?? primary?.defect_type ?? (fmea ? failureMode : "Manual maintenance request"), rpn: dispatchRpn, action: criticalFinding?.recommendation ?? primary?.recommendation ?? (fmea ? fmeaAction(fmea) : "Manager-requested maintenance follow-up."), partId: result.image_id, dispatchKey: automaticDispatchEligible ? `inspection:${result.image_id}` : `manual:${result.image_id}` }} thresholdLabel={criticalFinding ? "Critical defect · automatic alert rule met; manual review is always available" : dispatchRpn !== undefined && dispatchRpn >= 200 ? `Automatic alert rule met · RPN ${dispatchRpn}; manual review is always available` : "Manual maintenance dispatch available for this inspection"}/>
    <article className="panel aa-manager-card aa-manager-verdict"><div className="aa-manager-card-head"><span>🚦 Final QA Verdict & Part Health</span><Badge tone={verdictTone}>{verdict}</Badge></div><div className="aa-manager-highlights"><div><small>Triage verdict</small><b>{result.condition_classification.triage_verdict}</b></div><div><small>Component condition</small><b>{result.condition_classification.condition}</b></div><div><small>Damage rating</small><b>Wear Index {result.condition_classification.wear_index_score.toFixed(1)} / 100</b></div></div>{technical(<div className="aa-technical-details"><div><small>Triage model confidence</small><b>{(result.condition_classification.confidence * 100).toFixed(1)}%</b></div><div><small>Component classification</small><b>{result.brake_component_type || "Not supplied"}</b></div><div><small>Inspection tracking ID</small><b>{result.image_id}</b></div><div><small>Inference execution engine</small><b>{result.model_name} · {result.inference_mode.toUpperCase()}</b></div></div>)}</article>
    <article className="panel aa-manager-card"><div className="aa-manager-card-head"><span>🔍 Visual Defect Detection & Location</span><Badge tone={primary ? (primary.severity === "critical" || primary.severity === "high" ? "reject" : "review") : "passed"}>{primary ? primary.severity.toUpperCase() : "NO DEFECT FOUND"}</Badge></div>{primary ? <div className="aa-manager-highlights"><div><small>Primary defect</small><b>{primary.defect_type}</b></div><div><small>AI confidence</small><b>{(primary.confidence * 100).toFixed(1)}% certainty</b></div><div><small>Damaged surface footprint</small><b>{primary.area_percentage.toFixed(2)}% of rotor surface</b></div><div><small>Location zone</small><b>{primary.location || "Outer Friction Track"}</b></div></div> : <p className="aa-manager-empty">The backend returned no detected defect regions.</p>}{technical(<div className="aa-technical-details">{primary && <><div><small>Exact pixel coordinates</small><b>[X₁: {primary.bbox[0].toFixed(1)}, Y₁: {primary.bbox[1].toFixed(1)} — X₂: {primary.bbox[2].toFixed(1)}, Y₂: {primary.bbox[3].toFixed(1)}] px</b></div><div><small>Segmentation polygon</small><b>{primary.mask_polygon?.length ?? 0} contour points returned</b></div></>}<div><small>Total defects localized</small><b>{result.defect_count} regions flagged</b></div><div><small>Image resolution</small><b>{result.image_width} × {result.image_height} px</b></div>{result.detections.map((item, index) => <div key={`defect-tech-${index}`}><small>Region {index + 1} · {item.defect_type}</small><b>{item.location || "Location not supplied"} · {(item.confidence * 100).toFixed(1)}% · {item.severity}</b></div>)}</div>)}</article>
    {(fmea || quality) && <article className="panel aa-manager-card"><div className="aa-manager-card-head"><span>🏭 Station Risk & Root Cause (FMEA)</span><Badge tone={fmea ? fmeaTone(fmea) : "neutral"}>{fmea ? `RPN ${fmea.rpn}` : `RPN ${quality?.highest_rpn ?? "—"}`}</Badge></div><div className="aa-manager-highlights"><div><small>Faulty station</small><b>{origin}</b></div><div><small>Root cause summary</small><b>{rootCause}</b></div><div><small>Failure mode</small><b>{failureMode}</b></div><div><small>Visual effect code</small><b>{fmea?.visual_effect_code ?? "Not supplied by backend"}</b></div></div>{technical(<div className="aa-technical-details">{fmea && <><div><small>Risk Priority Number</small><b>RPN {fmea.rpn}</b></div><div><small>Formula breakdown</small><b>Severity ({fmea.severity_s}) × Occurrence ({fmea.occurrence_o}) × Detection ({fmea.detection_d})</b></div></>}<div><small>Priority tier rank</small><b>{priority}</b></div><div className="aa-technical-detection"><small>Mechanical explanation</small><b>{primary?.explanation || "No mechanical explanation returned by the backend."}</b></div></div>)}</article>}
    {quality && <article className="panel aa-manager-card"><div className="aa-manager-card-head"><span>🛠️ Production Line Decision & Corrective Action</span><Badge tone={/reject|stop line/i.test(quality.line_decision) ? "reject" : /rework|review/i.test(quality.line_decision) ? "review" : "passed"}>{quality.line_decision}</Badge></div><div className="aa-manager-highlights"><div><small>Immediate station action</small><b>{fmea ? fmeaAction(fmea) : "See process adjustments below"}</b></div><div><small>Highest RPN</small><b>{quality.highest_rpn} · {quality.rpn_priority_tier}</b></div></div>{technical(<div className="aa-technical-details"><div><small>DTV (limit ≤ 5 µm)</small><b>{quality.dtv_value_um} µm · {quality.dtv_tolerance_status}</b></div><div><small>Lateral runout (limit ≤ 25 µm)</small><b>{quality.runout_value_um} µm · {quality.runout_tolerance_status}</b></div><div><small>Parallelism (limit ≤ 40 µm)</small><b>{quality.parallelism_value_um} µm · {quality.parallelism_tolerance_status}</b></div><div className="aa-technical-detection"><small>Multi-sensor fusion note</small><b>{quality.sensor_integration_note}</b><span>These returned values are rule-derived estimates, not live readings from connected calibrated probes.</span></div><div className="aa-technical-detection"><small>Engineering workshop action</small><b>{primary?.recommendation || (fmea ? fmeaAction(fmea) : "No corrective action returned")}</b></div>{quality.recommended_process_adjustments.length > 0 && <div className="aa-technical-detection"><small>Maintenance adjustments</small>{quality.recommended_process_adjustments.map((action, index) => <label className="aa-maintenance-check" key={`adjustment-${index}`}><input type="checkbox"/><span>{action}</span></label>)}</div>}</div>)}</article>}
    {unknown && <div className="aa-anomaly-banner" role="alert"><b>Unclassified Visual Anomaly Spotted — Quarantined for Expert Evaluation</b><button className="button button-secondary" onClick={() => navigate("Human Review", result.image_id)}>Open in Human Review Workspace →</button></div>}
    <div className="aa-analysis-actions"><button className="button button-secondary" onClick={() => navigate("Main Dashboard")}>Main dashboard</button></div>
  </section>;
}

function MachineAnalyticsPanel({ historicalAnalytics: analytics, analyticsStatus: status, analyticsError, refreshAnalytics: onRefresh }: Pick<Props, "historicalAnalytics" | "analyticsStatus" | "analyticsError" | "refreshAnalytics">) {
  const warnings = analytics?.active_early_warnings ?? [];
  return <section className="aa-machine-analytics" aria-label="Live machine analytics">
    <div className="aa-live-analytics-heading"><div><span className="eyebrow"><span className="eyebrow-line"/>LIVE BACKEND ANALYTICS</span><h2>Machine Heatmap &amp; Predictive Warnings</h2><p>Aggregated from backend inspection history · refreshed after each new inspection</p></div><div className="aa-live-analytics-actions"><Badge tone={status === "online" ? "passed" : status === "refreshing" ? "review" : "neutral"}>{status === "online" ? "LIVE DATA" : status === "refreshing" ? "REFRESHING" : status === "loading" ? "LOADING" : "BACKEND UNAVAILABLE"}</Badge><button className="button button-secondary" onClick={onRefresh} disabled={status === "loading" || status === "refreshing"}>Refresh data</button></div></div>
    {!analytics && <div className={`aa-backend-empty ${status === "offline" ? "offline" : ""}`} role="status">{status === "offline" ? `Live predictive analytics are unavailable. ${analyticsError || "Connect the backend to load real heatmap and warning data."}` : "Loading analytics directly from the backend…"}</div>}
    {analytics && status === "offline" && <div className="aa-analytics-stale" role="status">Backend connection lost. Showing the last analytics response received from the backend.</div>}
    {analytics && <><div className="aa-warning-list"><div className="aa-section-heading"><div><h3>Live Predictive Early Warning</h3><p>Warnings returned by the backend signature engine</p></div><Badge tone={warnings.length ? (warnings.some((warning) => warning.severity_level === "critical") ? "reject" : "review") : analytics.total_inspections > 0 ? "passed" : "neutral"}>{warnings.length ? `${warnings.length} active warning${warnings.length === 1 ? "" : "s"}` : analytics.total_inspections > 0 ? "NOMINAL" : "NO HISTORY"}</Badge></div>{warnings.length ? warnings.map((warning, index) => { const dispatchKey = `predictive:${warning.machine_code}:${warning.failure_mode}:${warning.spatial_signature}:${warning.evidence_count}`; return <article className={`aa-predictive-warning ${warning.severity_level}`} key={`${warning.machine_code}-${warning.station}-${index}`}><div className="aa-warning-title"><span>⚠</span><b>PREDICTIVE EARLY WARNING — MACHINE DRIFT DETECTED</b><Badge tone={warning.severity_level === "critical" ? "reject" : "review"}>{warning.severity_level.toUpperCase()}</Badge></div><div className="aa-warning-machine">{warning.machine_code} · {warning.station}</div><div className="aa-warning-facts"><div><small>Failure mode forecast</small><b>{warning.failure_mode} · {(warning.confidence * 100).toFixed(0)}% confidence</b></div><div><small>Spatial signature</small><b>{warning.spatial_signature}</b></div><div><small>Root cause &amp; action</small><b>{warning.alert_message}</b><span>Recommended action: {warning.recommended_action}</span></div><div><small>Evidence</small><b>{warning.evidence_count} records · trend slope {warning.recent_trend_slope.toFixed(2)}</b></div></div><p>{warning.potential_causes}</p><WhatsAppDispatchAction details={{ station: warning.station, failureMode: warning.failure_mode, probability: `${(warning.confidence * 100).toFixed(0)}%`, action: warning.recommended_action, partId: warning.machine_code, dispatchKey }} thresholdLabel={warning.confidence >= 0.75 ? `Automatic alert rule met · ${ (warning.confidence * 100).toFixed(0)}% confidence; manual dispatch also available` : `Manual dispatch available · automatic threshold is 75% (currently ${(warning.confidence * 100).toFixed(0)}%)`}/></article>; }) : analytics.total_inspections > 0 ? <div className="aa-nominal-signature"><span>✓</span><b>All Station Signatures Nominal — Zero Machine Drift Detected</b><small>Based on {analytics.total_inspections} records returned by the backend.</small></div> : <div className="aa-backend-empty">No backend inspection history has been recorded yet. Predictive status will appear after real inspections are logged.</div>}</div><RotorHeatmap machineHeatmaps={analytics.machine_heatmaps}/></>}
  </section>;
}

function HistoricalDataPrediction({ historicalAnalytics, historicalRecords, analyticsStatus, analyticsError, refreshAnalytics }: Props) {
  const [page, setPage] = useState(1);
  const pageSize = 50;
  const pageCount = Math.max(1, Math.ceil(historicalRecords.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const records = historicalRecords.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const first = historicalRecords.length ? (currentPage - 1) * pageSize + 1 : 0;
  const last = Math.min(currentPage * pageSize, historicalRecords.length);
  return <><Header eyebrow="BACKEND HISTORY & PREDICTION" title="Historical Data & Prediction" subtitle="Backend-recorded inspection history, machine heatmaps, and early warnings" action={<button className="button button-secondary" onClick={refreshAnalytics}>Refresh live data</button>}/>
    {historicalAnalytics && <div className="stat-grid aa-backend-kpis"><MiniStat title="BACKEND INSPECTIONS" value={String(historicalAnalytics.total_inspections)} caption="Historical records"/><MiniStat title="PASS RATE" value={`${historicalAnalytics.pass_rate.toFixed(1)}%`} caption="Backend disposition" tone="green"/><MiniStat title="REVIEW RATE" value={`${historicalAnalytics.review_rate.toFixed(1)}%`} caption="Backend disposition" tone="amber"/><MiniStat title="REJECT RATE" value={`${historicalAnalytics.reject_rate.toFixed(1)}%`} caption="Backend disposition" tone="violet"/></div>}
    <MachineAnalyticsPanel historicalAnalytics={historicalAnalytics} analyticsStatus={analyticsStatus} analyticsError={analyticsError} refreshAnalytics={refreshAnalytics}/>
    <section className="panel aa-backend-history"><div className="aa-section-heading"><div><h2>Historical Inspection Records</h2><p>Live records from AutoInspect backend history</p></div><Badge>{historicalRecords.length} loaded</Badge></div>{historicalAnalytics && analyticsStatus === "online" && analyticsError && <div className="aa-analytics-stale">History endpoint unavailable; showing records included in the backend analytics response.</div>}{records.length ? <><div className="table-scroll"><table><thead><tr><th>TIME · PART</th><th>IMAGES</th><th>RESULT</th><th>DEFECTS</th><th>CONDITION</th><th>WEAR INDEX</th><th>STATION / RPN</th></tr></thead><tbody>{records.map((record) => <tr key={`${record.id ?? record.part_id}-${record.part_id}`}><td><b>{record.part_id}</b><small className="aa-history-subline">{record.image_filename} · {new Date(record.timestamp).toLocaleString()}</small></td><td><div className="aa-history-image-links">{record.raw_image_url && <a href={record.raw_image_url} target="_blank" rel="noreferrer">Original</a>}{record.annotated_image_url && <a href={record.annotated_image_url} target="_blank" rel="noreferrer">YOLO view</a>}{record.heatmap_image_url && <a href={record.heatmap_image_url} target="_blank" rel="noreferrer">Heatmap</a>}{!record.raw_image_url && !record.annotated_image_url && !record.heatmap_image_url && <span>Not archived</span>}</div></td><td><Badge tone={record.overall_status === "PASS" ? "passed" : record.overall_status === "REJECT" ? "reject" : "review"}>{record.overall_status}</Badge></td><td>{record.defect_count ? record.defects.map((defect, index) => <span className="aa-backend-defect-chip" key={`${defect.defect_type}-${index}`}>{defect.defect_type} · {defect.clock_hour.toFixed(1)}h</span>) : "None detected"}</td><td>{record.condition}</td><td>{record.wear_index_score.toFixed(1)}</td><td>{record.station || record.primary_process_code || "—"}<small className="aa-history-subline">RPN {record.highest_rpn}</small></td></tr>)}</tbody></table></div><div className="aa-history-pagination"><span>Showing {first}–{last} of {historicalRecords.length} backend records · Page {currentPage} of {pageCount}</span><div><button className="button button-secondary" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={currentPage === 1}>Previous</button><button className="button button-secondary" onClick={() => setPage((value) => Math.min(pageCount, value + 1))} disabled={currentPage === pageCount}>Next</button></div></div></> : <div className="aa-backend-empty">{analyticsStatus === "offline" ? "Backend history is unavailable. No local or demo records are shown here." : analyticsStatus === "loading" ? "Loading backend inspection history…" : "No historical backend records have been returned yet."}</div>}</section>
  </>;
}

export function AutoAuditView(props: Props) {
  if (props.view === "AI Inspection Studio") return <Inspector {...props}/>;
  if (props.view === "Inspection History") return <UploadHistory historicalRecords={props.historicalRecords} analyticsStatus={props.analyticsStatus} analyticsError={props.analyticsError} title="Inspection History"/>;
  if (props.view === "Historical Data & Prediction") return <HistoricalDataPrediction {...props}/>;
  if (props.view === "Batch Data") return <BatchData {...props}/>;
  if (props.view === "Fault Intelligence Board") return <MachineIntelligence {...props}/>;
  if (props.view === "Human Review") return <HumanReview {...props}/>;
  return <Overview {...props}/>;
}

function UploadHistory({ historicalRecords, analyticsStatus, analyticsError, title = "Inspection Upload History" }: Pick<Props, "historicalRecords" | "analyticsStatus" | "analyticsError"> & { title?: string }) {
  const [requestedPage, setRequestedPage] = useState(1);
  const pageSize = 50;
  const pageCount = Math.max(1, Math.ceil(historicalRecords.length / pageSize));
  const page = Math.min(requestedPage, pageCount);
  const first = historicalRecords.length ? (page - 1) * pageSize + 1 : 0;
  const last = Math.min(page * pageSize, historicalRecords.length);
  const visibleRecords = historicalRecords.slice((page - 1) * pageSize, page * pageSize);
  return <section className="panel aa-upload-log"><div className="panel-heading"><div><h2>{title}</h2><p>Shared inspection records returned by the backend database</p></div><Badge>{historicalRecords.length} records</Badge></div>{analyticsStatus === "offline" && <div className="aa-analytics-stale">Backend history unavailable: {analyticsError || "connect to the backend to load shared records"}</div>}{historicalRecords.length ? <><div className="table-scroll"><table><thead><tr><th>PART / BATCH</th><th>FINDING</th><th>RESULT</th><th>DEFECTS</th><th>STATION · RPN</th><th>DATE</th><th>IMAGES</th></tr></thead><tbody>{visibleRecords.map((record) => <tr key={record.part_id}><td><b>{record.part_id}</b><small className="aa-history-subline">{record.batch_id || "Unassigned batch"}</small></td><td><b>{record.image_filename}</b><small className="aa-history-subline">{record.top_failure_mode || record.defects[0]?.defect_type || "No defect detected"}</small></td><td><Badge tone={record.overall_status === "PASS" ? "passed" : record.overall_status === "REJECT" ? "reject" : "review"}>{record.overall_status}</Badge></td><td>{record.defect_count}</td><td>{record.station || record.primary_process_code || "—"}<small className="aa-history-subline">RPN {record.highest_rpn}</small></td><td>{new Date(record.timestamp).toLocaleString()}</td><td><div className="aa-history-image-links">{record.raw_image_url && <a href={record.raw_image_url} target="_blank" rel="noreferrer">Original</a>}{record.annotated_image_url && <a href={record.annotated_image_url} target="_blank" rel="noreferrer">YOLO view</a>}{!record.raw_image_url && !record.annotated_image_url && <span>Not archived</span>}</div></td></tr>)}</tbody></table></div><div className="aa-history-pagination"><span>Showing {first}–{last} of {historicalRecords.length} backend records · Page {page} of {pageCount}</span><div><button className="button button-secondary" onClick={() => setRequestedPage((current) => Math.max(1, current - 1))} disabled={page === 1}>Previous</button><button className="button button-secondary" onClick={() => setRequestedPage((current) => Math.min(pageCount, current + 1))} disabled={page === pageCount}>Next</button></div></div></> : <div className="aa-upload-log-empty"><b>{analyticsStatus === "loading" || analyticsStatus === "refreshing" ? "Loading backend inspection history…" : "No backend inspections found"}</b><span>{analyticsStatus === "offline" ? "This shared history is unavailable until the backend reconnects." : "Upload a component in AI Inspection Studio to begin the shared inspection log."}</span></div>}</section>;
}

function Overview({ navigate, dashboardAnalytics }: Props) {
  const totalInspected = dashboardAnalytics?.total_inspections ?? 0;
  const passedCount = dashboardAnalytics?.passed_count ?? 0;
  const rejectedCount = dashboardAnalytics?.rejected_count ?? 0;
  const fpy = totalInspected ? passedCount / totalInspected * 100 : 0;
  const rejectRate = totalInspected ? rejectedCount / totalInspected * 100 : 0;
  const realAiCount = dashboardAnalytics?.real_ai_count ?? 0;
  const defectRanking = (dashboardAnalytics?.defect_breakdown ?? []).map((entry) => [entry.defect_type, entry.count] as [string, number]);
  const topDefectName = defectRanking[0]?.[0] ?? "No Defects Detected";
  const defectTotal = dashboardAnalytics?.total_defects ?? 0;
  const stations = (dashboardAnalytics?.station_ranking ?? []).map((entry) => [entry.station, { rpn: entry.max_rpn, tier: entry.max_rpn >= 200 ? "Priority 1 (Critical)" : entry.max_rpn >= 100 ? "Priority 2 (High)" : "Logged", mode: entry.failure_mode ?? "Recorded failure mode", action: entry.recommended_action ?? "Review station action" }] as [string, { rpn: number; tier: string; mode: string; action: string }]);
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
  const trendPoints = (dashboardAnalytics?.batch_trend ?? []).slice(-8).map((point) => ({ batchId: point.batch_id, totalParts: point.total_parts, defectCount: point.defect_count, defectRate: point.defect_rate, yieldRate: point.yield_rate }));
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
    <Header eyebrow="AUTOAUDIT · PLANT QUALITY" title="Main Dashboard" subtitle="Plant-wide quality metrics from shared backend inspection records" action={<div className="aa-overview-actions"><button className="button button-secondary" onClick={() => navigate("Batch Data")}>Batch data</button><button className="button button-secondary" onClick={() => navigate("Inspection History")}>Inspection history</button><button className="button button-primary" onClick={() => navigate("AI Inspection Studio")}>Inspect component</button></div>}/>
    <section className="aa-executive-kpis" aria-label="Executive quality metrics">
      <article className="panel aa-executive-kpi"><span className="aa-executive-label">PLANT QUALITY YIELD</span><b className={fpy >= 90 ? "good" : "bad"}>{fpy.toFixed(1)}%</b><small>Target: 95.0% · Calculated from {totalInspected} parts</small><Badge tone={fpy >= 95 ? "passed" : "reject"}>{fpy >= 95 ? "ON TARGET" : "BELOW SPEC"}</Badge></article>
      <article className="panel aa-executive-kpi"><span className="aa-executive-label">COMPONENTS PROCESSED</span><b>{totalInspected}</b><small>{realAiCount} Real AI verified · {totalInspected - realAiCount} demo / other</small></article>
      <article className="panel aa-executive-kpi"><span className="aa-executive-label">PARTS REJECTED</span><b>{rejectedCount} <small>({rejectRate.toFixed(1)}%)</small></b><small>Rejected out of {totalInspected} inspected parts</small></article>
      <article className="panel aa-executive-kpi"><span className="aa-executive-label">PRIMARY DEFECT MODE</span><b className="aa-executive-hazard">{topDefectName}</b><small>Attributed station: {topStationName}</small></article>
    </section>
    <section className="panel aa-trend-panel"><div className="aa-section-heading"><div><h2>Batch Defect Rate Trend &amp; SPC Quality Limit</h2><p>Production batch results from PostgreSQL · latest {trendPoints.length} shown</p></div><div className="aa-trend-legend"><span><i className="aa-legend-blue"/>Defect rate</span><span className="aa-ucl-legend"><i/>10.0% scrap limit</span></div></div>
      {trendPoints.length ? <><div className="aa-trend-plot"><svg viewBox={`0 0 ${chart.width} ${chart.height}`} role="img" aria-label="Interactive defect rate and yield trend for recent daily upload groups">
        <defs><linearGradient id="aa-trend-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#3b82f6" stopOpacity=".2"/><stop offset="100%" stopColor="#3b82f6" stopOpacity="0"/></linearGradient></defs>
        <text x="13" y={(chart.top + chart.bottom) / 2} transform={`rotate(-90 13 ${(chart.top + chart.bottom) / 2})`} textAnchor="middle" fill="#64748b" fontSize="10" fontWeight="700">DEFECT RATE (%)</text>
        {yTicks.map((tick) => <g key={tick}><line x1={chart.left} x2={chart.right} y1={yFor(tick)} y2={yFor(tick)} stroke="#e8edf4" strokeWidth="1"/><text x={chart.left - 9} y={yFor(tick) + 4} textAnchor="end" fill="#64748b" fontSize="10">{tick}%</text></g>)}
        <line x1={chart.left} x2={chart.right} y1={yFor(10)} y2={yFor(10)} stroke="#ef4444" strokeWidth="1.5" strokeDasharray="6 4"/><text x={chart.right - 2} y={yFor(10) - 6} textAnchor="end" fill="#dc4545" fontSize="10" fontWeight="700">10% Scrap Limit</text>
        <polygon points={areaPoints} fill="url(#aa-trend-fill)"/>
        {trendPoints.length > 1 && <polyline points={linePoints} fill="none" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>}
        {trendPoints.map((point, index) => { const x = xFor(index); const y = yFor(point.defectRate); const over = point.defectRate > 10; const dateLabel = point.batchId; return <g key={point.batchId} tabIndex={0} role="button" aria-label={`${point.batchId}: ${point.defectRate.toFixed(1)} percent defect rate, ${point.yieldRate.toFixed(1)} percent yield, ${point.defectCount} defective of ${point.totalParts} parts`} onMouseEnter={() => setHoveredPoint(index)} onMouseLeave={() => setHoveredPoint(null)} onFocus={() => setHoveredPoint(index)} onBlur={() => setHoveredPoint(null)} onClick={() => setPinnedPoint(pinnedPoint === index ? null : index)} className="aa-trend-point"><title>{`${point.batchId} · ${point.defectRate.toFixed(1)}% defects · ${point.yieldRate.toFixed(1)}% yield · n=${point.totalParts}`}</title>{over && <circle cx={x} cy={y} r="12" className="aa-trend-pulse"/>}<circle cx={x} cy={y} r="6.5" fill={over ? "#ef4444" : "#3b82f6"} stroke="white" strokeWidth="2.5"/><text x={x} y={Math.max(14, y - 13)} textAnchor="middle" fill={over ? "#dc2626" : "#1e3a8a"} fontSize="12" fontWeight="700">{point.defectRate.toFixed(1)}%</text><text x={x} y={chart.bottom + 20} textAnchor="middle" fill="#64748b" fontSize="11">{dateLabel}</text><text x={x} y={chart.bottom + 35} textAnchor="middle" fill="#64748b" fontSize="10">n={point.totalParts}</text></g>; })}
        <text x={(chart.left + chart.right) / 2} y="234" textAnchor="middle" fill="#64748b" fontSize="10" fontWeight="700">PRODUCTION BATCH · PARTS INSPECTED</text>
      </svg></div>{activePoint !== null && trendPoints[activePoint] && <div className="aa-trend-detail" aria-live="polite"><b>{trendPoints[activePoint].batchId}</b><span>{trendPoints[activePoint].defectCount} defective of {trendPoints[activePoint].totalParts} parts</span><span>Defect rate {trendPoints[activePoint].defectRate.toFixed(1)}%</span><span>Yield {trendPoints[activePoint].yieldRate.toFixed(1)}%</span></div>}<p className="aa-trend-note">Defect rate = parts with one or more detected defects ÷ all inspected parts in each production batch. Hover, focus, or click a point for details.</p></> : <div className="aa-dashboard-empty">Record inspections with a production batch ID to build this trend.</div>}
    </section>
    <section className="aa-dashboard-split"><article className="panel aa-breakdown-panel"><div className="aa-section-heading"><div><h2>Defect Type Breakdown</h2><p>{defectTotal} detected regions in {totalInspected} parts</p></div></div>{defectTotal ? <div className="aa-pareto-list">{groupedDefects.filter((item) => item.count > 0).map((item) => <div className="aa-pareto-row" key={item.name}><span>{item.name}</span><div><i style={{ width: `${item.count / Math.max(...groupedDefects.map((row) => row.count)) * 100}%`, backgroundColor: item.color }}/></div><b>{(item.count / defectTotal * 100).toFixed(1)}%</b><small>{item.count}</small></div>)}</div> : <div className="aa-dashboard-empty">No defect types returned yet.</div>}</article>
      <article className="panel aa-station-panel"><div className="aa-section-heading"><div><h2>Station Root Cause Ranking</h2><p>FMEA returned by inspection results</p></div></div>{stations.length ? <div className="aa-station-ranking">{stations.slice(0, 5).map(([name, risk]) => <div className="aa-station-risk" key={name}><div className="aa-station-risk-head"><b>{name}</b><Badge tone={/critical|priority 1|top 1-5/i.test(risk.tier) ? "reject" : /high|priority 2|top 6-10/i.test(risk.tier) ? "review" : "neutral"}>RPN {risk.rpn} · {risk.tier}</Badge></div><span>{risk.mode}</span><small>Corrective action: {risk.action}</small></div>)}</div> : <div className="aa-dashboard-empty">Station ranking appears when the backend returns FMEA data.</div>}</article>
    </section>
  </div>;
}

function Inspector({ uploadLogs, selectedPart, setSelectedPart, navigate, backendOnline, inferenceMode, onInspectionCreated, historicalAnalytics, analyticsStatus, analyticsError, refreshAnalytics }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [annotatedPreview, setAnnotatedPreview] = useState("");
  const [fileMessage, setFileMessage] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [scanning, setScanning] = useState(false);
  const [batchId, setBatchId] = useState("");
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
      const response = await uploadAndInspectImage(next, batchId);
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
    {!current && <label className="aa-batch-id-field"><span>Production batch ID <small>Optional · the same ID groups parts from one run</small></span><input value={batchId} maxLength={80} disabled={scanning} onChange={(event) => setBatchId(event.target.value)} placeholder="e.g. BATCH-2026-104"/></label>}
    {!current && <section className={`aa-primary-upload aa-upload-hero ${scanning ? "scanning" : ""}`} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); if (!scanning) chooseFile(event.dataTransfer.files?.[0]); }} aria-label="Upload brake component image"><input ref={inputRef} type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" hidden onChange={(event) => { chooseFile(event.currentTarget.files?.[0]); event.currentTarget.value = ""; }}/><span className="aa-primary-upload-icon">⇧</span><div className="aa-primary-upload-copy"><b>{scanning ? "Checking image with YOLO…" : "Drop or choose a brake image"}</b><span>{scanning ? "Your inspection results will appear here." : "JPG, PNG or WEBP · Up to 20 MB · YOLO starts automatically"}</span>{file && <small>{file.name}</small>}</div><div className="aa-primary-upload-actions"><button className="button button-primary aa-primary-upload-button" disabled={scanning} onClick={() => inputRef.current?.click()}>{scanning ? "Checking…" : "Choose image"}</button>{file && <button className="button button-secondary" disabled={scanning} onClick={clearUpload}>Clear</button>}</div>{scanning && <span className="aa-spinner" aria-label="Inspection in progress"/>}</section>}
    {!current && uploadError && <div className="aa-upload-feedback" role="alert"><span>{uploadError}</span><button className="button button-secondary" onClick={() => { clearUpload(); inputRef.current?.click(); }}>Choose image</button></div>}
    {!current && file && preview && <section className="panel aa-inspector-image"><div className="panel-heading"><div><h2>Uploaded image</h2><p>{file.name} · {scanning ? "YOLO inference in progress" : "Preview"}</p></div></div><Image unoptimized width={1200} height={1200} src={preview} alt={`Uploaded brake component ${file.name}`} className="aa-upload-preview"/>{scanning && <div className="aa-scanning-overlay"><span className="aa-spinner"/>Running YOLOv8 Inspection...</div>}</section>}
    {current && preview && <><div className={`aa-inspector-grid ${full ? "fullscreen-image" : ""}`}><section className={`panel aa-inspector-image has-live-result ${full ? "aa-image-full" : ""}`}><div className="panel-heading"><div><h2>Original & YOLO detection</h2><p>{currentLog?.fileName ?? file?.name ?? current.brake_component_type}</p></div><button className="icon-button" onClick={() => setFull(!full)} aria-label={full ? "Exit fullscreen" : "Expand image"}>⛶</button></div><LiveImageComparison source={preview} annotatedSource={annotatedPreview} result={current} selectedIndex={liveSelection} zoom={zoom} onSelect={setLiveSelection}/><div className="aa-viewer-toolbar"><button onClick={() => setZoom(Math.max(.8, zoom - .1))} aria-label="Zoom out">−</button><span>{Math.round(zoom * 100)}%</span><button onClick={() => setZoom(Math.min(1.5, zoom + .1))} aria-label="Zoom in">+</button><button onClick={() => setZoom(1)}>Reset zoom</button></div></section></div><LiveInspectionAnalysis result={current} selectedIndex={liveSelection} navigate={navigate}/>{fileMessage && <p className="aa-inspection-message">{fileMessage}</p>}<button className="button button-secondary aa-replace-upload" onClick={clearUpload}>Replace this image</button></>}
    {loadingSaved && <div className="panel aa-live-empty"><span className="aa-spinner"/>Restoring the saved inspection…</div>}
    <MachineAnalyticsPanel historicalAnalytics={historicalAnalytics} analyticsStatus={analyticsStatus} analyticsError={analyticsError} refreshAnalytics={refreshAnalytics}/>
  </div>;
}

function HumanReview({ historicalRecords, refreshAnalytics, navigate }: Props) {
  const queued = historicalRecords.filter((record) => record.review_required && record.review_status === "pending");
  const [reviewer, setReviewer] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busyPart, setBusyPart] = useState("");
  const [message, setMessage] = useState("");
  const decide = async (record: HistoricalInspectionRecord, status: "approved" | "rejected") => {
    if (!reviewer.trim()) { setMessage("Enter the reviewer’s name before saving a decision."); return; }
    setBusyPart(record.part_id); setMessage("");
    try {
      await updateInspectionReview(record.part_id, status, reviewer.trim(), notes[record.part_id] ?? "");
      setMessage(`${record.part_id} marked ${status}.`);
      refreshAnalytics();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save the review decision."); }
    finally { setBusyPart(""); }
  };
  return <><Header eyebrow="HUMAN REVIEW QUEUE" title="Human Review Workspace" subtitle="Shared pending decisions from backend inspections" action={<Badge tone="review">{queued.length} pending</Badge>}/><section className="panel aa-review-controls"><label>Reviewer name<input value={reviewer} maxLength={120} onChange={(event) => setReviewer(event.target.value)} placeholder="Enter your name"/></label><p>Decisions are saved to the backend inspection record and become visible to other workspace users.</p>{message && <div role="status">{message}</div>}</section>{queued.length ? <section className="panel aa-backend-history"><div className="table-scroll"><table><thead><tr><th>PART / BATCH</th><th>FINDING</th><th>RISK</th><th>IMAGE</th><th>REVIEW DECISION</th></tr></thead><tbody>{queued.map((record) => <tr key={record.part_id}><td><b>{record.part_id}</b><small className="aa-history-subline">{record.batch_id || "Unassigned batch"} · {new Date(record.timestamp).toLocaleString()}</small></td><td>{record.top_failure_mode || record.defects[0]?.defect_type || "Inspection flagged"}<small className="aa-history-subline">{record.station || record.primary_process_code || "Station unavailable"}</small></td><td><Badge tone={record.overall_status === "REJECT" ? "reject" : "review"}>{record.overall_status} · RPN {record.highest_rpn}</Badge></td><td>{record.raw_image_url ? <a href={record.raw_image_url} target="_blank" rel="noreferrer">Original</a> : "Not archived"}{record.annotated_image_url && <> · <a href={record.annotated_image_url} target="_blank" rel="noreferrer">YOLO view</a></>}</td><td><div className="aa-review-actions"><textarea aria-label={`Review notes for ${record.part_id}`} maxLength={2000} value={notes[record.part_id] ?? ""} onChange={(event) => setNotes((all) => ({ ...all, [record.part_id]: event.target.value }))} placeholder="Review notes (optional)"/><button className="button button-secondary" disabled={Boolean(busyPart)} onClick={() => void decide(record, "approved")}>{busyPart === record.part_id ? "Saving…" : "Approve"}</button><button className="button button-danger" disabled={Boolean(busyPart)} onClick={() => void decide(record, "rejected")}>Reject</button></div></td></tr>)}</tbody></table></div></section> : <section className="panel aa-manager-empty"><h2>No inspections awaiting review</h2><p>New critical, high-risk, and low-confidence inspections will appear here from the shared database.</p><button className="button button-secondary" onClick={() => navigate("AI Inspection Studio")}>Return to AI Inspection Studio</button></section>}</>;
}

function BatchData({ batchSummaries, historicalRecords, navigate }: Props) {
  const [activeBatch, setActiveBatch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 50;
  const records = historicalRecords.filter((record) => (record.batch_id || "UNASSIGNED") === activeBatch);
  const pageCount = Math.max(1, Math.ceil(records.length / pageSize));
  const visibleRecords = records.slice((page - 1) * pageSize, page * pageSize);
  const realBatchCount = batchSummaries.filter((batch) => batch.batch_id !== "UNASSIGNED").length;
  return <><Header eyebrow="BATCH RECORDS" title="Batch Data" subtitle="Production batch records shared by the backend database" action={<button className="button button-secondary" onClick={() => navigate("Inspection History")}>Full inspection history</button>}/><div className="stat-grid aa-batch-summary"><MiniStat title="TOTAL PROCESSED" value={String(batchSummaries.reduce((sum, batch) => sum + batch.total_parts, 0))} caption="Database inspection records" tone="blue"/><MiniStat title="PRODUCTION BATCHES" value={String(realBatchCount)} caption="Explicitly assigned batch IDs" tone="violet"/><MiniStat title="UNASSIGNED PARTS" value={String(batchSummaries.find((batch) => batch.batch_id === "UNASSIGNED")?.total_parts ?? 0)} caption="Can be grouped by entering a batch ID on upload" tone="amber"/></div>{batchSummaries.length ? <div className="aa-batch-groups">{batchSummaries.map((batch) => <article className="panel aa-batch-group" key={batch.batch_id}><button className="aa-batch-summary-button" onClick={() => { setActiveBatch((current) => current === batch.batch_id ? "" : batch.batch_id); setPage(1); }}><span><b>{batch.batch_id === "UNASSIGNED" ? "Unassigned inspections" : batch.batch_id}</b><small>{batch.total_parts} parts · latest {new Date(batch.latest_inspection).toLocaleString()}</small></span><span className="aa-batch-group-metrics"><Badge tone="passed">{batch.pass_count} pass</Badge><Badge tone="review">{batch.review_count} review</Badge><Badge tone="reject">{batch.reject_count} reject</Badge><b>{batch.defect_rate.toFixed(1)}% defect rate · {activeBatch === batch.batch_id ? "Hide" : "View"}</b></span></button>{activeBatch === batch.batch_id && <><div className="aa-batch-database-metrics"><span>{batch.defect_count} detection regions</span><span>{batch.yield_rate.toFixed(1)}% first-pass yield</span><span>{batch.defect_parts} parts with defects</span></div><div className="table-scroll"><table><thead><tr><th>PART / TIME</th><th>RESULT</th><th>DEFECTS</th><th>CONDITION</th><th>STATION · RPN</th><th>ARCHIVED IMAGES</th></tr></thead><tbody>{visibleRecords.map((record) => <tr key={record.part_id}><td><b>{record.part_id}</b><small className="aa-history-subline">{record.image_filename} · {new Date(record.timestamp).toLocaleString()}</small></td><td><Badge tone={record.overall_status === "PASS" ? "passed" : record.overall_status === "REJECT" ? "reject" : "review"}>{record.overall_status}</Badge></td><td>{record.defects.map((defect) => defect.defect_type).join(", ") || "None"}</td><td>{record.condition}</td><td>{record.station || record.primary_process_code || "—"} · RPN {record.highest_rpn}</td><td>{record.raw_image_url && <a href={record.raw_image_url} target="_blank" rel="noreferrer">Original</a>}{record.annotated_image_url && <> · <a href={record.annotated_image_url} target="_blank" rel="noreferrer">YOLO</a></>}{!record.raw_image_url && "Not archived"}</td></tr>)}</tbody></table></div><div className="aa-history-pagination"><span>Showing {(page - 1) * pageSize + (visibleRecords.length ? 1 : 0)}–{Math.min(page * pageSize, records.length)} of {records.length} batch records · page {page} of {pageCount}</span><div><button className="button button-secondary" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</button><button className="button button-secondary" disabled={page >= pageCount} onClick={() => setPage((value) => value + 1)}>Next</button></div></div></>}</article>)}</div> : <section className="panel aa-manager-empty"><h2>No backend batch data yet</h2><p>Enter a production batch ID in AI Inspection Studio before uploading parts.</p><button className="button button-primary" onClick={() => navigate("AI Inspection Studio")}>Inspect a component</button></section>}</>;
}

function MachineIntelligence({ navigate, historicalAnalytics, dashboardAnalytics, analyticsStatus, analyticsError, refreshAnalytics }: Props) {
  const stations = dashboardAnalytics?.station_ranking ?? [];
  const maxRpn = stations.reduce((max, station) => Math.max(max, station.max_rpn), 0);
  return <><Header eyebrow="FAULT INTELLIGENCE BOARD" title="Fault Intelligence Board" subtitle="Station failure patterns and machine risk from shared backend records" action={<Badge>{stations.length} stations</Badge>}/><div className="stat-grid"><MiniStat title="SAVED INSPECTIONS" value={String(dashboardAnalytics?.total_inspections ?? 0)} caption="Shared backend records"/><MiniStat title="STATIONS WITH FMEA" value={String(stations.length)} caption="Database-linked station records" tone="blue"/><MiniStat title="HIGHEST RPN" value={maxRpn ? String(maxRpn) : "—"} caption={maxRpn ? "From saved FMEA evaluations" : "No FMEA data returned"} tone="amber"/><MiniStat title="MACHINE RISK" value="Live feed" caption="Predictive analytics below" tone="violet"/></div><section className="panel aa-telemetry-panel"><div className="panel-heading"><div><h2>Failure frequency by station</h2><p>Inspection counts and maximum RPN from the shared backend database</p></div></div>{stations.length ? stations.map((value) => <div className="aa-distribution-row" key={value.station}><span>{value.station}</span><div><i style={{width:`${Math.max(5, value.max_rpn / maxRpn * 100)}%`}}/></div><b>RPN {value.max_rpn}</b><small>{value.inspection_count} inspection{value.inspection_count === 1 ? "" : "s"} · {value.failure_mode || "Failure mode unavailable"}</small></div>) : <div className="empty-state">Backend station data will appear after an inspection with FMEA results.</div>}<p className="aa-muted">These database counts describe saved inspections; live sensor telemetry is not connected to this feed.</p><button className="button button-secondary" onClick={() => navigate("Historical Data & Prediction")}>Open backend history &amp; predictions</button></section><MachineAnalyticsPanel historicalAnalytics={historicalAnalytics} analyticsStatus={analyticsStatus} analyticsError={analyticsError} refreshAnalytics={refreshAnalytics}/></>;
}
