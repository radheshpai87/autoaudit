"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { uploadAndInspectImage, type InspectApiResponse } from "../../lib/api";
import { getStoredInspection } from "../../lib/inspection-store";
import type { FMEAEvaluation, InspectionUploadLog } from "../../lib/types";

type ViewName = "Plant Overview" | "AI Inspection Studio" | "Batch Quality Analytics" | "Fault Intelligence Board" | "Human Review";
type Props = { view: ViewName; uploadLogs: InspectionUploadLog[]; selectedPart: string; setSelectedPart: (id: string) => void; navigate: (view: ViewName, partId?: string) => void; backendOnline: boolean; inferenceMode: string; onInspectionCreated: (response: InspectApiResponse, thumbnailDataUrl: string, file: File) => void | Promise<void> };

function fmeaFailure(fmea: FMEAEvaluation) { return fmea.potential_failure_mode ?? fmea.failure_mode ?? "Failure mode"; }
function fmeaStation(fmea: FMEAEvaluation) { return fmea.station ?? fmea.station_origin ?? "Station not supplied"; }
function fmeaTier(fmea: FMEAEvaluation) { return fmea.rpn_rank_tier ?? fmea.priority_tier ?? "Priority unavailable"; }
function fmeaAction(fmea: FMEAEvaluation) { return fmea.recommended_action ?? fmea.station_action ?? "No corrective action supplied"; }
function needsHumanReview(entry: InspectionUploadLog) { return entry.requiresHumanReview === true || entry.detections.some((item) => /unknown anomaly/i.test(item.defectType) || Boolean(item.fmea && item.confidence < 0.5) || item.confidence < 0.5); }
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
    <div className="aa-analysis-actions"><button className="button button-secondary" onClick={() => navigate("Plant Overview")}>Plant overview</button></div>
  </section>;
}

export function AutoAuditView(props: Props) {
  if (props.view === "AI Inspection Studio") return <Inspector {...props}/>;
  if (props.view === "Batch Quality Analytics") return <BatchAnalytics {...props}/>;
  if (props.view === "Fault Intelligence Board") return <MachineIntelligence {...props}/>;
  if (props.view === "Human Review") return <HumanReview {...props}/>;
  return <Overview {...props}/>;
}

function UploadHistory({ uploadLogs, navigate, title = "Inspection Upload History" }: Pick<Props, "uploadLogs" | "navigate"> & { title?: string }) {
  return <section className="panel aa-upload-log"><div className="panel-heading"><div><h2>{title}</h2><p>Saved inspections with backend verdict and part details</p></div><Badge>{uploadLogs.length} uploads</Badge></div>{uploadLogs.length ? <div className="table-scroll"><table><thead><tr><th>IMAGE</th><th>PART / DEFECT</th><th>RESULT</th><th>CONFIDENCE</th><th>STATION · RPN</th><th>DATE</th><th/></tr></thead><tbody>{uploadLogs.map((entry) => <tr key={entry.id}><td>{entry.thumbnailDataUrl ? <Image unoptimized width={48} height={48} src={entry.thumbnailDataUrl} alt={`Thumbnail of ${entry.fileName}`} className="aa-history-thumb"/> : <span className="aa-upload-thumb-empty">◉</span>}</td><td><b>{entry.fileName}</b><small className="aa-history-subline">{entry.defectType || entry.detections[0]?.defectType || "No defect detected"} · {entry.component}</small></td><td><Badge tone={entry.result === "PASS" ? "passed" : entry.result === "REJECT" ? "reject" : "review"}>{entry.result}</Badge></td><td>{((entry.confidence ?? entry.detections[0]?.confidence ?? entry.conditionConfidence) * 100).toFixed(1)}%</td><td>{entry.stationOrigin || "—"}{entry.rpn !== undefined && <small className="aa-history-subline">RPN {entry.rpn}</small>}</td><td>{new Date(entry.uploadedAt).toLocaleString()}</td><td><button className="button button-secondary small-button" onClick={() => navigate("AI Inspection Studio", entry.id)}>Open result</button></td></tr>)}</tbody></table></div> : <div className="aa-upload-log-empty"><b>No components inspected yet</b><span>Upload an image in AI Inspection Studio to begin tracking real plant metrics.</span></div>}</section>;
}

