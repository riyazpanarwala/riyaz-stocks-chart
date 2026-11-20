import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Health check endpoint for Shoonya credentials status.
 * Note: Never exposes credentials (UID, token, or secrets) to the client.
 */
export async function GET() {
  const uid = process.env.SHOONYA_UID?.trim();
  const accessToken = process.env.SHOONYA_ACCESS_TOKEN?.trim();

  const isConfigured = Boolean(uid && accessToken);

  return NextResponse.json(
    {
      ok: isConfigured,
      configured: isConfigured,
      mode: "server-stream",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
