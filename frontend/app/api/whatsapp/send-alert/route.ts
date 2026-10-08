import { NextResponse } from "next/server";

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request." }, { status: 400 });
  }

  const baseUrl = process.env.WHATSAPP_SERVICE_URL ?? "http://127.0.0.1:3001";
  const token = process.env.WHATSAPP_SERVICE_TOKEN;
  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/send-alert`, {
      method: "POST",
      headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json({ error: "WhatsApp service is unavailable. Use the manual WhatsApp fallback." }, { status: 503 });
  }
}
