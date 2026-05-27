const DEFAULT_SITE_URL = "https://rcharts.panarwala.in";
const rawSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || DEFAULT_SITE_URL;

let normalizedSiteUrl = DEFAULT_SITE_URL;

try {
  normalizedSiteUrl = new URL(rawSiteUrl).origin;
} catch {
  normalizedSiteUrl = DEFAULT_SITE_URL;
}

export const SITE_URL = normalizedSiteUrl;
