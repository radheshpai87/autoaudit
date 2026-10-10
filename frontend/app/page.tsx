"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AutoAuditView, type ViewName } from "../components/autoaudit/Views";
import { checkBackendHealth, dispatchWhatsAppAlert, fetchBatchSummaries, fetchDashboardAnalytics, fetchHistoricalAnalytics, fetchInspectionHistory, type BatchSummary, type DashboardAnalytics, type HistoricalAnalyticsResponse, type HistoricalInspectionRecord, type InspectApiResponse } from "../lib/api";
import type { InspectionUploadLog } from "../lib/types";
import { getStoredInspectionLogs, saveStoredInspection, saveStoredInspectionLogs } from "../lib/inspection-store";
import { getWhatsAppDispatchLog, recordWhatsAppDispatch, whatsappDispatchStatusEvent, type WhatsAppDispatchLogEntry } from "../lib/dispatch-log";
import { getCurrentUserRole, setCurrentUserRole, USERS, type UserRole } from "../lib/auth";
import { AuthModal } from "../components/autoaudit/AuthModal";
import { AppIcon } from "../components/autoaudit/AppIcon";
import { LoginPage } from "../components/autoaudit/LoginPage";
import { LandingPage } from "../components/autoaudit/LandingPage";

type IconName = "grid" | "disc" | "box" | "chart" | "menu" | "chevronLeft" | "chevronRight";

const navigation: { label: ViewName; icon: IconName; roleTag?: string }[] = [
  { label: "Operator Station", icon: "disc", roleTag: "OPERATOR" },
  { label: "Main Dashboard", icon: "grid", roleTag: "MANAGER" },
  { label: "AI Inspection Studio", icon: "disc", roleTag: "QUALITY" },
  { label: "Fault Intelligence Board", icon: "chart", roleTag: "MAINTENANCE" },
  { label: "Human Review", icon: "chart", roleTag: "QUALITY" },
  { label: "Historical Data & Prediction", icon: "chart" },
  { label: "Inspection History", icon: "box" },
  { label: "Batch Data", icon: "box" },
];

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, React.ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,
    disc: <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/><path d="M12 3v6m9 3h-6m-3 9v-6m-9-3h6"/></>,
    box: <><path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 8 9 5 9-5m-18 0v9l9 5 9-5V8m-9 5v9"/></>,
    chart: <><path d="M3 3v18h18"/><path d="m7 14 4-4 4 3 6-7"/></>,
    menu: <><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></>,
    chevronLeft: <><path d="m15 18-6-6 6-6"/></>,
    chevronRight: <><path d="m9 18 6-6-6-6"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

