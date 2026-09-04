"use server";

import { cookies } from "next/headers";
import crypto from "node:crypto";

const COOKIE_NAME = "screener_access_token";

/**
 * Returns the secret salt configured in the environment for HMAC token signing.
 * Returns an empty string when not configured, preventing hardcoded fallback vulnerability.
 * @returns {string} Secret salt string.
 */
function getSecretSalt() {
  return (process.env.SCREENER_SECRET_SALT || "").trim();
}

/**
 * Returns the list of authorized passcodes configured in the environment.
 * Denies access by returning an empty list when SCREENER_PASSWORDS is not configured.
 * @returns {string[]} List of authorized passcodes.
 */
function getAuthorizedPasscodes() {
  const envPass = process.env.SCREENER_PASSWORDS || "";
  return envPass
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
}

/**
 * Creates an HMAC signature token for an authorized passcode using the provided salt.
 * @param {string} passcode - Authorized passcode.
 * @param {string} salt - Secret salt for HMAC.
 * @returns {string} Hex-encoded HMAC digest.
 */
function generateTokenForPasscode(passcode, salt) {
  return crypto
    .createHmac("sha256", salt)
    .update(`auth:${passcode}`)
    .digest("hex");
}

/**
 * Checks if the current request has a valid screener session cookie.
 * Fails closed if secret salt or authorized passcodes are not configured.
 * @returns {Promise<{ authenticated: boolean }>}
 */
export async function checkScreenerAccessAction() {
  try {
    const salt = getSecretSalt();
    const authorizedList = getAuthorizedPasscodes();

    if (!salt || authorizedList.length === 0) {
      return { authenticated: false };
    }

    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;

    if (!token) {
      return { authenticated: false };
    }

    const validTokens = authorizedList.map((p) =>
      generateTokenForPasscode(p, salt)
    );

    const isValid = validTokens.includes(token);
    return { authenticated: isValid };
  } catch (error) {
    console.error("[checkScreenerAccessAction] Error:", error);
    return { authenticated: false };
  }
}

/**
 * Verifies a submitted passcode. If valid, sets an httpOnly 30-day session cookie.
 * Fails closed if secret salt or authorized passcodes are not configured.
 * @param {string} rawPasscode
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function verifyScreenerAccessAction(rawPasscode) {
  try {
    const salt = getSecretSalt();
    const authorizedList = getAuthorizedPasscodes();

    if (!salt || authorizedList.length === 0) {
      return {
        success: false,
        error: "Screener access is not configured on the server.",
      };
    }

    const passcode = (rawPasscode || "").trim();
    if (!passcode) {
      return { success: false, error: "Please enter an access passcode." };
    }

    const matched = authorizedList.find((p) => p === passcode);

    if (!matched) {
      return {
        success: false,
        error: "Invalid passcode. Please check and try again.",
      };
    }

    const token = generateTokenForPasscode(matched, salt);
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
