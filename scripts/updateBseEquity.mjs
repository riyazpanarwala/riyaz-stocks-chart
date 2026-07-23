// scripts/updateBseEquity.mjs
import { chromium } from "playwright-extra";
import stealth from "puppeteer-extra-plugin-stealth";
import { writeFile } from "fs/promises";
import path from "path";

chromium.use(stealth());

const PUBLIC_DIR = path.resolve(process.cwd(), "public");
const URL = "https://www.bseindia.com/corporates/list_scrips";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();

  await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 60000 });

  try {
    await page.waitForSelector("#ddlsegment", { state: "attached", timeout: 45000 });
  } catch (err) {
    await page.screenshot({ path: "bse-debug-failure.png", fullPage: true });
    const html = await page.content();
    await writeFile("bse-debug-failure.html", html, "utf8");
    console.error("✖ #ddlsegment never appeared. Saved bse-debug-failure.png / .html for inspection.");
    throw err;
  }

  await page.locator("#ddlsegment").selectOption({ label: "Equity T+1" });
  await page.locator("#ddlstatus").selectOption({ label: "Active" });

  await page.getByRole("button", { name: /submit/i }).click();
  await page.waitForSelector("text=Security Code", { timeout: 15000 });
  await page.waitForTimeout(1500);

  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 20000 }),
    page.locator('button[aria-label="download file"]').click(),
  ]);

  const stream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  const buffer = Buffer.concat(chunks);

  if (buffer.length < 1000) {
    throw new Error(`Downloaded file looks too small (${buffer.length} bytes) — refusing to overwrite bse_equity.csv`);
  }

  await writeFile(path.join(PUBLIC_DIR, "bse_equity.csv"), buffer);
  console.log(`✔ wrote bse_equity.csv (${buffer.length} bytes)`);

  await browser.close();
}

main().catch((err) => {
  console.error("✖ BSE scrape failed:", err.message);
  process.exit(1);
});