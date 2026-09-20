// scripts/updateBseEquity.mjs
import dns from "node:dns";
import { chromium } from "playwright-extra";
import stealth from "puppeteer-extra-plugin-stealth";
import { writeFile } from "fs/promises";
import path from "path";

// BSE's DNS announces IPv6 addresses that often drop/hang connections from Node.js;
// prefer IPv4 for all network requests.
dns.setDefaultResultOrder("ipv4first");

chromium.use(stealth());

const PUBLIC_DIR = path.resolve(process.cwd(), "public");
const URL = "https://www.bseindia.com/corporates/list_scrips";
const CSV_ENDPOINT =
  "https://api.bseindia.com/BseIndiaAPI/api/LitsOfScripCSVDownload/w?Group=&Scripcode=&segment=Equity&status=Active";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// Based on the on-screen table: Security Code, Issuer Name, Security Id,
// Security Name, Status, Group, Face Value, ISIN No, Market Capitalisation.
// Only checking the first couple of columns keeps this resilient to minor
// header wording/column-order changes on BSE's end.
const EXPECTED_HEADER_PREFIX = "Security Code";

/**
 * Structural check: confirm buffer is actually the securities list CSV,
 * not an HTML error page, a blank export, or a malformed response.
 */
function validateCsvBuffer(buffer) {
  if (buffer.length < 1000) {
    throw new Error(
      `Downloaded file looks too small (${buffer.length} bytes) — refusing to overwrite bse_equity.csv`
    );
  }

  const headerSample = buffer.subarray(0, 200).toString("utf8").trimStart();
  if (headerSample.startsWith("<") || !headerSample.includes(EXPECTED_HEADER_PREFIX)) {
    throw new Error(
      `Unexpected file content — expected header to include "${EXPECTED_HEADER_PREFIX}", got: "${headerSample.slice(0, 80)}..."`
    );
  }
}

/**
 * Fast direct HTTP fetch of BSE active equity scrips.
 * Avoids browser overhead and client-side table rendering bottlenecks.
 */
async function fetchDirectCsv(retries = 3) {
  let lastError;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`Attempting direct CSV fetch (attempt ${attempt}/${retries})...`);
      const res = await fetch(CSV_ENDPOINT, {
        headers: {
          "User-Agent": USER_AGENT,
          Referer: "https://www.bseindia.com/",
          Origin: "https://www.bseindia.com",
          Accept: "text/csv,application/xhtml+xml,application/xml,text/plain,*/*",
        },
        signal: AbortSignal.timeout(30_000),
      });

      if (!res.ok) {
        throw new Error(`Direct fetch failed with HTTP status ${res.status}`);
      }

      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      validateCsvBuffer(buffer);
      console.log(`✔ Direct CSV fetch succeeded (${buffer.length} bytes)`);
      return buffer;
    } catch (err) {
      lastError = err;
      console.warn(`Direct fetch attempt ${attempt} failed:`, err.message);
      if (attempt < retries) {
        const backoffMs = attempt * 1500;
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }
  }

  throw lastError;
}

/**
 * Fallback browser-based scraper using Playwright.
 * Triggers the direct download button without waiting for the heavy
 * client-side table to render thousands of DOM nodes.
 */
async function fetchPlaywrightCsv() {
  console.log("Falling back to Playwright browser automation...");
  const browser = await chromium.launch({ headless: true });
  let page;

  try {
    const context = await browser.newContext({
      userAgent: USER_AGENT,
      viewport: { width: 1280, height: 900 },
      extraHTTPHeaders: {
        Referer: "https://www.bseindia.com/",
        Origin: "https://www.bseindia.com",
      },
    });

    // Try fetching directly via Playwright's network context first
    try {
      console.log("Trying context.request.get in Playwright...");
      const apiRes = await context.request.get(CSV_ENDPOINT, {
        timeout: 30_000,
        headers: {
          Referer: "https://www.bseindia.com/",
          Origin: "https://www.bseindia.com",
        },
      });
      if (apiRes.ok()) {
        const buffer = await apiRes.body();
        validateCsvBuffer(buffer);
        console.log(`✔ Playwright context request succeeded (${buffer.length} bytes)`);
        return buffer;
      }
    } catch (ctxErr) {
      console.warn("Playwright context request attempt failed, proceeding to page navigation:", ctxErr.message);
    }

    page = await context.newPage();
    await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 60000 });

    await page.waitForSelector("#ddlsegment", { state: "attached", timeout: 45000 });
    await page.locator("#ddlsegment").selectOption({ label: "Equity T+1" });
    await page.locator("#ddlstatus").selectOption({ label: "Active" });

    // The download button is present in the DOM; click it to trigger file download.
    // We intentionally do NOT wait for 'text=Security Code' table rendering because
    // rendering ~5,000 DOM rows causes 15s+ timeouts on CI runners while the file
    // export is independently served from the backend.
    const downloadBtn = page.locator('button[aria-label="download file"]');
    await downloadBtn.waitFor({ state: "attached", timeout: 30000 });

    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 30000 }),
      downloadBtn.click(),
    ]);

    const stream = await download.createReadStream();
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    const buffer = Buffer.concat(chunks);

    validateCsvBuffer(buffer);
    console.log(`✔ Playwright download succeeded (${buffer.length} bytes)`);
    return buffer;
  } catch (err) {
    if (page) {
      try {
        await page.screenshot({ path: "bse-debug-failure.png", fullPage: true });
        const html = await page.content();
        await writeFile("bse-debug-failure.html", html, "utf8");
        console.error("Saved bse-debug-failure.png / .html for inspection.");
      } catch (saveErr) {
        console.error("Failed to save debug artifacts:", saveErr.message);
      }
    }
    throw err;
  } finally {
    await browser.close();
  }
}

async function main() {
  let buffer;

  try {
    buffer = await fetchDirectCsv();
  } catch (directErr) {
    console.warn("Direct CSV fetch failed, falling back to Playwright:", directErr.message);
    buffer = await fetchPlaywrightCsv();
  }

  const targetPath = path.join(PUBLIC_DIR, "bse_equity.csv");
  await writeFile(targetPath, buffer);
  console.log(`✔ successfully wrote bse_equity.csv (${buffer.length} bytes)`);
}

main().catch(async (err) => {
  console.error("✖ BSE scrape failed:", err.message);
  process.exit(1);
});