export default function Home() {
  const [appFlow, setAppFlow] = useState<"landing" | "login" | "dashboard">("landing");
  const [active, setActive] = useState<ViewName>("Operator Station");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentRole, setCurrentRole] = useState<UserRole>("operator");
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [uploadLogs, setUploadLogs] = useState<InspectionUploadLog[]>([]);
  const [selectedPart, setSelectedPart] = useState("");
  const [clock, setClock] = useState("");
  const [notice, setNotice] = useState("");
  const [backend, setBackend] = useState<{ isOnline: boolean; mode: string } | null>(null);
  const [qualityAlert, setQualityAlert] = useState("");
  const [historicalAnalytics, setHistoricalAnalytics] = useState<HistoricalAnalyticsResponse | null>(null);
  const [historicalRecords, setHistoricalRecords] = useState<HistoricalInspectionRecord[]>([]);
  const [dashboardAnalytics, setDashboardAnalytics] = useState<DashboardAnalytics | null>(null);
  const [batchSummaries, setBatchSummaries] = useState<BatchSummary[]>([]);
  const [analyticsStatus, setAnalyticsStatus] = useState<"loading" | "refreshing" | "online" | "offline">("loading");
  const [analyticsError, setAnalyticsError] = useState("");
  const [dispatchStatus, setDispatchStatus] = useState<WhatsAppDispatchLogEntry | null>(null);
  const automaticDispatchesInFlight = useRef(new Set<string>());

  const dispatchAutomatically = useCallback(async (input: {
    key: string;
    station: string;
    failureMode: string;
    action: string;
    partId: string;
    rpn?: number;
    probability?: string;
  }) => {
    const priorDispatch = getWhatsAppDispatchLog().find((entry) => entry.dispatchKey === input.key && entry.status === "sent");
    if (priorDispatch || automaticDispatchesInFlight.current.has(input.key)) return;
    automaticDispatchesInFlight.current.add(input.key);
    const stationKey = input.station.match(/\bST-\d+\b/i)?.[0]?.toUpperCase() ?? "DEFAULT";
    let dispatchRecord: WhatsAppDispatchLogEntry;
    try {
      const result = await dispatchWhatsAppAlert({
        stationKey,
        station: input.station,
        failureMode: input.failureMode,
        action: input.action,
        partId: input.partId,
        rpn: input.rpn,
        probability: input.probability,
        dispatchKey: input.key,
        automatic: true,
      });
      if (!result.success) throw new Error(result.error || "WhatsApp service did not accept the alert.");
      dispatchRecord = {
        dispatchId: result.dispatchId || input.key,
        dispatchKey: input.key,
        sentAt: result.sentAt || new Date().toISOString(),
        recipient: result.recipientName || "Configured maintenance contact",
        station: input.station,
        partId: input.partId,
        failureMode: input.failureMode,
        status: "sent",
        automatic: true,
      };
    } catch (error) {
      dispatchRecord = {
        dispatchId: input.key,
        dispatchKey: input.key,
        sentAt: new Date().toISOString(),
        recipient: "Configured maintenance contact",
        station: input.station,
        partId: input.partId,
        failureMode: input.failureMode,
        status: "failed",
        automatic: true,
        message: error instanceof Error ? error.message : "Automatic WhatsApp dispatch failed.",
      };
    } finally {
      automaticDispatchesInFlight.current.delete(input.key);
    }
    recordWhatsAppDispatch(dispatchRecord);
  }, []);

  const refreshAnalytics = useCallback(async () => {
    setAnalyticsStatus((current) => current === "online" ? "refreshing" : "loading");
    const [analyticsResult, historyResult, dashboardResult, batchesResult] = await Promise.allSettled([
      fetchHistoricalAnalytics(), fetchInspectionHistory(1000), fetchDashboardAnalytics(), fetchBatchSummaries(),
    ]);
    if (analyticsResult.status === "fulfilled") {
      setHistoricalAnalytics(analyticsResult.value);
      setAnalyticsStatus("online");
      for (const warning of analyticsResult.value.active_early_warnings) {
        if (warning.confidence < 0.75) continue;
        const evidenceKey = `${warning.machine_code}:${warning.failure_mode}:${warning.spatial_signature}:${warning.evidence_count}`;
        void dispatchAutomatically({
          key: `predictive:${evidenceKey}`,
          station: warning.station,
          failureMode: warning.failure_mode,
          action: warning.recommended_action,
          partId: warning.machine_code,
          probability: `${(warning.confidence * 100).toFixed(0)}%`,
        });
      }
      if (historyResult.status === "fulfilled") setAnalyticsError("");
      else {
        setHistoricalRecords(analyticsResult.value.records);
        setAnalyticsError(historyResult.reason instanceof Error ? historyResult.reason.message : "History endpoint unavailable; showing the records included in analytics response.");
      }
    } else {
      setAnalyticsStatus("offline");
      setAnalyticsError(analyticsResult.reason instanceof Error ? analyticsResult.reason.message : "Backend analytics could not be loaded.");
    }
    const loadedRecords = historyResult.status === "fulfilled"
      ? historyResult.value
      : (analyticsResult.status === "fulfilled" ? analyticsResult.value.records : []);
    if (historyResult.status === "fulfilled") setHistoricalRecords(historyResult.value);
    if (batchesResult.status === "fulfilled") setBatchSummaries(batchesResult.value);

    let resolvedDashboard: DashboardAnalytics | null = null;
    if (dashboardResult.status === "fulfilled" && dashboardResult.value && dashboardResult.value.total_inspections > 0) {
      resolvedDashboard = dashboardResult.value;
    } else if (loadedRecords.length > 0) {
      const total = loadedRecords.length;
      const passed = loadedRecords.filter((r) => r.overall_status === "PASS").length;
      const review = loadedRecords.filter((r) => r.overall_status === "REVIEW").length;
      const rejected = loadedRecords.filter((r) => r.overall_status === "REJECT").length;
      const realAi = loadedRecords.filter((r) => r.inference_mode === "real_ai").length;

      const defectMap = new Map<string, { count: number; affectedParts: Set<string> }>();
      let totalDefectsCount = 0;
      for (const r of loadedRecords) {
        totalDefectsCount += r.defect_count || 0;
        for (const d of r.defects || []) {
          const entry = defectMap.get(d.defect_type) || { count: 0, affectedParts: new Set<string>() };
          entry.count += 1;
          entry.affectedParts.add(r.part_id);
          defectMap.set(d.defect_type, entry);
        }
      }
      const defectBreakdown = Array.from(defectMap.entries()).map(([defect_type, data]) => ({
        defect_type,
        count: data.count,
        parts_affected: data.affectedParts.size,
        part_rate: total > 0 ? Number(((data.affectedParts.size / total) * 100).toFixed(1)) : 0,
      })).sort((a, b) => b.count - a.count);

      const stationMap = new Map<string, { count: number; maxRpn: number; failureMode?: string | null; action?: string | null }>();
      for (const r of loadedRecords) {
        const stationName = r.station || "Unassigned Station";
        const current = stationMap.get(stationName) || { count: 0, maxRpn: 0, failureMode: r.top_failure_mode, action: r.recommended_action };
        current.count += 1;
        if ((r.highest_rpn || 0) > current.maxRpn) {
          current.maxRpn = r.highest_rpn || 0;
          current.failureMode = r.top_failure_mode || current.failureMode;
          current.action = r.recommended_action || current.action;
        }
        stationMap.set(stationName, current);
      }
      const stationRanking = Array.from(stationMap.entries()).map(([station, d]) => ({
        station,
        inspection_count: d.count,
        max_rpn: d.maxRpn,
        failure_mode: d.failureMode || null,
        recommended_action: d.action || null,
      })).sort((a, b) => b.max_rpn - a.max_rpn);

      const batches = batchesResult.status === "fulfilled" ? batchesResult.value : [];
      const batchTrend = batches.length > 0
        ? batches.map((b) => ({
            batch_id: b.batch_id,
            total_parts: b.total_parts,
            defect_count: b.defect_count,
            defect_rate: b.defect_rate,
            yield_rate: b.yield_rate,
            latest_inspection: b.latest_inspection,
          }))
        : [{
            batch_id: "BATCH-LIVE",
            total_parts: total,
            defect_count: totalDefectsCount,
            defect_rate: Number(((rejected / total) * 100).toFixed(1)),
            yield_rate: Number(((passed / total) * 100).toFixed(1)),
            latest_inspection: new Date().toISOString(),
          }];

      resolvedDashboard = {
        total_inspections: total,
        passed_count: passed,
        review_count: review,
        rejected_count: rejected,
        real_ai_count: realAi,
        total_defects: totalDefectsCount,
        defect_breakdown: defectBreakdown,
        station_ranking: stationRanking,
        batch_trend: batchTrend,
      };
    }
    setDashboardAnalytics(resolvedDashboard);
  }, [dispatchAutomatically]);

  useEffect(() => {
    setDispatchStatus(getWhatsAppDispatchLog()[0] ?? null);
    const onDispatchStatus = (event: Event) => setDispatchStatus((event as CustomEvent<WhatsAppDispatchLogEntry>).detail);
    window.addEventListener(whatsappDispatchStatusEvent, onDispatchStatus);
    void checkBackendHealth().then(setBackend);
    void refreshAnalytics();
    const savedCollapsed = window.localStorage.getItem("autoaudit-sidebar-collapsed");
    if (savedCollapsed !== null) setSidebarCollapsed(savedCollapsed === "true");
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
    const role = getCurrentUserRole();
    setCurrentRole(role);
    const user = USERS[role];
    const url = new URL(window.location.href);
    const viewParam = url.searchParams.get("view");
    const flowParam = url.searchParams.get("flow");
    if (viewParam) {
      const view = navigation.find((item) => item.label === viewParam)?.label;
      if (view) {
        setActive(view);
        setAppFlow("dashboard");
      }
    } else if (flowParam === "login") {
      setAppFlow("login");
    } else if (flowParam === "dashboard") {
      setAppFlow("dashboard");
      setActive(user.defaultView as ViewName);
    }
    const part = url.searchParams.get("part");
    if (part) setSelectedPart(part);
    const updateClock = () => setClock(new Intl.DateTimeFormat("en-IN", { weekday: "long", month: "long", day: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" }).format(new Date()));
    updateClock();
    const timer = window.setInterval(updateClock, 60_000);
    const onPopState = () => {
      const next = new URL(window.location.href);
      const page = navigation.find((item) => item.label === next.searchParams.get("view"))?.label;
      const flow = next.searchParams.get("flow");
      if (page) {
        setActive(page);
        setAppFlow("dashboard");
      } else if (flow === "login") {
        setAppFlow("login");
      } else if (!next.searchParams.get("view")) {
        setAppFlow("landing");
      }
      setSelectedPart(next.searchParams.get("part") ?? "");
    };
    window.addEventListener("popstate", onPopState);
    return () => { window.clearInterval(timer); window.removeEventListener("popstate", onPopState); window.removeEventListener(whatsappDispatchStatusEvent, onDispatchStatus); };
  }, [refreshAnalytics]);

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
    const criticalDetection = response.detections.find((detection) => detection.severity === "critical");
    const fmea = response.top_fmea_risk ?? response.detections.find((detection) => detection.fmea)?.fmea;
    const rpn = fmea?.rpn ?? response.fmea_quality_control?.highest_rpn;
    if (criticalDetection || (rpn !== undefined && rpn >= 200)) {
      const station = fmea?.station_origin ?? fmea?.station ?? response.fmea_quality_control?.critical_station ?? "Unassigned station";
      const failureMode = criticalDetection?.defect_type ?? fmea?.failure_mode ?? fmea?.potential_failure_mode ?? "High FMEA risk";
      const action = criticalDetection?.recommendation ?? fmea?.recommended_action ?? fmea?.station_action ?? "Review the part and follow the station maintenance procedure.";
      void dispatchAutomatically({ key: `inspection:${response.image_id}`, station, failureMode, action, partId: response.image_id, rpn });
    }
    void refreshAnalytics();
  }, [uploadLogs, refreshAnalytics, dispatchAutomatically]);

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


  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try { window.localStorage.setItem("autoaudit-sidebar-collapsed", String(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const handleRoleChange = useCallback((newRole: UserRole) => {
    setCurrentRole(newRole);
    const user = setCurrentUserRole(newRole);
    setActive(user.defaultView as ViewName);
    const url = new URL(window.location.href);
    url.searchParams.set("view", user.defaultView);
    window.history.pushState({}, "", url);
    setNotice(`Workspace switched to ${user.name} (${user.roleTitle})`);
    window.setTimeout(() => setNotice(""), 4500);
  }, []);

  const handleLoginPersona = useCallback((newRole: UserRole) => {
    handleRoleChange(newRole);
    setAppFlow("dashboard");
    const url = new URL(window.location.href);
    url.searchParams.delete("flow");
    url.searchParams.set("view", USERS[newRole].defaultView);
    window.history.pushState({}, "", url);
  }, [handleRoleChange]);

  const goToLanding = useCallback(() => {
    setAppFlow("landing");
    const url = new URL(window.location.href);
    url.searchParams.delete("view");
    url.searchParams.delete("part");
    url.searchParams.delete("flow");
    window.history.pushState({}, "", url);
  }, []);

  const goToLogin = useCallback(() => {
    setAppFlow("login");
    const url = new URL(window.location.href);
    url.searchParams.delete("view");
    url.searchParams.set("flow", "login");
    window.history.pushState({}, "", url);
  }, []);

  const activeUser = USERS[currentRole];

  if (appFlow === "landing") {
    return (
      <LandingPage
        onGoToLogin={goToLogin}
        onSelectRoleAndEnter={handleLoginPersona}
        backendOnline={backend?.isOnline ?? false}
        inferenceMode={backend?.mode ?? "offline"}
      />
    );
  }

  if (appFlow === "login") {
    return (
      <LoginPage
        onLogin={handleLoginPersona}
        onBackToLanding={goToLanding}
        backendOnline={backend?.isOnline ?? false}
        inferenceMode={backend?.mode ?? "offline"}
      />
    );
  }

  return <main className={`app-shell ${sidebarCollapsed ? "sidebar-collapsed" : ""} ${active === "AI Inspection Studio" ? "inspection-mode" : ""}`}>
    <aside className={`sidebar ${sidebarCollapsed ? "collapsed" : ""}`}>
      <div className="brand-header">
        <div className="brand" role="button" tabIndex={0} onClick={goToLanding} onKeyDown={(e) => { if (e.key === "Enter") goToLanding(); }} title="Return to Product Overview">
          <span className="brand-mark"><Icon name="disc" size={21}/></span>
          {!sidebarCollapsed && <span className="brand-copy"><strong>autoaudit</strong><small>{activeUser.roleTitle.toUpperCase()}</small></span>}
        </div>
        <button
          className="sidebar-toggle-btn"
          onClick={toggleSidebar}
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={sidebarCollapsed ? "Expand sidebar (Click to open)" : "Collapse sidebar (Click to compact)"}
        >
          <Icon name={sidebarCollapsed ? "chevronRight" : "chevronLeft"} size={16}/>
        </button>
      </div>

      {!sidebarCollapsed && <div className="plant-select" onClick={() => setAuthModalOpen(true)} style={{ cursor: "pointer" }} title="Click to switch user role">
        <span className="plant-dot"/>
        <span><b>{activeUser.name}</b><small>{activeUser.roleTitle} · Switch Role</small></span>
        <span className="plant-chevron">▾</span>
      </div>}

      <div className="nav-heading">{sidebarCollapsed ? "NAV" : `${activeUser.role.toUpperCase()} WORKSPACE`}</div>
      <nav className="primary-nav" aria-label="Main navigation">
        {navigation.map((item) => (
          <button
            key={item.label}
            className={`nav-link ${active === item.label ? "selected" : ""}`}
            onClick={() => navigate(item.label)}
            aria-label={item.label}
            title={sidebarCollapsed ? `${item.label} ${item.roleTag ? `(${item.roleTag})` : ""}` : undefined}
            aria-current={active === item.label ? "page" : undefined}
          >
            <Icon name={item.icon}/>
            {!sidebarCollapsed && <span>{item.label}</span>}
            {!sidebarCollapsed && item.roleTag && <span className="nav-role-tag">{item.roleTag}</span>}
          </button>
        ))}
      </nav>

      <div className="sidebar-bottom">
        {!sidebarCollapsed ? (
          <>
            <div className="support-card">
              <div className="support-icon"><Icon name="chart" size={17}/></div>
              <div><strong>AutoAudit workspace</strong><span>{backend?.isOnline ? "Inspection backend connected" : "Backend status unavailable"}</span></div>
              <span className="online-dot"/>
            </div>
            <div
              className="user-card aa-user-card-interactive"
              onClick={() => setAuthModalOpen(true)}
              role="button"
              tabIndex={0}
              title="Click to switch plant user persona"
              aria-label="Current user and switch role"
            >
              <div className={`avatar ${activeUser.badgeTone}`}>{activeUser.avatar}</div>
              <div className="user-meta"><b>{activeUser.name}</b><span>{activeUser.roleTitle}</span></div>
              <span className="aa-role-switch-btn">Switch</span>
            </div>
          </>
        ) : (
          <div
            className="sidebar-collapsed-profile"
            onClick={() => setAuthModalOpen(true)}
            role="button"
            tabIndex={0}
            title={`${activeUser.name} (${activeUser.roleTitle}) · Click to switch role`}
            aria-label="Click to switch role"
          >
            <div className={`avatar ${activeUser.badgeTone}`}>{activeUser.avatar}</div>
            <span className="online-dot"/>
          </div>
        )}
      </div>
    </aside>

    <section className={`content-area ${sidebarCollapsed ? "expanded" : ""}`}>
      <header className="topbar">
        <div className="breadcrumbs">
          <button
            className="icon-button topbar-collapse-toggle"
            onClick={toggleSidebar}
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <Icon name="menu" size={18}/>
          </button>
          <span>Workspace</span>
          <span className="crumb-slash">/</span>
          <b>{active}</b>
        </div>
        <div className="top-actions">
          <button
            className="button button-secondary"
            onClick={goToLanding}
            style={{ fontSize: "12px", padding: "6px 12px", whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: "6px" }}
            title="Return to Product Overview Landing Page"
          >
            <AppIcon name="book" size={14} /> Product Overview
          </button>
          <button
            className="button button-secondary"
            onClick={goToLogin}
            style={{ fontSize: "12px", padding: "6px 10px", whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: "5px" }}
            title="Switch plant persona or log out"
          >
            <AppIcon name="lock" size={13} /> Switch Persona
          </button>
          <button
            className="aa-role-pill-btn"
            onClick={() => setAuthModalOpen(true)}
            title={`Active User: ${activeUser.name} (${activeUser.roleTitle}). Click to switch role.`}
            aria-label="Switch user role"
          >
            <span className={`avatar aa-role-avatar-tiny ${activeUser.badgeTone}`}>
              {activeUser.avatar}
            </span>
            <div className="aa-role-pill-info">
              <b>{activeUser.name}</b>
              <small>{activeUser.roleTitle}</small>
            </div>
            <span className="aa-role-pill-tag">Switch Role ▾</span>
          </button>
          <span className="aa-top-demo">{backend?.isOnline ? (backend.mode === "real_ai" ? "REAL YOLO AI" : "BACKEND · MOCK") : "BACKEND OFFLINE"}</span>
          <button className="icon-button notification-button" aria-label="Show data-source details" onClick={() => { setNotice(backend?.isOnline ? `FastAPI backend online · ${backend.mode}` : "Backend offline. Live image inspection is unavailable until reconnection."); window.setTimeout(() => setNotice(""), 4500); }}>ⓘ</button>
          <div className="top-divider"/>
          <div className="top-date">
            <span className="date-label">{clock ? clock.split(", ").slice(0, 2).join(", ").toUpperCase() : "LOCAL PLANT TIME"}</span>
            <b>{clock ? clock.split(", ").at(-1) : "--:--"} <span>IST</span></b>
          </div>
        </div>
      </header>
      {backend && !backend.isOnline && <div className="aa-backend-warning" role="status"><span>Backend offline on :8000 — live image inspection is unavailable until reconnection</span><button className="button button-secondary small-button" onClick={() => { setBackend(null); void checkBackendHealth().then(setBackend); }}>Retry connection</button></div>}
      {qualityAlert && <div className={`aa-quality-alert ${qualityAlert.startsWith("Unclassified") ? "aa-anomaly-alert" : ""}`} role="alert"><b>{qualityAlert}</b><button aria-label="Dismiss critical defect alert" onClick={() => setQualityAlert("")}>×</button></div>}
      {dispatchStatus && <div className={`aa-whatsapp-dispatch-status ${dispatchStatus.status}`} role={dispatchStatus.status === "failed" ? "alert" : "status"}><div><b>{dispatchStatus.status === "sent" ? "WHATSAPP ALERT SENT" : "WHATSAPP AUTO-DISPATCH FAILED"}</b><span>{dispatchStatus.station} · {dispatchStatus.failureMode} · {dispatchStatus.status === "sent" ? `accepted by WhatsApp at ${new Date(dispatchStatus.sentAt).toLocaleTimeString()}` : dispatchStatus.message}</span></div><button aria-label="Dismiss WhatsApp dispatch status" onClick={() => setDispatchStatus(null)}>×</button></div>}
      <div className="page-content"><div className={active === "AI Inspection Studio" ? "" : "aa-persistent-inspector-hidden"}><AutoAuditView view="AI Inspection Studio" uploadLogs={uploadLogs} selectedPart={selectedPart} setSelectedPart={selectPart} navigate={navigate} backendOnline={backend?.isOnline ?? false} inferenceMode={backend?.mode ?? "offline"} onInspectionCreated={addLiveInspection} historicalAnalytics={historicalAnalytics} historicalRecords={historicalRecords} dashboardAnalytics={dashboardAnalytics} batchSummaries={batchSummaries} analyticsStatus={analyticsStatus} analyticsError={analyticsError} refreshAnalytics={refreshAnalytics} userRole={currentRole} onSwitchRole={handleRoleChange}/></div>{active !== "AI Inspection Studio" && <AutoAuditView view={active} uploadLogs={uploadLogs} selectedPart={selectedPart} setSelectedPart={selectPart} navigate={navigate} backendOnline={backend?.isOnline ?? false} inferenceMode={backend?.mode ?? "offline"} onInspectionCreated={addLiveInspection} historicalAnalytics={historicalAnalytics} historicalRecords={historicalRecords} dashboardAnalytics={dashboardAnalytics} batchSummaries={batchSummaries} analyticsStatus={analyticsStatus} analyticsError={analyticsError} refreshAnalytics={refreshAnalytics} userRole={currentRole} onSwitchRole={handleRoleChange}/>}<footer className="page-footer"><span>AutoAudit <span>·</span> Manufacturing quality, in focus</span><span>{backend?.isOnline ? "LIVE YOLO INSPECTIONS · BACKEND CONNECTED" : "LIVE UPLOAD METRICS · BACKEND RESULTS ONLY"}</span></footer></div>
    </section>
      {notice && <div className="toast"><span className="toast-check">i</span>{notice}</div>}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        currentUser={activeUser}
        onSelectRole={handleRoleChange}
      />
    </main>;
}
