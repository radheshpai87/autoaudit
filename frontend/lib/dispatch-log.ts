export interface WhatsAppDispatchLogEntry {
  dispatchId: string;
  dispatchKey?: string;
  sentAt: string;
  recipient: string;
  station: string;
  partId: string;
  failureMode: string;
  status: "sent" | "failed";
  automatic: boolean;
  message?: string;
}

const LOG_KEY = "autoaudit-whatsapp-dispatch-log-v1";
const STATUS_EVENT = "autoaudit:whatsapp-dispatch-status";

export function getWhatsAppDispatchLog(): WhatsAppDispatchLogEntry[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(LOG_KEY) || "[]");
    return Array.isArray(parsed) ? parsed as WhatsAppDispatchLogEntry[] : [];
  } catch {
    return [];
  }
}

export function recordWhatsAppDispatch(entry: WhatsAppDispatchLogEntry) {
  try {
    const log = getWhatsAppDispatchLog();
    const next = [entry, ...log.filter((item) => item.dispatchId !== entry.dispatchId)].slice(0, 250);
    window.localStorage.setItem(LOG_KEY, JSON.stringify(next));
  } catch { /* Report the result even if browser audit storage is full. */ }
  window.dispatchEvent(new CustomEvent<WhatsAppDispatchLogEntry>(STATUS_EVENT, { detail: entry }));
}

export const whatsappDispatchStatusEvent = STATUS_EVENT;
