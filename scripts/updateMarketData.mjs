// scripts/updateMarketData.mjs
import { writeFile } from "fs/promises";
import path from "path";

const PUBLIC_DIR = path.resolve(process.cwd(), "public");
const FETCH_TIMEOUT_MS = 30_000;

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
  Accept: "text/csv,*/*",
};

// Expected first line of each CSV — cheap, effective structural check.
const EXPECTED_HEADERS = {
  "nse_equity.csv": "SYMBOL,NAME OF COMPANY",
  "eq_etfseclist.csv": "Symbol,Underlying,SecurityName",
  "fo_mktlots.csv": "UNDERLYING", // first column name; header row has trailing spaces/commas
};

async function fetchCsv(url, outFile, { minBytes = 1000 } = {}) {
  const res = await fetch(url, {
    headers: HEADERS,
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Fetch failed for ${url}: ${res.status}`);
  const text = await res.text();

  if (text.length < minBytes || text.trim().startsWith("<")) {
    throw new Error(
      `Suspicious response for ${url} (len=${text.length}), refusing to use for ${outFile}`
    );
  }

  const expectedHeader = EXPECTED_HEADERS[outFile];
  if (expectedHeader && !text.trimStart().startsWith(expectedHeader)) {
    throw new Error(
      `Unexpected CSV header for ${outFile} — got "${text.slice(0, 60)}..." expected to start with "${expectedHeader}"`
    );
  }

  return { outFile, text };
}

async function main() {
  const jobs = [
    fetchCsv("https://nsearchives.nseindia.com/content/equities/EQUITY_L.csv", "nse_equity.csv"),
    fetchCsv("https://nsearchives.nseindia.com/content/equities/eq_etfseclist.csv", "eq_etfseclist.csv"),
    fetchCsv("https://nsearchives.nseindia.com/content/fo/fo_mktlots.csv", "fo_mktlots.csv"),
  ];

  // Fetch + validate everything first — nothing touches disk until the
  // whole batch succeeds, so a single failure never leaves a stale/fresh mix.
  const results = await Promise.allSettled(jobs);
  const failures = results.filter((r) => r.status === "rejected");

  if (failures.length) {
    failures.forEach((r) => console.error("✖", r.reason.message));
    console.error(`${failures.length}/${jobs.length} downloads failed — no files written.`);
    process.exit(1);
  }

  const successes = results.map((r) => r.value);
  await Promise.all(
    successes.map(({ outFile, text }) =>
      writeFile(path.join(PUBLIC_DIR, outFile), text, "utf8").then(() =>
        console.log(`✔ wrote ${outFile} (${text.length} bytes)`)
      )
    )
  );
}

main();