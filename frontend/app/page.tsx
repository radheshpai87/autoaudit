"use client";

import { useCallback, useEffect, useState } from "react";
import { AutoAuditView } from "../components/autoaudit/Views";
import { seedInspections } from "../lib/mock-data";
import { autoAuditApi, checkBackendHealth, type InspectApiResponse } from "../lib/api";
import type { AuditLog, InspectorReview, Inspection } from "../lib/types";

type ViewName = "Plant Overview" | "AI Inspection Studio" | "Batch Quality Analytics" | "Fault Intelligence Board" | "Human Review";
type IconName = "grid" | "disc" | "box" | "chart" | "activity";
const navigation: { label: ViewName; icon: IconName }[] = [
  { label: "Plant Overview", icon: "grid" },
  { label: "AI Inspection Studio", icon: "disc" },
  { label: "Batch Quality Analytics", icon: "box" },
  { label: "Fault Intelligence Board", icon: "chart" },
  { label: "Human Review", icon: "activity" },
];

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, React.ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,
    disc: <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/><path d="M12 3v6m9 3h-6m-3 9v-6m-9-3h6"/></>,
    box: <><path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 8 9 5 9-5m-18 0v9l9 5 9-5V8m-9 5v9"/></>,
    chart: <><path d="M3 3v18h18"/><path d="m7 14 4-4 4 3 6-7"/></>,
    activity: <><path d="M3 12h4l3-8 4 16 3-8h4"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

