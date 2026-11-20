import { NextResponse } from "next/server";

/**
 * Constant-time string comparison to prevent timing attacks.
 */
function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

/**
 * Validates a screener session cookie against authorized passcodes using Web Crypto HMAC-SHA256.
 */
async function isValidCookieToken(token, passcodes, salt) {
  if (!token || !salt || passcodes.length === 0) return false;
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(salt),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );

    for (const pass of passcodes) {
      const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(`auth:${pass}`));
      const hex = Array.from(new Uint8Array(sig))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      if (safeEqual(hex, token)) {
        return true;
      }
    }
  } catch {
    // ignore crypto errors and fail closed
  }
  return false;
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Paths requiring protection
  const isShoonyaRoute = pathname.startsWith("/api/shoonya-");
  const protectAll = process.env.PROTECT_ALL_ROUTES === "true";

  if (!isShoonyaRoute && !protectAll) {
    return NextResponse.next();
  }

  const expectedUser = (process.env.AUTH_USER || "admin").trim();
  const authPassword = process.env.AUTH_PASSWORD?.trim();
  const screenerPasswords = (process.env.SCREENER_PASSWORDS || "")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  const screenerSalt = process.env.SCREENER_SECRET_SALT?.trim();

  // Allowed passwords: either AUTH_PASSWORD or any entry in SCREENER_PASSWORDS
  const allowedPasswords = [
    ...(authPassword ? [authPassword] : []),
    ...screenerPasswords,
  ];

  // If no authentication is configured on the server
  if (allowedPasswords.length === 0) {
    if (process.env.NODE_ENV === "production") {
      return new NextResponse(
        JSON.stringify({ error: "Access denied. Server authentication is not configured in production." }),
        { status: 503, headers: { "Content-Type": "application/json" } },
      );
    }
    // Allow in local development mode
    return NextResponse.next();
  }

  // 1. Check HTTP Basic Auth Header
  const authHeader = request.headers.get("authorization") || "";
  if (authHeader.startsWith("Basic ")) {
    try {
      const b64 = authHeader.slice(6).trim();
      const decoded = atob(b64);
      const colonIdx = decoded.indexOf(":");
      if (colonIdx !== -1) {
        const user = decoded.slice(0, colonIdx);
        const pass = decoded.slice(colonIdx + 1);

        const isUserValid = safeEqual(user, expectedUser) || user === "";
        const isPassValid = allowedPasswords.some((p) => safeEqual(pass, p));

        if (isUserValid && isPassValid) {
          return NextResponse.next();
        }
      }
    } catch {
      // invalid basic header
    }
  }

  // 2. Check Bearer Token / API Key Header (useful for curl, scripts, webhooks)
  if (authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    if (allowedPasswords.some((p) => safeEqual(token, p))) {
      return NextResponse.next();
    }
  }
  const apiKey = request.headers.get("x-api-key");
  if (apiKey && allowedPasswords.some((p) => safeEqual(apiKey, p))) {
    return NextResponse.next();
  }

  // 3. Check Screener Access Token Cookie
  const cookieToken = request.cookies.get("screener_access_token")?.value;
  if (cookieToken && screenerSalt && screenerPasswords.length > 0) {
    const isCookieValid = await isValidCookieToken(cookieToken, screenerPasswords, screenerSalt);
    if (isCookieValid) {
      return NextResponse.next();
    }
  }

  // Authentication failed: Return 401 with WWW-Authenticate challenge
  const isApiRequest = pathname.startsWith("/api/");
  if (isApiRequest) {
    return new NextResponse(
      JSON.stringify({ error: "Unauthorized. Valid credentials required." }),
      {
        status: 401,
        headers: {
          "Content-Type": "application/json",
          "WWW-Authenticate": 'Basic realm="Shoonya API Access"',
        },
      },
    );
  }

  return new NextResponse("Authentication required", {
    status: 401,
    headers: {
      "Content-Type": "text/plain",
      "WWW-Authenticate": 'Basic realm="Secure Stock Dashboard"',
    },
  });
}

export const config = {
  matcher: [
    /*
     * Match all requests except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt
     */
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
