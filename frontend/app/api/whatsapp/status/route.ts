import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const baseUrl = process.env.WHATSAPP_SERVICE_URL ?? "http://127.0.0.1:3001";
  const token = process.env.WHATSAPP_SERVICE_TOKEN;
  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/status`, {
      cache: "no-store",
      headers: token ? { authorization: `Bearer ${token}` } : {},
      signal: AbortSignal.timeout(3000),
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json({ isConnected: false, qrDataUrl: null, directory: {} }, { status: 503 });
  }
}
