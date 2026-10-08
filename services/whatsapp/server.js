const express = require("express");
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require("@whiskeysockets/baileys");
const pino = require("pino");
const QRCode = require("qrcode");
const path = require("node:path");
const crypto = require("node:crypto");
const fs = require("node:fs");

function loadLocalEnv() {
  try {
    const lines = fs.readFileSync(path.join(__dirname, ".env"), "utf8").split(/\r?\n/);
    for (const line of lines) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!match || match[1].startsWith("#") || process.env[match[1]] !== undefined) continue;
      let value = match[2];
      if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
      process.env[match[1]] = value;
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

loadLocalEnv();

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "32kb" }));

const PORT = Number(process.env.WHATSAPP_PORT || 3001);
const TOKEN = process.env.WHATSAPP_SERVICE_TOKEN || "";
const EXPECTED_SENDER = String(process.env.WHATSAPP_EXPECTED_SENDER || "").replace(/\D/g, "");
const AUTH_DIR = path.join(__dirname, "auth_baileys");
const DEFAULT_DIRECTORY = {
  "ST-02": { name: "Thermal Quenching Lead", phone: "", station: "ST-02 Induction Hardening" },
  "ST-04": { name: "Grinding & Lathe Lead", phone: "", station: "ST-04 Finish Lathe & Grinding" },
  "ST-01": { name: "Foundry Supervisor", phone: "", station: "ST-01 Casting & Roughing" },
  DEFAULT: { name: "Shift Maintenance Manager", phone: "", station: "Default escalation" },
};

function loadDirectory() {
  if (!process.env.WHATSAPP_DIRECTORY_JSON) return DEFAULT_DIRECTORY;
  try {
    const parsed = JSON.parse(process.env.WHATSAPP_DIRECTORY_JSON);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Expected a JSON object");
    return Object.fromEntries(Object.entries(parsed).map(([key, entry]) => {
      if (!entry || typeof entry !== "object") throw new Error(`Invalid directory entry: ${key}`);
      return [key, {
        name: String(entry.name || key).slice(0, 100),
        phone: String(entry.phone || "").replace(/\D/g, ""),
        station: String(entry.station || key).slice(0, 120),
      }];
    }));
  } catch (error) {
    console.error("Invalid WHATSAPP_DIRECTORY_JSON:", error.message);
    return DEFAULT_DIRECTORY;
  }
}

const DIRECTORY = loadDirectory();
let sock = null;
let qrDataUrl = null;
let isConnected = false;
let senderMatchesExpected = null;
let starting = false;
let loggedOut = false;

function authorized(req, res, next) {
  if (!TOKEN) return res.status(503).json({ error: "WhatsApp service token is not configured." });
  const supplied = req.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  const expectedBuffer = Buffer.from(TOKEN);
  const suppliedBuffer = Buffer.from(supplied);
  if (expectedBuffer.length !== suppliedBuffer.length || !crypto.timingSafeEqual(expectedBuffer, suppliedBuffer)) {
    return res.status(401).json({ error: "Unauthorized." });
  }
  next();
}

function safeText(value, fallback, limit = 500) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, limit) : fallback;
}

async function startBaileys() {
  if (starting || loggedOut) return;
  starting = true;
  try {
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    const socket = makeWASocket({ auth: state, logger: pino({ level: "silent" }), printQRInTerminal: false });
    sock = socket;
    socket.ev.on("connection.update", async ({ connection, lastDisconnect, qr }) => {
      if (qr) qrDataUrl = await QRCode.toDataURL(qr);
      if (connection === "open") {
        qrDataUrl = null;
        loggedOut = false;
        const linkedId = String(socket.user?.id || "").split("@")[0].split(":")[0].replace(/\D/g, "");
        senderMatchesExpected = Boolean(linkedId && (!EXPECTED_SENDER || linkedId === EXPECTED_SENDER));
        isConnected = senderMatchesExpected;
        if (isConnected) console.log("AutoAudit WhatsApp linked with the configured sender account.");
        else console.error("Linked WhatsApp account does not match WHATSAPP_EXPECTED_SENDER; dispatch is disabled.");
      }
      if (connection === "close") {
        isConnected = false;
        senderMatchesExpected = null;
        sock = null;
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        loggedOut = statusCode === DisconnectReason.loggedOut;
        if (!loggedOut) setTimeout(() => void startBaileys(), 1500);
        else console.warn("WhatsApp logged out; relink by scanning a fresh QR code.");
      }
    });
    socket.ev.on("creds.update", saveCreds);
  } catch (error) {
    console.error("Could not start WhatsApp connection:", error.message);
    setTimeout(() => void startBaileys(), 5000);
  } finally {
    starting = false;
  }
}

app.get("/status", authorized, (_req, res) => {
  res.json({ isConnected, qrDataUrl, directory: DIRECTORY, senderMatchesExpected });
});

app.post("/send-alert", authorized, async (req, res) => {
  const { phone, stationKey, station, failureMode, rpn, probability, action, partId } = req.body || {};
  if (!sock || !isConnected) return res.status(503).json({ error: "WhatsApp is not linked. Pair it with the QR code or use the manual WhatsApp fallback." });
  if (typeof stationKey !== "string" || !DIRECTORY[stationKey]) return res.status(400).json({ error: "Choose a configured maintenance station." });
  const recipient = DIRECTORY[stationKey];
  const targetPhone = String(phone || recipient.phone || "").replace(/\D/g, "");
  if (!/^\d{8,15}$/.test(targetPhone)) return res.status(400).json({ error: "Enter a valid international phone number (8–15 digits)." });
  if (recipient.phone && targetPhone !== recipient.phone) return res.status(403).json({ error: "This dispatch is restricted to the configured maintenance number." });
  if (typeof action !== "string" || !action.trim()) return res.status(400).json({ error: "A corrective action is required." });

  const timestamp = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "medium", timeZone: "Asia/Kolkata" }).format(new Date());
  const message = [
    "🚨 *AUTOAUDIT MAINTENANCE DISPATCH*",
    "",
    `*Station:* ${safeText(station, recipient.station || stationKey, 120)}`,
    `*Recipient:* ${safeText(recipient.name, "Maintenance technician", 100)}`,
    `*Failure mode:* ${safeText(failureMode, "Inspection risk flagged", 160)}`,
    `*Predictive risk:* ${safeText(probability, "Not supplied", 40)}`,
    `*FMEA RPN:* ${Number.isFinite(Number(rpn)) ? Number(rpn) : "Not supplied"}`,
    "",
    "*Recommended action:*",
    safeText(action, "Review the component and follow plant maintenance procedure.", 700),
    "",
    `*Inspection ID:* ${safeText(partId, "INSP-LIVE", 100)}`,
    `*Time (IST):* ${timestamp}`,
    "_Sent by AutoAudit after manager confirmation._",
  ].join("\n");

  try {
    const jid = `${targetPhone}@s.whatsapp.net`;
    await sock.sendMessage(jid, { text: message });
    res.json({ success: true, deliveredTo: jid, recipientName: recipient.name, dispatchId: crypto.randomUUID() });
  } catch (error) {
    res.status(502).json({ error: `WhatsApp could not accept the dispatch: ${safeText(error.message, "unknown error", 180)}` });
  }
});

app.listen(PORT, "127.0.0.1", () => {
  console.log(`AutoAudit WhatsApp service listening on 127.0.0.1:${PORT}`);
  void startBaileys();
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    try { sock?.end(undefined); } catch { /* Socket may already be closed. */ }
    process.exit(0);
  });
}