function Overview({ uploadLogs, navigate }: Props) {
  const passed = uploadLogs.filter((entry) => entry.result === "PASS").length;
  const flagged = uploadLogs.filter((entry) => entry.result !== "PASS").length;
  const yieldPercent = uploadLogs.length ? (passed / uploadLogs.length * 100).toFixed(1) : "—";
  return <><Header eyebrow="PLANT OVERVIEW" title="Plant Overview" subtitle="Manager view of parts inspected by the live AutoInspect backend" action={<button className="button button-primary" onClick={() => navigate("AI Inspection Studio")}>Inspect new component</button>}/><div className="stat-grid"><MiniStat title="TOTAL UPLOADS" value={String(uploadLogs.length)} caption="Backend inspections saved"/><MiniStat title="FIRST-PASS YIELD" value={uploadLogs.length ? `${yieldPercent}%` : "—"} caption={`${passed} passed / ${uploadLogs.length} uploads`} tone="green"/><MiniStat title="FLAGGED FOR REVIEW" value={String(flagged)} caption="Review and reject results" tone="amber"/><MiniStat title="DETECTED DEFECTS" value={String(uploadLogs.reduce((sum, entry) => sum + entry.defectCount, 0))} caption="Regions returned by YOLO" tone="violet"/></div>{uploadLogs.length === 0 ? <section className="panel aa-manager-empty"><div className="aa-primary-upload-icon">↑</div><h2>No components inspected yet</h2><p>Upload an image in AI Inspection Studio to begin tracking real plant metrics.</p><button className="button button-primary" onClick={() => navigate("AI Inspection Studio")}>Open AI Inspection Studio</button></section> : <UploadHistory uploadLogs={uploadLogs} navigate={navigate} title="Recent Inspections"/>}</>;
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
    <Header eyebrow="AI INSPECTION STUDIO" title="AI Inspection Studio" subtitle="Upload a brake component image to run the live YOLO quality gate" action={<div className="aa-inspector-actions">{uploadLogs.length > 0 && <label className="aa-part-select"><span>Previous parts</span><select aria-label="Previously inspected parts" value={selectedPart} onChange={(event) => { setUploadError(""); setSelectedPart(event.target.value); }}><option value="">Select a previous part</option>{uploadLogs.map((entry) => <option key={entry.id} value={entry.id}>{entry.fileName} · {new Date(entry.uploadedAt).toLocaleDateString()}</option>)}</select></label>}<button className="button button-primary" onClick={clearUpload}>+ Inspect New Component</button>{current && <Badge tone={current.inference_mode === "real_ai" ? "passed" : "neutral"}>{current.inference_mode === "real_ai" ? "REAL YOLO AI" : "MOCK BACKEND"}</Badge>}{!current && <Badge tone={backendOnline && inferenceMode === "real_ai" ? "passed" : "neutral"}>{backendOnline ? `${inferenceMode.toUpperCase()} READY` : "BACKEND OFFLINE"}</Badge>}</div>}/>
    {!current && <section className={`aa-primary-upload aa-upload-hero ${scanning ? "scanning" : ""}`} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); if (!scanning) chooseFile(event.dataTransfer.files?.[0]); }} aria-label="Upload brake component image"><input ref={inputRef} type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" hidden onChange={(event) => { chooseFile(event.currentTarget.files?.[0]); event.currentTarget.value = ""; }}/><span className="aa-primary-upload-icon">⇧</span><div className="aa-primary-upload-copy"><b>{scanning ? "Checking image with YOLO…" : "Drop or choose a brake image"}</b><span>{scanning ? "Your inspection results will appear here." : "JPG, PNG or WEBP · Up to 20 MB · YOLO starts automatically"}</span>{file && <small>{file.name}</small>}</div><div className="aa-primary-upload-actions"><button className="button button-primary aa-primary-upload-button" disabled={scanning} onClick={() => inputRef.current?.click()}>{scanning ? "Checking…" : "Choose image"}</button>{file && <button className="button button-secondary" disabled={scanning} onClick={clearUpload}>Clear</button>}</div>{scanning && <span className="aa-spinner" aria-label="Inspection in progress"/>}</section>}
    {!current && uploadError && <div className="aa-upload-feedback" role="alert"><span>{uploadError}</span><button className="button button-secondary" onClick={() => { clearUpload(); inputRef.current?.click(); }}>Choose image</button></div>}
    {!current && file && preview && <section className="panel aa-inspector-image"><div className="panel-heading"><div><h2>Uploaded image</h2><p>{file.name} · {scanning ? "YOLO inference in progress" : "Preview"}</p></div></div><Image unoptimized width={1200} height={1200} src={preview} alt={`Uploaded brake component ${file.name}`} className="aa-upload-preview"/>{scanning && <div className="aa-scanning-overlay"><span className="aa-spinner"/>Running YOLOv8 Inspection...</div>}</section>}
    {current && preview && <><div className={`aa-inspector-grid ${full ? "fullscreen-image" : ""}`}><section className={`panel aa-inspector-image has-live-result ${full ? "aa-image-full" : ""}`}><div className="panel-heading"><div><h2>Original & YOLO detection</h2><p>{currentLog?.fileName ?? file?.name ?? current.brake_component_type}</p></div><button className="icon-button" onClick={() => setFull(!full)} aria-label={full ? "Exit fullscreen" : "Expand image"}>⛶</button></div><LiveImageComparison source={preview} annotatedSource={annotatedPreview} result={current} selectedIndex={liveSelection} zoom={zoom} onSelect={setLiveSelection}/><div className="aa-viewer-toolbar"><button onClick={() => setZoom(Math.max(.8, zoom - .1))} aria-label="Zoom out">−</button><span>{Math.round(zoom * 100)}%</span><button onClick={() => setZoom(Math.min(1.5, zoom + .1))} aria-label="Zoom in">+</button><button onClick={() => setZoom(1)}>Reset zoom</button></div></section></div><LiveInspectionAnalysis result={current} selectedIndex={liveSelection} navigate={navigate}/>{fileMessage && <p className="aa-inspection-message">{fileMessage}</p>}<button className="button button-secondary aa-replace-upload" onClick={clearUpload}>Replace this image</button></>}
    {loadingSaved && <div className="panel aa-live-empty"><span className="aa-spinner"/>Restoring the saved inspection…</div>}
    {uploadLogs.length > 0 && <UploadHistory uploadLogs={uploadLogs} navigate={navigate}/>}
  </div>;
}

