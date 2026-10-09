"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { dispatchWhatsAppAlert, fetchWhatsAppStatus, type WhatsAppStatusResponse } from "../../lib/api";
import { recordWhatsAppDispatch } from "../../lib/dispatch-log";
import type { UserRole } from "../../lib/auth";
import { AppIcon, type AppIconName } from "./AppIcon";

export type DispatchDetails = {
  station: string;
  failureMode: string;
  rpn?: number;
  probability?: string;
  action: string;
  partId?: string;
  dispatchKey?: string;
  verdict?: "PASS" | "REVIEW" | "REJECT" | string;
};

export interface HierarchyContact {
  role: UserRole;
  level: 1 | 2 | 3 | 4;
  title: string;
  hierarchyTitle: string;
  name: string;
  phone: string;
  cleanPhone: string;
  iconName: AppIconName;
  badgeTone: "passed" | "neutral" | "review" | "reject";
  stationKey: string;
}

export const HIERARCHY_CONTACTS: HierarchyContact[] = [
  {
    role: "operator",
    level: 1,
    title: "Plant Operator",
    hierarchyTitle: "Level 1: Plant Operator",
    name: "Rajesh Kumar",
    phone: "+9190251763336",
    cleanPhone: "9190251763336",
    iconName: "operator",
    badgeTone: "passed",
    stationKey: "DEFAULT",
  },
  {
    role: "quality_engineer",
    level: 2,
    title: "Quality Assurance Engineer",
    hierarchyTitle: "Level 2: QA Engineer",
    name: "Priya Sharma",
    phone: "+917736831052",
    cleanPhone: "917736831052",
    iconName: "quality",
    badgeTone: "neutral",
    stationKey: "DEFAULT",
  },
  {
    role: "maintenance",
    level: 3,
    title: "Maintenance Team",
    hierarchyTitle: "Level 3: Maintenance",
    name: "Vikram Singh",
    phone: "+918951349166",
    cleanPhone: "918951349166",
    iconName: "maintenance",
    badgeTone: "review",
    stationKey: "ST-04",
  },
  {
    role: "manager",
    level: 4,
    title: "Plant Management",
    hierarchyTitle: "Level 4: Management",
    name: "Anand Verma",
    phone: "+918296102292",
    cleanPhone: "918296102292",
    iconName: "manager",
    badgeTone: "reject",
    stationKey: "DEFAULT",
  },
];

export interface HistoricalContext {
  totalInspected?: number;
  passRate?: number;
  scrapCount?: number;
  scrapCost?: number;
  topStation?: string;
  topDefect?: string;
}

function getPlainEnglishExplanation(failureMode: string, verdict?: string): string {
  const text = (failureMode || "").toLowerCase();
  if (text.includes("crack") || text.includes("thermal")) {
    return "The brake rotor has hairline or thermal cracks on the friction surface. Cracks weaken structural strength under high braking heat and can cause rotor failure.";
  }
  if (text.includes("scor") || text.includes("groov")) {
    return "Deep score lines or grooves are visible on the disc. This is usually caused by worn lathe tooling or debris, preventing smooth contact with brake pads.";
  }
  if (text.includes("pit") || text.includes("cavit") || text.includes("corros")) {
    return "Surface pitting or casting cavities were detected. Small holes in the metal can spread under hydraulic brake pressure.";
  }
  if (text.includes("wear") || text.includes("drift") || text.includes("spindle")) {
    return "Machine sensors detected spindle vibration or cutting tool wear. Station needs re-calibration before cutting edges damage further rotors.";
  }
  if (verdict === "PASS") {
    return "Brake rotor dimensions, surface smoothness, and runout are completely within safety limits. Component is 100% road-ready.";
  }
  return "Surface irregularity detected on the disc. It exceeds normal factory smoothness limits and requires verification.";
}

