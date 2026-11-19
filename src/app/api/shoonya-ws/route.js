import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const uid = process.env.SHOONYA_UID?.trim();
  const accessToken = process.env.SHOONYA_ACCESS_TOKEN?.trim();

  if (!uid || !accessToken) {
    return NextResponse.json(
      { ok: false, error: "Shoonya credentials (SHOONYA_UID / SHOONYA_ACCESS_TOKEN) are not configured." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      wsUrl: "wss://api.shoonya.com/NorenWSTP/",
      uid,
      token: accessToken,
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
