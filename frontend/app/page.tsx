"use client";

import { useCallback, useEffect, useState } from "react";
import { AutoAuditView } from "../components/autoaudit/Views";
import { checkBackendHealth, type InspectApiResponse } from "../lib/api";
import type { InspectionUploadLog } from "../lib/types";
import { getStoredInspectionLogs, saveStoredInspection, saveStoredInspectionLogs } from "../lib/inspection-store";

type ViewName = "AI Inspection Studio" | "Main Dashboard" | "Inspection History" | "Batch Data" | "Fault Intelligence Board" | "Human Review";
type IconName = "grid" | "disc" | "box" | "chart";
const navigation: { label: ViewName; icon: IconName }[] = [
  { label: "AI Inspection Studio", icon: "disc" },
  { label: "Main Dashboard", icon: "grid" },
  { label: "Inspection History", icon: "box" },
  { label: "Batch Data", icon: "box" },
  { label: "Fault Intelligence Board", icon: "chart" },
  { label: "Human Review", icon: "chart" },
];

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, React.ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,
    disc: <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/><path d="M12 3v6m9 3h-6m-3 9v-6m-9-3h6"/></>,
    box: <><path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 8 9 5 9-5m-18 0v9l9 5 9-5V8m-9 5v9"/></>,
    chart: <><path d="M3 3v18h18"/><path d="m7 14 4-4 4 3 6-7"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