export function buildHierarchyMessage(
  targetRole: UserRole,
  details: DispatchDetails,
  historicalContext?: HistoricalContext
): string {
  const contact = HIERARCHY_CONTACTS.find((c) => c.role === targetRole) ?? HIERARCHY_CONTACTS[0];
  const plainExp = getPlainEnglishExplanation(details.failureMode, details.verdict);
  const part = details.partId || "INSP-LIVE";
  const station = details.station || "ST-04 Finishing Line";
  const isReject = details.verdict === "REJECT" || (details.rpn !== undefined && details.rpn >= 180);
  const isReview = details.verdict === "REVIEW" || (details.rpn !== undefined && details.rpn >= 100 && details.rpn < 180);

  if (targetRole === "operator") {
    return [
      `🚨 AUTOAUDIT FLOOR INSTRUCTION · LEVEL 1: OPERATOR`,
      `To: ${contact.name} (${contact.title})`,
      `Part ID: ${part}`,
      `Station: ${station}`,
      `Verdict: ${isReject ? "❌ RED / SCRAP (DO NOT SHIP)" : isReview ? "⚠️ YELLOW / QA HOLD" : "✅ GREEN / PASS"}`,
      ``,
      `👉 IMMEDIATE FLOOR ACTION:`,
      isReject
        ? `• Remove part immediately from the conveyor.\n• Place in RED QUARANTINE BIN #2.\n• If another red part appears within 15 mins, pause line and alert Vikram.`
        : isReview
        ? `• Move part to side rack for QA review.\n• Do NOT pack into finished goods crate.\n• Wait for Priya (QA) clearance.`
        : `• Pass part forward to next station.\n• Component is road-ready and approved.`,
      ``,
      `Plain-English Reason:`,
      plainExp,
      ``,
      `AutoAudit Floor Intelligence · Sent to ${contact.phone}`,
    ].join("\n");
  }

  if (targetRole === "quality_engineer") {
    return [
      `🔬 AUTOAUDIT QA ALERT · LEVEL 2: QUALITY ASSURANCE`,
      `To: ${contact.name} (${contact.title})`,
      `Part ID: ${part}`,
      `Station: ${station}`,
      `Defect Mode: ${details.failureMode}`,
      `Risk / RPN: ${details.probability || "High"} · FMEA RPN ${details.rpn ?? "Logged"}`,
      ``,
      `Plain-English Summary:`,
      plainExp,
      ``,
      `QA Action Required:`,
      `• Part held in AutoAudit Human Review Queue for review.`,
      `• Inspect AI polygon segmentation and verify DTV / runout limits.`,
      `• Confirm final disposition (Release / Quarantine / Scrap).`,
      ``,
      `AutoAudit QA Lab · Sent to ${contact.phone}`,
    ].join("\n");
  }

  if (targetRole === "maintenance") {
    return [
      `⚙️ AUTOAUDIT EQUIPMENT WARNING · LEVEL 3: MAINTENANCE`,
      `To: ${contact.name} (${contact.title})`,
      `Station: ${station}`,
      `Machine Status: Tooling wear / spindle drift detected`,
      `Failure Pattern: ${details.failureMode}`,
      ``,
      `Plain-English Diagnosis:`,
      plainExp,
      ``,
      `Recommended Maintenance Actions:`,
      details.action || `• Check lathe cutting insert sharpness and replace worn tips.\n• Re-torque spindle clamping chuck.\n• Clean coolant nozzles and verify lubrication pressure.`,
      ``,
      `Inspection Reference: ${part}`,
      `AutoAudit Tooling Intelligence · Sent to ${contact.phone}`,
    ].join("\n");
  }

  // Manager
  const total = historicalContext?.totalInspected ?? 28;
  const fpy = historicalContext?.passRate ? (historicalContext.passRate * 100).toFixed(1) : "92.8";
  const scrap = historicalContext?.scrapCount ?? 2;
  const scrapCost = historicalContext?.scrapCost ?? scrap * 850;

  return [
    `📊 AUTOAUDIT SHIFT BRIEFING · LEVEL 4: PLANT MANAGEMENT`,
    `To: ${contact.name} (${contact.title})`,
    `Plant Operational Health: ${Number(fpy) >= 95 ? "🟢 Nominal (≥95%)" : "⚠️ Needs Attention"}`,
    ``,
    `Shift Metrics:`,
    `• First-Pass Yield (FPY): ${fpy}% (Target: 95.0%)`,
    `• Parts Scrapped: ${scrap} unit(s)`,
    `• Est. Scrap Cost Loss: ₹${scrapCost.toLocaleString()}`,
    `• Total Inspected: ${total} brake discs`,
    ``,
    `Executive Summary (Plain English):`,
    `Event on ${station} (${details.failureMode}). ${plainExp}`,
    `Operator Rajesh Kumar, QA Priya Sharma, and Maintenance Vikram Singh have been briefed with corresponding floor and tooling actions.`,
    ``,
    `AutoAudit Executive Briefing · Sent to ${contact.phone}`,
  ].join("\n");
}