function HumanReview({ uploadLogs, navigate }: Props) {
  const queued = uploadLogs.filter(needsHumanReview);
  return <><Header eyebrow="HUMAN REVIEW QUEUE" title="Human Review Workspace" subtitle="Low-confidence and unclassified detections held for expert evaluation" action={<Badge tone="review">{queued.length} quarantined</Badge>}/>{queued.length ? <UploadHistory uploadLogs={queued} navigate={navigate} title="Quarantined Components"/> : <section className="panel aa-manager-empty"><h2>No anomalies awaiting review</h2><p>Unclassified findings and detections below 50% confidence are automatically added here.</p><button className="button button-secondary" onClick={() => navigate("AI Inspection Studio")}>Return to AI Inspection Studio</button></section>}</>;
}

function BatchAnalytics({ uploadLogs, navigate }: Props) {
  const counts = uploadLogs.reduce((total, entry) => { total[entry.result] += 1; return total; }, { PASS: 0, REVIEW: 0, REJECT: 0 });
  const distribution = uploadLogs.flatMap((entry) => entry.detections.map((detection) => detection.defectType)).reduce<Record<string, number>>((total, defect) => { total[defect] = (total[defect] ?? 0) + 1; return total; }, {});
  const totalDefects = Object.values(distribution).reduce((sum, count) => sum + count, 0);
  return <><Header eyebrow="BATCH QUALITY ANALYTICS" title="Batch Quality Analytics" subtitle="A live summary of images inspected in this browser" action={<Badge>{uploadLogs.length} uploads</Badge>}/><div className="stat-grid"><MiniStat title="IMAGES CHECKED" value={String(uploadLogs.length)} caption="Saved inspections"/><MiniStat title="PASSED" value={String(counts.PASS)} caption="No rejection returned" tone="green"/><MiniStat title="NEEDS REVIEW" value={String(counts.REVIEW)} caption="Review recommended" tone="amber"/><MiniStat title="REJECTED" value={String(counts.REJECT)} caption="Backend returned reject" tone="violet"/></div><div className="middle-grid"><section className="panel aa-defect-dist"><div className="panel-heading"><div><h2>Detected issue types</h2><p>Counts come from backend detections in saved uploads</p></div></div>{totalDefects ? Object.entries(distribution).sort((a,b) => b[1]-a[1]).map(([name,count]) => <div className="aa-distribution-row" key={name}><span>{name}</span><div><i style={{width:`${count / totalDefects * 100}%`}}/></div><b>{Math.round(count / totalDefects * 100)}%</b><small>{count}</small></div>) : <div className="empty-state">No detected issues in the saved uploads yet.</div>}</section><section className="panel aa-batch-results"><div className="panel-heading"><div><h2>Inspection outcomes</h2><p>Overall backend disposition</p></div></div><div className="aa-outcome-bars"><span>Passed <i/><b>{counts.PASS}</b></span><span>Review <i/><b>{counts.REVIEW}</b></span><span>Rejected <i/><b>{counts.REJECT}</b></span></div><div className="aa-caution">These counts describe only the images inspected in this browser. They are not factory-wide production totals.</div><button className="button button-secondary" onClick={() => navigate("Plant Overview")}>View saved inspection log</button></section></div><UploadHistory uploadLogs={uploadLogs} navigate={navigate}/></>;
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
  return <><Header eyebrow="FAULT INTELLIGENCE BOARD" title="Fault Intelligence Board" subtitle="FMEA station patterns and machine risks returned by inspection results" action={<Badge>{stations.length} stations</Badge>}/><div className="stat-grid"><MiniStat title="SAVED INSPECTIONS" value={String(uploadLogs.length)} caption="Images checked"/><MiniStat title="STATIONS WITH FMEA" value={String(stations.length)} caption="Backend-linked station records" tone="blue"/><MiniStat title="HIGHEST RPN" value={maxRpn ? String(maxRpn) : "—"} caption={maxRpn ? "From returned FMEA evaluation" : "No FMEA data returned"} tone="amber"/><MiniStat title="MACHINE RISK" value="Not linked" caption="No machine telemetry attached" tone="violet"/></div><section className="panel aa-telemetry-panel"><div className="panel-heading"><div><h2>Failure frequency by station</h2><p>Counts are based on saved inspections that include FMEA station data</p></div></div>{stations.length ? stations.map(([station, value]) => <div className="aa-distribution-row" key={station}><span>{station}</span><div><i style={{width:`${Math.max(5, value.highestRpn / maxRpn * 100)}%`}}/></div><b>RPN {value.highestRpn}</b><small>{value.count} inspection{value.count === 1 ? "" : "s"} · {value.mode}</small></div>) : <div className="empty-state">FMEA station frequencies will appear after an upload returns FMEA data.</div>}<p className="aa-muted">These are counts in the images inspected here, not plant-wide failure rates. Machine sensor telemetry is not connected to this inspection feed.</p></section><UploadHistory uploadLogs={uploadLogs} navigate={navigate}/></>;
}
