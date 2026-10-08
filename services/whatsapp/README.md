# AutoAudit WhatsApp Dispatch Service

This is a local Baileys-based, manager-confirmed maintenance dispatch integration. It is unofficial WhatsApp Web automation, so use a dedicated, authorized WhatsApp account and keep the paired device/session under plant IT control.

## Local setup

1. Copy `.env.example` to `.env` and set a long random `WHATSAPP_SERVICE_TOKEN`. Set `WHATSAPP_EXPECTED_SENDER` and each directory `phone` to the approved number, including country calling code as digits only. The checked-in defaults intentionally contain no phone numbers.
2. Set the same `WHATSAPP_SERVICE_TOKEN` in `frontend/.env.local`, and set `WHATSAPP_SERVICE_URL=http://127.0.0.1:3001`.
3. Install and start this service from this directory with `npm install` and `npm start`. Keep the process running; Baileys credentials persist in `auth_baileys/` and are excluded from Git.
4. Open AutoAudit, choose **Review & Send Maintenance Dispatch**, and scan the QR from WhatsApp → Linked devices. Pair only the dedicated dispatch account.

The server binds to loopback (`127.0.0.1`). Next.js proxies status and dispatch requests through its server routes, keeping the service token out of browser code. A production deployment needs a private service URL, persistent storage for the Baileys credentials, TLS at the public app edge, and authentication/authorization around the AutoAudit dashboard before exposing dispatch to multiple users.

The browser keeps a bounded local dispatch audit list. A successful response means the message was submitted to WhatsApp; this integration does not confirm recipient delivery or read receipts. If the socket is down, the modal offers a `wa.me` handoff so a manager can send the reviewed text manually.