export function WhatsAppDispatchAction({
  details,
  thresholdLabel,
  historicalContext,
}: {
  details: DispatchDetails;
  thresholdLabel: string;
  historicalContext?: HistoricalContext;
}) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<WhatsAppStatusResponse>({ isConnected: false, qrDataUrl: null, directory: {} });
  const [selectedRole, setSelectedRole] = useState<UserRole>("maintenance");
  const [sendToAll, setSendToAll] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState("");
  const [customDraft, setCustomDraft] = useState("");

  const currentContact = useMemo(() => {
    return HIERARCHY_CONTACTS.find((c) => c.role === selectedRole) ?? HIERARCHY_CONTACTS[2];
  }, [selectedRole]);

  // Update default draft when selected role or details change
  useEffect(() => {
    setCustomDraft(buildHierarchyMessage(selectedRole, details, historicalContext));
  }, [selectedRole, details, historicalContext]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    const refresh = async () => {
      const next = await fetchWhatsAppStatus();
      if (!active) return;
      setStatus(next);
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 3000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [open]);

  const openFallback = (contact = currentContact) => {
    const digits = contact.cleanPhone;
    const msg = customDraft || buildHierarchyMessage(contact.role, details, historicalContext);
    window.open(`https://wa.me/${digits}?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");
  };

  const sendSingle = async (contact: HierarchyContact, customText?: string) => {
    const actionText = (customText || customDraft).slice(0, 690);
    const result = await dispatchWhatsAppAlert({
      phone: contact.cleanPhone,
      stationKey: contact.stationKey || "DEFAULT",
      station: `${contact.hierarchyTitle} · ${details.station || "ST-04"}`,
      failureMode: details.failureMode || "Inspection alert",
      rpn: details.rpn,
      probability: details.probability,
      action: actionText,
      partId: details.partId || "INSP-LIVE",
      dispatchKey: `hierarchy:${contact.role}:${details.partId || Date.now()}`,
    });
    if (!result.success) throw new Error(result.error || `Dispatch to ${contact.title} failed.`);
    const logEntry = {
      dispatchId: result.dispatchId || `dispatch-${Date.now()}`,
      sentAt: result.sentAt || new Date().toISOString(),
      recipient: `${contact.title} (${contact.name})`,
      station: details.station || "ST-04",
      partId: details.partId || "INSP-LIVE",
      failureMode: details.failureMode,
      status: "sent" as const,
      automatic: false,
    };
    recordWhatsAppDispatch(logEntry);
    return logEntry;
  };

  const handleSend = async () => {
    setBusy(true);
    setMessage("");
    setSuccess("");
    try {
      if (sendToAll) {
        const results = [];
        for (const contact of HIERARCHY_CONTACTS) {
          const msg = buildHierarchyMessage(contact.role, details, historicalContext);
          results.push(await sendSingle(contact, msg));
        }
        setSuccess("Successfully dispatched to all 4 hierarchy levels (Operator, QA, Maintenance, Management)!");
      } else {
        const sent = await sendSingle(currentContact);
        setSuccess(`Successfully dispatched to ${sent.recipient} (${currentContact.phone}) at ${new Date(sent.sentAt).toLocaleTimeString()}!`);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "WhatsApp dispatch failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="aa-whatsapp-trigger">
        <div>
          <b style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}><AppIcon name="phone" size={15} color="#059669" /> Hierarchy WhatsApp Dispatch Available</b>
          <span>{thresholdLabel} · Sends role-tailored alerts to Operator, QA, Maintenance or Management</span>
        </div>
        <button
          className="button button-primary"
          onClick={() => {
            setOpen(true);
            setMessage("");
            setSuccess("");
          }}
          style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
        >
          <AppIcon name="phone" size={14} /> Send Hierarchy WhatsApp Alert
        </button>
      </div>

      {open && (
        <div
          className="aa-whatsapp-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !busy) setOpen(false);
          }}
        >
          <section className="aa-whatsapp-modal" role="dialog" aria-modal="true" aria-labelledby="aa-whatsapp-title">
            <div className="aa-whatsapp-modal-head">
              <div>
                <span className="eyebrow">AUTOAUDIT PLANT ALERT SYSTEM</span>
                <h2 id="aa-whatsapp-title">Hierarchy WhatsApp Dispatch</h2>
                <p>Send role-tailored, plain-English notifications to the exact team contact.</p>
              </div>
              <button className="icon-button" aria-label="Close dispatch" onClick={() => setOpen(false)}>
                ×
              </button>
            </div>

            <div className="aa-whatsapp-connection">
              <span className={`aa-whatsapp-status-dot ${status.isConnected ? "online" : "offline"}`} />
              <b>
                {status.isConnected
                  ? "Live WhatsApp Gateway Online · Direct Delivery Ready"
                  : "WhatsApp Gateway Connecting / Standby"}
              </b>
              <small>
                {status.isConnected ? "ECS Baileys Service Active" : "Click 'Open in WhatsApp Web' for instant delivery"}
              </small>
            </div>

            {!status.isConnected && status.qrDataUrl && (
              <div className="aa-whatsapp-pairing">
                <Image unoptimized src={status.qrDataUrl} width={132} height={132} alt="WhatsApp pairing QR code" />
                <p>
                  Scan with WhatsApp on the plant dispatch phone: <b>Settings → Linked devices → Link a device</b>.
                </p>
              </div>
            )}

            {/* Hierarchy Level Selector */}
            <div style={{ display: "grid", gap: "8px" }}>
              <span style={{ fontSize: "13px", fontWeight: "700", color: "#334155" }}>
                Select Hierarchy Recipient
              </span>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                  gap: "8px",
                }}
              >
                {HIERARCHY_CONTACTS.map((contact) => {
                  const isSelected = selectedRole === contact.role && !sendToAll;
                  return (
                    <button
                      key={contact.role}
                      type="button"
                      onClick={() => {
                        setSelectedRole(contact.role);
                        setSendToAll(false);
                      }}
                      style={{
                        display: "grid",
                        gap: "3px",
                        padding: "10px 12px",
                        textAlign: "left",
                        border: isSelected ? "2px solid #13a9bb" : "1px solid #d5dee8",
                        borderRadius: "10px",
                        background: isSelected ? "#f0fdfa" : "#fff",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <AppIcon name={contact.iconName} size={16} color="#0284c7" />
                        <b style={{ fontSize: "12px", color: "#1e293b" }}>{contact.title}</b>
                      </div>
                      <span style={{ fontSize: "11px", color: "#475569" }}>{contact.name}</span>
                      <small style={{ fontSize: "11px", color: "#0d9488", fontWeight: "600" }}>{contact.phone}</small>
                    </button>
                  );
                })}
              </div>

              {/* Escalate All Toggle */}
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "10px 14px",
                  marginTop: "4px",
                  border: "1px solid #fed7aa",
                  borderRadius: "8px",
                  background: sendToAll ? "#fffbeb" : "#fff",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={sendToAll}
                  onChange={(e) => setSendToAll(e.target.checked)}
                  style={{ width: "18px", height: "18px", cursor: "pointer" }}
                />
                <div>
                  <b style={{ fontSize: "13px", color: "#b45309", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                    <AppIcon name="rocket" size={14} color="#d97706" /> Escalate to Entire Hierarchy (All 4 Levels)
                  </b>
                  <p style={{ margin: 0, fontSize: "11px", color: "#78350f" }}>
                    Sends tailored individual messages to Operator ({HIERARCHY_CONTACTS[0].phone}), QA ({HIERARCHY_CONTACTS[1].phone}), Maintenance ({HIERARCHY_CONTACTS[2].phone}), and Management ({HIERARCHY_CONTACTS[3].phone}).
                  </p>
                </div>
              </label>
            </div>

            {/* Recipient Card */}
            {!sendToAll && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                }}
              >
                <div>
                  <div style={{ fontSize: "12px", fontWeight: "700", color: "#64748b" }}>
                    LEVEL {currentContact.level} RECIPIENT
                  </div>
                  <div style={{ fontSize: "14px", fontWeight: "800", color: "#0f172a" }}>
                    {currentContact.title} · {currentContact.name}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "11px", color: "#64748b" }}>TARGET NUMBER</div>
                  <div style={{ fontSize: "14px", fontWeight: "700", color: "#0d9488" }}>
                    {currentContact.phone}
                  </div>
                </div>
              </div>
            )}

            {/* Message Preview & Edit */}
            <label className="aa-whatsapp-field">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>Role-Tailored Message (Plain English · Editable)</span>
                <span style={{ fontSize: "11px", color: "#0d9488", fontWeight: "600", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                  <AppIcon name="check" size={12} color="#0d9488" /> Tailored for {sendToAll ? "All 4 Roles" : currentContact.title}
                </span>
              </div>
              <textarea
                value={customDraft}
                onChange={(e) => setCustomDraft(e.target.value)}
                placeholder="Message body"
                rows={10}
              />
              <small>
                {sendToAll
                  ? "When escalating to all 4 levels, each recipient automatically receives their role-tailored plain-English instructions."
                  : "You can customize this message before dispatching. It contains zero technical jargon for clarity."}
              </small>
            </label>

            {message && (
              <div className="aa-whatsapp-feedback error" role="alert">
                {message}
              </div>
            )}
            {success && (
              <div className="aa-whatsapp-feedback success" role="status">
                {success}
              </div>
            )}

            <div className="aa-whatsapp-modal-actions">
              <button
                type="button"
                className="button button-secondary"
                onClick={() => openFallback()}
                title="Direct link opening chat in WhatsApp Web"
                style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <AppIcon name="phone" size={14} /> Open in WhatsApp Web ({currentContact.phone})
              </button>
              <button
                type="button"
                className="button button-primary"
                onClick={() => void handleSend()}
                disabled={busy}
              >
                {busy ? (
                  "Dispatching…"
                ) : sendToAll ? (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                    <AppIcon name="rocket" size={14} /> Confirm &amp; Dispatch to All 4 Roles
                  </span>
                ) : (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                    <AppIcon name="phone" size={14} /> Send to {currentContact.title}
                  </span>
                )}
              </button>
            </div>
            <small className="aa-whatsapp-disclaimer">
              Deliveries are dispatched through the AutoAudit WhatsApp microservice. You can also click &ldquo;Open in WhatsApp Web&rdquo; for instant web delivery.
            </small>
          </section>
        </div>
      )}
    </>
  );
}