export default function Home() {
  const [active, setActive] = useState<ViewName>("Plant Overview");
  const [inspections, setInspections] = useState<Inspection[]>(seedInspections);
  const [selectedPart, setSelectedPart] = useState("BD-1047");
  const [clock, setClock] = useState("");
  const [notice, setNotice] = useState("");
  const [backend, setBackend] = useState<{ isOnline: boolean; mode: string } | null>(null);
  const [qualityAlert, setQualityAlert] = useState("");

  useEffect(() => {
    void checkBackendHealth().then(setBackend);
    if (autoAuditApi !== undefined && process.env.NEXT_PUBLIC_AUTOAUDIT_API === "http") {
      void autoAuditApi.listInspections().then(setInspections).catch(() => setNotice("Backend provider is selected but /api/inspections is not available."));
    }
    try {
      const saved = window.localStorage.getItem("autoaudit-inspections-v2");
      if (saved) setInspections(JSON.parse(saved) as Inspection[]);
    } catch { /* Keep the bundled demo fixtures if local storage is unavailable. */ }
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
      if (page) setActive(page); else setActive("Plant Overview");
      setSelectedPart(next.searchParams.get("part") ?? "BD-1047");
    };
    window.addEventListener("popstate", onPopState);
    return () => { window.clearInterval(timer); window.removeEventListener("popstate", onPopState); };
  }, []);

  const addLiveInspection = useCallback((row: Inspection, response: InspectApiResponse) => {
    const updated = [row, ...inspections.filter((entry) => entry.id !== row.id)];
    setInspections(updated);
    try { window.localStorage.setItem("autoaudit-inspections-v2", JSON.stringify(updated)); } catch { /* Keep this inspection in current-session state. */ }
    setSelectedPart(row.id);
    const url = new URL(window.location.href); url.searchParams.set("part", row.id); window.history.replaceState({}, "", url);
    if (response.condition_classification.condition === "FAULTY" || response.overall_status === "REJECT") {
      const actualClasses = [...new Set(response.detections.map((detection) => detection.defect_type))];
      const finding = actualClasses.length ? actualClasses.join(", ") : "backend condition assessment";
      setQualityAlert(`Inspection ${response.image_id}: ${finding} flagged · disposition ${response.overall_status}. Review the returned findings; no machine cause was identified.`);
      window.setTimeout(() => setQualityAlert(""), 12_000);
    }
  }, [inspections]);

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
  const saveReview = useCallback((id: string, review: InspectorReview) => {
    const updated = inspections.map((row) => row.id === id ? { ...row, review, status: review.finalDisposition } : row);
    setInspections(updated);
    try { window.localStorage.setItem("autoaudit-inspections-v2", JSON.stringify(updated)); } catch { /* Current-session state remains updated. */ }
    const log: AuditLog = { id: crypto.randomUUID(), partId: id, action: "Human review saved", actor: review.reviewer, timestamp: review.timestamp, details: `${review.originalClass} / ${review.originalDisposition} → ${review.finalClass} / ${review.finalDisposition}; reason: ${review.reason}` };
    try { const oldLog = JSON.parse(window.localStorage.getItem("autoaudit-audit-log-v2") ?? "[]") as AuditLog[]; window.localStorage.setItem("autoaudit-audit-log-v2", JSON.stringify([log, ...oldLog].slice(0, 100))); } catch { /* Audit detail stays represented in the persisted review record. */ }
    void autoAuditApi.saveReview(id, review).catch(() => setNotice("Review saved locally; backend persistence is not available."));
  }, [inspections]);

  return <main className={`app-shell ${active === "AI Inspection Studio" ? "inspection-mode" : ""}`}>
    <aside className="sidebar">
      <a className="brand" href="?view=Plant%20Overview" onClick={(e) => { e.preventDefault(); navigate("Plant Overview"); }}><span className="brand-mark"><Icon name="disc" size={21}/></span><span className="brand-copy"><strong>autoaudit</strong><small>QUALITY OPERATIONS</small></span></a>
      <div className="plant-select"><span className="plant-dot"/><span><b>Plant North · 01</b><small>Manufacturing campus</small></span><span className="plant-chevron">⌄</span></div>
      <div className="nav-heading">WORKSPACE</div>
      <nav className="primary-nav" aria-label="Main navigation">{navigation.map((item) => <button key={item.label} className={`nav-link ${active === item.label ? "selected" : ""}`} onClick={() => navigate(item.label)} aria-label={item.label} title={item.label} aria-current={active === item.label ? "page" : undefined}><Icon name={item.icon}/><span>{item.label}</span>{item.label === "Human Review" && <span className="nav-count">{inspections.filter((row) => row.status === "REVIEW").length}</span>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="support-card"><div className="support-icon"><Icon name="activity" size={17}/></div><div><strong>Demo workspace</strong><span>Mock provider connected</span></div><span className="online-dot"/></div><div className="user-card"><div className="avatar">AR</div><div className="user-meta"><b>Alex Rivera</b><span>Quality manager</span></div><span className="user-role">DEMO</span></div></div>
    </aside>
    <section className="content-area">
      <header className="topbar"><div className="breadcrumbs"><span>Workspace</span><span className="crumb-slash">/</span><b>{active}</b></div><div className="top-actions"><span className="aa-top-demo">{backend?.isOnline ? (backend.mode === "real_ai" ? "REAL YOLO AI" : "BACKEND · MOCK") : "DEMO DATA"}</span><button className="button button-secondary small-button" onClick={() => { if (window.confirm("Reset local demo reviews and audit history?")) { setInspections(seedInspections); window.localStorage.removeItem("autoaudit-inspections-v2"); window.localStorage.removeItem("autoaudit-audit-log-v2"); setNotice("Local demo reviews and audit history reset."); window.setTimeout(() => setNotice(""), 4500); } }}>Reset demo</button><button className="icon-button notification-button" aria-label="Show data-source details" onClick={() => { setNotice(backend?.isOnline ? `FastAPI backend online · ${backend.mode}` : "Backend offline. Local demonstration fixtures remain available."); window.setTimeout(() => setNotice(""), 4500); }}>ⓘ</button><div className="top-divider"/><div className="top-date"><span className="date-label">{clock ? clock.split(", ").slice(0, 2).join(", ").toUpperCase() : "LOCAL PLANT TIME"}</span><b>{clock ? clock.split(", ").at(-1) : "--:--"} <span>IST</span></b></div></div></header>
      {backend && !backend.isOnline && <div className="aa-backend-warning" role="status"><span>Backend offline on :8000 — operating in local demonstration mode</span><button className="button button-secondary small-button" onClick={() => { setBackend(null); void checkBackendHealth().then(setBackend); }}>Retry connection</button></div>}
      {qualityAlert && <div className="aa-quality-alert" role="alert"><b>{qualityAlert}</b><button aria-label="Dismiss critical defect alert" onClick={() => setQualityAlert("")}>×</button></div>}
      <div className="page-content"><AutoAuditView view={active} inspections={inspections} selectedPart={selectedPart} setSelectedPart={selectPart} navigate={navigate} saveReview={saveReview} backendOnline={backend?.isOnline ?? false} inferenceMode={backend?.mode ?? "offline"} onInspectionCreated={addLiveInspection}/><footer className="page-footer"><span>AutoAudit <span>·</span> Manufacturing quality, in focus</span><span>{backend?.isOnline ? "LIVE INSPECTION · DEMO OPERATIONS DATA" : "LOCAL DEMONSTRATION DATA · NOT FOR PRODUCTION DISPOSITION"}</span></footer></div>
    </section>
    {notice && <div className="toast"><span className="toast-check">i</span>{notice}</div>}
  </main>;
}