export default function Home() {
  const [active, setActive] = useState<ViewName>("AI Inspection Studio");
  const [uploadLogs, setUploadLogs] = useState<InspectionUploadLog[]>([]);
  const [selectedPart, setSelectedPart] = useState("");
  const [clock, setClock] = useState("");
  const [notice, setNotice] = useState("");
  const [backend, setBackend] = useState<{ isOnline: boolean; mode: string } | null>(null);
  const [qualityAlert, setQualityAlert] = useState("");

  useEffect(() => {
    void checkBackendHealth().then(setBackend);
    const restoreHistory = async () => {
      let logs: InspectionUploadLog[] = [];
      try { logs = await getStoredInspectionLogs(); } catch { /* Migrate history from local storage when IndexedDB is unavailable. */ }
      if (logs.length === 0) {
        try {
          const savedUploadLogs = window.localStorage.getItem("autoaudit-upload-log-v1");
          const legacyLogs = savedUploadLogs ? JSON.parse(savedUploadLogs) as InspectionUploadLog[] : [];
          if (Array.isArray(legacyLogs)) logs = legacyLogs;
          if (logs.length > 0) await saveStoredInspectionLogs(logs);
        } catch { /* Continue with whatever history could be recovered. */ }
      }
      if (logs.length > 0) {
        setUploadLogs((current) => {
          const currentIds = new Set(current.map((entry) => entry.id));
          return [...current, ...logs.filter((entry) => !currentIds.has(entry.id))];
        });
        const requestedPart = new URL(window.location.href).searchParams.get("part");
        if (!requestedPart) setSelectedPart((current) => current || logs[0].id);
      }
    };
    void restoreHistory();
    const url = new URL(window.location.href);
    const view = navigation.find((item) => item.label === url.searchParams.get("view"))?.label;
    if (view) setActive(view);
    const part = url.searchParams.get("part");
    if (part) setSelectedPart(part);
    const updateClock = () => setClock(new Intl.DateTimeFormat("en-IN", { weekday: "long", month: "long", day: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" }).format(new Date()));
    updateClock();
    const timer = window.setInterval(updateClock, 60_000);
    const onPopState = () => {
      const next = new URL(window.location.href);
      const page = navigation.find((item) => item.label === next.searchParams.get("view"))?.label;
      if (page) setActive(page); else setActive("AI Inspection Studio");
      setSelectedPart(next.searchParams.get("part") ?? "");
    };
    window.addEventListener("popstate", onPopState);
    return () => { window.clearInterval(timer); window.removeEventListener("popstate", onPopState); };
  }, []);

  const addLiveInspection = useCallback(async (response: InspectApiResponse, thumbnailDataUrl: string, file: File) => {
    try { await saveStoredInspection(response.image_id, file, response); } catch { setNotice("Inspection completed, but this browser could not save the full image for later reopening."); }
    const uploadLog: InspectionUploadLog = {
      id: response.image_id,
      fileName: file.name,
      uploadedAt: new Date().toISOString(),
      component: response.brake_component_type || "Brake component",
      result: response.overall_status,
      condition: response.condition_classification.condition,
      conditionConfidence: response.condition_classification.confidence,
      wearIndex: response.condition_classification.wear_index_score,
      defectCount: response.defect_count,
      inferenceMode: response.inference_mode,
      modelName: response.model_name,
      summary: response.summary_message,
      thumbnailDataUrl,
      defectType: response.detections[0]?.defect_type ?? "No defect detected",
      confidence: response.detections[0]?.confidence ?? response.condition_classification.confidence,
      stationOrigin: response.top_fmea_risk?.station_origin ?? response.top_fmea_risk?.station ?? response.fmea_quality_control?.critical_station,
      rpn: response.top_fmea_risk?.rpn ?? response.fmea_quality_control?.highest_rpn,
      requiresHumanReview: response.detections.some((detection) => /unknown anomaly/i.test(detection.defect_type) || detection.is_unknown_anomaly === true || detection.confidence < 0.5),
      topFmeaRisk: response.top_fmea_risk,
      fmeaQualityControl: response.fmea_quality_control,
      detections: response.detections.map((detection) => ({
        defectType: detection.defect_type,
        confidence: detection.confidence,
        severity: detection.severity,
        bbox: detection.bbox,
        areaPercentage: detection.area_percentage,
        location: detection.location,
        explanation: detection.explanation,
        recommendation: detection.recommendation,
        maskPolygon: detection.mask_polygon ?? undefined,
        fmea: detection.fmea,
      })),
    };
    const updatedLogs = [uploadLog, ...uploadLogs.filter((entry) => entry.id !== uploadLog.id)];
    setUploadLogs(updatedLogs);
    try { await saveStoredInspectionLogs(updatedLogs); } catch {
      try { window.localStorage.setItem("autoaudit-upload-log-v1", JSON.stringify(updatedLogs)); }
      catch { setNotice("Inspection saved for this session, but browser history storage is full."); }
    }
    setSelectedPart(response.image_id);
    const url = new URL(window.location.href); url.searchParams.set("part", response.image_id); window.history.replaceState({}, "", url);
    if (uploadLog.requiresHumanReview) {
      setQualityAlert("Unclassified Visual Anomaly Spotted — Quarantined for Expert Evaluation");
      window.setTimeout(() => setQualityAlert(""), 12_000);
    } else if (response.condition_classification.condition === "FAULTY" || response.overall_status === "REJECT") {
      const actualClasses = [...new Set(response.detections.map((detection) => detection.defect_type))];
      const finding = actualClasses.length ? actualClasses.join(", ") : "backend condition assessment";
      setQualityAlert(`Inspection ${response.image_id}: ${finding} flagged · disposition ${response.overall_status}. Review the returned findings; no machine cause was identified.`);
      window.setTimeout(() => setQualityAlert(""), 12_000);
    }
  }, [uploadLogs]);

  const selectPart = useCallback((id: string) => {
    setSelectedPart(id);
    const url = new URL(window.location.href); url.searchParams.set("part", id); window.history.replaceState({}, "", url);
  }, []);
  const navigate = useCallback((view: ViewName, partId?: string) => {
    setActive(view);
    if (partId) setSelectedPart(partId);
    const url = new URL(window.location.href); url.searchParams.set("view", view); if (partId) url.searchParams.set("part", partId); else if (view !== "AI Inspection Studio") url.searchParams.delete("part");
    window.history.pushState({}, "", url);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);


  return <main className={`app-shell ${active === "AI Inspection Studio" ? "inspection-mode" : ""}`}>
    <aside className="sidebar">
      <a className="brand" href="?view=Main%20Dashboard" onClick={(e) => { e.preventDefault(); navigate("Main Dashboard"); }}><span className="brand-mark"><Icon name="disc" size={21}/></span><span className="brand-copy"><strong>autoaudit</strong><small>QUALITY OPERATIONS</small></span></a>
      <div className="plant-select"><span className="plant-dot"/><span><b>Inspection workspace</b><small>Live backend results</small></span></div>
      <div className="nav-heading">WORKSPACE</div>
      <nav className="primary-nav" aria-label="Main navigation">{navigation.map((item) => <button key={item.label} className={`nav-link ${active === item.label ? "selected" : ""}`} onClick={() => navigate(item.label)} aria-label={item.label} title={item.label} aria-current={active === item.label ? "page" : undefined}><Icon name={item.icon}/><span>{item.label}</span></button>)}</nav>
      <div className="sidebar-bottom"><div className="support-card"><div className="support-icon"><Icon name="chart" size={17}/></div><div><strong>AutoAudit workspace</strong><span>{backend?.isOnline ? "Inspection backend connected" : "Backend status unavailable"}</span></div><span className="online-dot"/></div><div className="user-card"><div className="avatar">AA</div><div className="user-meta"><b>AutoAudit</b><span>Quality workspace</span></div></div></div>
    </aside>
    <section className="content-area">
      <header className="topbar"><div className="breadcrumbs"><span>Workspace</span><span className="crumb-slash">/</span><b>{active}</b></div><div className="top-actions"><span className="aa-top-demo">{backend?.isOnline ? (backend.mode === "real_ai" ? "REAL YOLO AI" : "BACKEND · MOCK") : "BACKEND OFFLINE"}</span><button className="icon-button notification-button" aria-label="Show data-source details" onClick={() => { setNotice(backend?.isOnline ? `FastAPI backend online · ${backend.mode}` : "Backend offline. Live image inspection is unavailable until reconnection."); window.setTimeout(() => setNotice(""), 4500); }}>ⓘ</button><div className="top-divider"/><div className="top-date"><span className="date-label">{clock ? clock.split(", ").slice(0, 2).join(", ").toUpperCase() : "LOCAL PLANT TIME"}</span><b>{clock ? clock.split(", ").at(-1) : "--:--"} <span>IST</span></b></div></div></header>
      {backend && !backend.isOnline && <div className="aa-backend-warning" role="status"><span>Backend offline on :8000 — live image inspection is unavailable until reconnection</span><button className="button button-secondary small-button" onClick={() => { setBackend(null); void checkBackendHealth().then(setBackend); }}>Retry connection</button></div>}
      {qualityAlert && <div className={`aa-quality-alert ${qualityAlert.startsWith("Unclassified") ? "aa-anomaly-alert" : ""}`} role="alert"><b>{qualityAlert}</b><button aria-label="Dismiss critical defect alert" onClick={() => setQualityAlert("")}>×</button></div>}
      <div className="page-content"><div className={active === "AI Inspection Studio" ? "" : "aa-persistent-inspector-hidden"}><AutoAuditView view="AI Inspection Studio" uploadLogs={uploadLogs} selectedPart={selectedPart} setSelectedPart={selectPart} navigate={navigate} backendOnline={backend?.isOnline ?? false} inferenceMode={backend?.mode ?? "offline"} onInspectionCreated={addLiveInspection}/></div>{active !== "AI Inspection Studio" && <AutoAuditView view={active} uploadLogs={uploadLogs} selectedPart={selectedPart} setSelectedPart={selectPart} navigate={navigate} backendOnline={backend?.isOnline ?? false} inferenceMode={backend?.mode ?? "offline"} onInspectionCreated={addLiveInspection}/>}<footer className="page-footer"><span>AutoAudit <span>·</span> Manufacturing quality, in focus</span><span>{backend?.isOnline ? "LIVE YOLO INSPECTIONS · BACKEND CONNECTED" : "LIVE UPLOAD METRICS · BACKEND RESULTS ONLY"}</span></footer></div>
    </section>
      {notice && <div className="toast"><span className="toast-check">i</span>{notice}</div>}
    </main>;
}
