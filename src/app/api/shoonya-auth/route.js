import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const clientId = process.env.SHOONYA_CLIENT_ID?.trim();
  return NextResponse.json({
    configured: Boolean(clientId && process.env.SHOONYA_SECRET_CODE?.trim()),
    authorizeUrl: clientId
      ? `https://api.shoonya.com/OAuthlogin/authorize/oauth?client_id=${encodeURIComponent(clientId)}`
      : null,
  }, { headers: { "Cache-Control": "no-store" } });
}

function updateEnvValue(contents, key, value) {
  const line = `${key}=${value}`;
  const pattern = new RegExp(`^${key}=.*$`, "m");
  return pattern.test(contents) ? contents.replace(pattern, line) : `${contents.trimEnd()}\n${line}\n`;
}

export async function POST(request) {
  const clientId = process.env.SHOONYA_CLIENT_ID?.trim();
  const secretCode = process.env.SHOONYA_SECRET_CODE?.trim();
  if (!clientId || !secretCode) {
    return NextResponse.json({ error: "Add SHOONYA_CLIENT_ID and SHOONYA_SECRET_CODE to your local .env first." }, { status: 503 });
  }

  const { code } = await request.json().catch(() => ({}));
  if (typeof code !== "string" || !code.trim()) {
    return NextResponse.json({ error: "Paste the authorization code from the Shoonya browser URL." }, { status: 400 });
  }

  const checksum = createHash("sha256").update(`${clientId}${secretCode}${code.trim()}`).digest("hex");
  const body = `jData=${JSON.stringify({ code: code.trim(), checksum })}`;
  try {
    const response = await fetch("https://api.shoonya.com/NorenWClientAPI/GenAcsTok", {
      method: "POST",
      headers: { "Content-Type": "text/plain", Accept: "application/json" },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
    const result = await response.json();
    if (!response.ok || result?.stat !== "Ok" || !result?.susertoken) {
      return NextResponse.json({ error: result?.emsg || "Shoonya could not exchange that code. Generate a fresh code and try again." }, { status: 502 });
    }

    const envPath = path.join(process.cwd(), ".env");
    let contents = "";
    try { contents = await readFile(envPath, "utf8"); } catch (error) { if (error.code !== "ENOENT") throw error; }
    contents = updateEnvValue(contents, "SHOONYA_UID", result.uid || clientId);
    contents = updateEnvValue(contents, "SHOONYA_ACCESS_TOKEN", result.susertoken);
    await writeFile(envPath, contents, { encoding: "utf8", mode: 0o600 });
    process.env.SHOONYA_UID = result.uid || clientId;
    process.env.SHOONYA_ACCESS_TOKEN = result.susertoken;

    return NextResponse.json({ success: true, uid: result.uid || clientId });
  } catch (error) {
    console.error("Shoonya OAuth token exchange failed:", error.message);
    return NextResponse.json({ error: "Could not reach Shoonya or save the token to .env." }, { status: 502 });
  }
}
