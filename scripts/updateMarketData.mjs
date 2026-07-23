// scripts/updateMarketData.mjs
import { writeFile } from "fs/promises";
import path from "path";

const PUBLIC_DIR = path.resolve(process.cwd(), "public");

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
  Accept: "text/csv,*/*",
};

async function fetchCsv(url, outFile, { minBytes = 1000 } = {}) {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`Fetch failed for ${url}: ${res.status}`);
  const text = await res.text();

  // Guard: NSE occasionally serves an HTML error/blocked page with a 200 status.
  if (text.length < minBytes || text.trim().startsWith("<")) {
    throw new Error(
      `Suspicious response for ${url} (len=${text.length}), refusing to overwrite ${outFile}`
    );
  }

  await writeFile(path.join(PUBLIC_DIR, outFile), text, "utf8");
  console.log(`✔ wrote ${outFile} (${text.length} bytes)`);
}

async function main() {
  const jobs = [
    fetchCsv(
      "https://nsearchives.nseindia.com/content/equities/EQUITY_L.csv",
      "nse_equity.csv"
    ),
    fetchCsv(
      "https://nsearchives.nseindia.com/content/equities/eq_etfseclist.csv",
      "eq_etfseclist.csv"
    ),
    fetchCsv(
      "https://nsearchives.nseindia.com/content/fo/fo_mktlots.csv",
      "fo_mktlots.csv"
    ),
  ];

  const results = await Promise.allSettled(jobs);
  results.forEach((r) => {
    if (r.status === "rejected") console.error("✖", r.reason.message);
  });

  if (results.some((r) => r.status === "rejected")) {
    process.exit(1);
  }
}

main();