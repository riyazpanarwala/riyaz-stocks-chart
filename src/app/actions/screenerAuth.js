"use server";

import { cookies } from "next/headers";
import crypto from "node:crypto";

const COOKIE_NAME = "screener_access_token";
const SECRET_SALT = process.env.SCREENER_SECRET_SALT || "riyaz-stocks-screener-auth-salt-2026";

/**
 * Returns the list of authorized passcodes.
 * Defaults to "trader2026" if SCREENER_PASSWORDS is not set in environment.
 */
function getAuthorizedPasscodes() {
  const envPass = process.env.SCREENER_PASSWORDS || "";
  const list = envPass
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  if (list.length === 0) {
    list.push("trader2026");
  }
  return list;
}

/**
 * Creates an HMAC signature token for an authorized passcode.
 */
function generateTokenForPasscode(passcode) {
  return crypto
    .createHmac("sha256", SECRET_SALT)
    .update(`auth:${passcode}`)
    .digest("hex");
}

/**
 * Checks if the current request has a valid screener session cookie.
 * @returns {Promise<{ authenticated: boolean }>}
 */
export async function checkScreenerAccessAction() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;

    if (!token) {
      return { authenticated: false };
    }

    const authorizedList = getAuthorizedPasscodes();
    const validTokens = authorizedList.map(generateTokenForPasscode);

    const isValid = validTokens.includes(token);
    return { authenticated: isValid };
  } catch (error) {
    console.error("[checkScreenerAccessAction] Error:", error);
    return { authenticated: false };
  }
}

/**
 * Verifies a submitted passcode. If valid, sets an httpOnly 30-day session cookie.
 * @param {string} rawPasscode
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function verifyScreenerAccessAction(rawPasscode) {
  try {
    const passcode = (rawPasscode || "").trim();
    if (!passcode) {
      return { success: false, error: "Please enter an access passcode." };
    }

    const authorizedList = getAuthorizedPasscodes();
    const matched = authorizedList.find((p) => p === passcode);

    if (!matched) {
      return { success: false, error: "Invalid passcode. Please check and try again." };
    }

    const token = generateTokenForPasscode(matched);
    const cookieStore = await cookies();

    cookieStore.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: "/",
    });

    return { success: true };
  } catch (error) {
    console.error("[verifyScreenerAccessAction] Error:", error);
    return { success: false, error: "Authentication service error." };
  }
}

/**
 * Clears the screener session cookie to lock access.
 * @returns {Promise<{ success: boolean }>}
 */
export async function lockScreenerAccessAction() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(COOKIE_NAME);
    return { success: true };
  } catch (error) {
    console.error("[lockScreenerAccessAction] Error:", error);
    return { success: false };
  }
}
