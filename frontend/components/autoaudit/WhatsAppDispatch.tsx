"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { dispatchWhatsAppAlert, fetchWhatsAppStatus, type WhatsAppDirectoryEntry, type WhatsAppStatusResponse } from "../../lib/api";

type DispatchDetails = {
  station: string;
  failureMode: string;
  rpn?: number;
  probability?: string;
  action: string;
  partId?: string;
};

function stationKeyFor(station: string) {
  return station.match(/\bST-\d+\b/i)?.[0]?.toUpperCase() ?? "DEFAULT";
}

function buildMessage(details: DispatchDetails, recipient: WhatsAppDirectoryEntry | undefined, probability: string, rpn: string) {
  return [
    "🚨 AUTOAUDIT MAINTENANCE DISPATCH",
    `Station: ${details.station || recipient?.station || "Station not provided"}`,
    `Failure mode: ${details.failureMode}`,
    `Predictive risk: ${probability || "Not supplied"}`,
    `FMEA RPN: ${rpn || "Not supplied"}`,
    `Recommended action: ${details.action}`,
    `Inspection ID: ${details.partId || "INSP-LIVE"}`,
    "Sent after manager confirmation.",
  ].join("\n");
}

export function WhatsAppDispatchAction({ details, thresholdLabel }: { details: DispatchDetails; thresholdLabel: string }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<WhatsAppStatusResponse>({ isConnected: false, qrDataUrl: null, directory: {} });
  const [stationKey, setStationKey] = useState(() => stationKeyFor(details.station));
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState("");
  const knownDirectory = Object.keys(status.directory).length > 0;
  const selectedRecipient = status.directory[stationKey] ?? status.directory.DEFAULT;
  const rpn = details.rpn === undefined ? "" : String(details.rpn);
  const probability = details.probability ?? "";
  const preview = useMemo(() => buildMessage(details, selectedRecipient, probability, rpn), [details, selectedRecipient, probability, rpn]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    const refresh = async () => {
      const next = await fetchWhatsAppStatus();
      if (!active) return;
      setStatus(next);
      const autoKey = stationKeyFor(details.station);
      const selectedKey = next.directory[autoKey] ? autoKey : next.directory.DEFAULT ? "DEFAULT" : Object.keys(next.directory)[0];
      if (selectedKey) {
        setStationKey(selectedKey);
        setPhone((current) => current || next.directory[selectedKey]?.phone || "");
      }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 2500);
    return () => { active = false; window.clearInterval(timer); };
  }, [open, details.station]);

  const openFallback = () => {
    const digits = phone.replace(/\D/g, "");
    if (!digits) { setMessage("Enter the maintenance recipient’s number first."); return; }
    window.open(`https://wa.me/${digits}?text=${encodeURIComponent(preview)}`, "_blank", "noopener,noreferrer");
  };

  const send = async () => {
    setBusy(true); setMessage(""); setSuccess("");
    try {
      const result = await dispatchWhatsAppAlert({ phone, stationKey, station: details.station, failureMode: details.failureMode, rpn: details.rpn, probability: details.probability, action: details.action, partId: details.partId });
      if (!result.success) throw new Error(result.error || "WhatsApp dispatch failed.");
      const logEntry = { id: result.dispatchId || `dispatch-${Date.now()}`, sentAt: new Date().toISOString(), recipient: result.recipientName || selectedRecipient?.name || "Maintenance", station: details.station || selectedRecipient?.station || "Station not supplied", partId: details.partId || "INSP-LIVE", failureMode: details.failureMode, status: "submitted_to_whatsapp" };
      try {
        const key = "autoaudit-whatsapp-dispatch-log-v1";
        const oldValue = window.localStorage.getItem(key);
        const history = oldValue ? JSON.parse(oldValue) as unknown[] : [];
        window.localStorage.setItem(key, JSON.stringify([logEntry, ...(Array.isArray(history) ? history : [])].slice(0, 250)));
      } catch { /* Dispatch succeeds even if the browser audit log is unavailable. */ }
      setSuccess(`Alert submitted to WhatsApp for ${logEntry.recipient}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "WhatsApp dispatch failed.");
    } finally { setBusy(false); }
  };

  return <>
    <div className="aa-whatsapp-trigger">
      <div><b>Maintenance dispatch recommended</b><span>{thresholdLabel} · manager approval required</span></div>
      <button className="button button-primary" onClick={() => { setOpen(true); setMessage(""); setSuccess(""); }}>📱 Review &amp; Send Maintenance Dispatch</button>
    </div>
    {open && <div className="aa-whatsapp-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setOpen(false); }}>
      <section className="aa-whatsapp-modal" role="dialog" aria-modal="true" aria-labelledby="aa-whatsapp-title">
        <div className="aa-whatsapp-modal-head"><div><span className="eyebrow">MANAGER APPROVAL</span><h2 id="aa-whatsapp-title">Maintenance Team Quality Dispatch</h2><p>Review the recipient and message before sending.</p></div><button className="icon-button" aria-label="Close dispatch" onClick={() => setOpen(false)}>×</button></div>
      <div className="aa-whatsapp-connection"><span className={`aa-whatsapp-status-dot ${status.isConnected ? "online" : "offline"}`}/><b>{status.isConnected ? "WhatsApp Linked · Ready to Dispatch" : knownDirectory && status.senderMatchesExpected === false && status.qrDataUrl === null ? "Linked account must match the configured sender number" : "WhatsApp not linked"}</b>{!knownDirectory && <small>Service unavailable or not configured</small>}</div>
        {!status.isConnected && !(knownDirectory && status.senderMatchesExpected === false) && <div className="aa-whatsapp-pairing">{status.qrDataUrl ? <Image unoptimized src={status.qrDataUrl} width={132} height={132} alt="WhatsApp pairing QR code"/> : <span className="aa-whatsapp-qr-placeholder">QR code appears when the local service is ready.</span>}<p>Scan with WhatsApp on the dispatch phone: <b>Settings → Linked devices → Link a device</b>.</p></div>}
        <label className="aa-whatsapp-field"><span>Station / maintenance recipient</span><select value={stationKey} onChange={(event) => { setStationKey(event.target.value); setPhone(status.directory[event.target.value]?.phone || ""); }}>{Object.entries(status.directory).map(([key, entry]) => <option key={key} value={key}>{entry.station} · {entry.name}</option>)}{!knownDirectory && <option value="DEFAULT">Default escalation (service unavailable)</option>}</select></label>
        <label className="aa-whatsapp-field"><span>Dispatch recipient · fixed by plant configuration</span><input value={phone} readOnly inputMode="tel" placeholder="Configured maintenance number"/><small>This prototype routes all stations to the configured AutoAudit number.</small></label>
        <label className="aa-whatsapp-field"><span>Message preview</span><textarea readOnly value={preview}/></label>
        {message && <div className="aa-whatsapp-feedback error" role="alert">{message}</div>}{success && <div className="aa-whatsapp-feedback success" role="status">✅ {success}</div>}
        <div className="aa-whatsapp-modal-actions"><button className="button button-secondary" onClick={openFallback}>Open in WhatsApp Web</button><button className="button button-primary" onClick={() => void send()} disabled={busy || !status.isConnected || phone.replace(/\D/g, "").length < 8}>{busy ? "Sending…" : "Confirm & Send WhatsApp Alert"}</button></div>
        <small className="aa-whatsapp-disclaimer">The service reports successful submission to WhatsApp; final delivery/read receipts are not verified here.</small>
      </section>
    </div>}
  </>;
}
