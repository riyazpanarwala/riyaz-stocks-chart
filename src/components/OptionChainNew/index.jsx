import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
  Legend,
} from "recharts";
import { getNSEData } from "../getIntervalData";
import FO_LIST from "./FOlist";

const INDEX_DATA = {
  timestamp: "",
  underlyingValue: 0,
  displayData: [],
  fullOI: [],
};

const STOCK_DATA = {
  timestamp: "",
  underlying: "",
  underlyingValue: 0,
  expiries: [],
  data: [],
};

// ═══════════════════════════════════════════════════════════════
// DESIGN TOKENS
// ═══════════════════════════════════════════════════════════════
const C = {
  bg: "#0d1117",
  surface: "#161b22",
  border: "#21262d",
  surface2: "#1c2128",
  green: "#3fb950",
  red: "#f85149",
  blue: "#58a6ff",
  yellow: "#e3b341",
  purple: "#c084fc",
  muted: "#8b949e",
  text: "#e6edf3",
  greenBg: "#0d2a16",
  redBg: "#2a0d0d",
};

// ═══════════════════════════════════════════════════════════════
// PARSERS
// ═══════════════════════════════════════════════════════════════
// Index parser reads displayData (ATM±15 strikes) — for charts, table, OI change
// PCR + MaxPain use fullOI (all 133 strikes) via calcPCRFull / calcMaxPainFull
// Guards against null or wrong-shape data (e.g. stale stock data during symbol switch)
function parseIndexChain(records) {
  if (!records || (!records.displayData && !records.data)) return [];
  // Reject stock-shaped data — stock data has .data array of flat rows with optionType field
  if (
    records.data &&
    Array.isArray(records.data) &&
    records.data[0]?.optionType !== undefined
  )
    return [];
  const src = records.displayData || records.data || [];
  return src
    .filter((r) => r.CE || r.PE)
    .map((r) => ({
      strikePrice: r.strikePrice,
      CE: {
        openInterest: r.CE?.openInterest || 0,
        changeinOpenInterest: r.CE?.changeinOpenInterest || 0,
        totalTradedVolume: r.CE?.totalTradedVolume || 0,
        lastPrice: r.CE?.lastPrice || 0,
        change: r.CE?.change || 0,
      },
      PE: {
        openInterest: r.PE?.openInterest || 0,
        changeinOpenInterest: r.PE?.changeinOpenInterest || 0,
        totalTradedVolume: r.PE?.totalTradedVolume || 0,
        lastPrice: r.PE?.lastPrice || 0,
        change: r.PE?.change || 0,
      },
    }))
    .sort((a, b) => a.strikePrice - b.strikePrice);
}

// PCR MUST use every strike in the chain, not just the display window.
// Far-OTM calls have huge OI (e.g. 25000 CE = 105K) with near-zero PE counterpart.
// Including only ATM±15 inflates CE OI and crashes PCR — giving 0.63 instead of 1.06.
// fullOI format: [{s: strike, c: CE_OI, p: PE_OI}]
function calcPCRFull(fullOI) {
  if (!fullOI?.length) return 0;
  const ce = fullOI.reduce((s, r) => s + r.c, 0);
  const pe = fullOI.reduce((s, r) => s + r.p, 0);
  return ce === 0 ? 0 : pe / ce;
}

// MaxPain also needs the full chain — partial chains shift the pain point significantly
function calcMaxPainFull(fullOI) {
  if (!fullOI?.length) return 0;
  let min = Infinity,
    mp = fullOI[0].s;
  for (const t of fullOI) {
    let loss = 0;
    for (const r of fullOI) {
      if (t.s > r.s) loss += (t.s - r.s) * r.c;
      if (t.s < r.s) loss += (r.s - t.s) * r.p;
    }
    if (loss < min) {
      min = loss;
      mp = t.s;
    }
  }
  return mp;
}

function parseStockChain(data, expiry) {
  // Guard: null data, or index-shaped data (has displayData/fullOI instead of flat .data rows)
  if (
    !data?.data ||
    !Array.isArray(data.data) ||
    data.data[0]?.optionType === undefined
  ) {
    return { rows: [], expiries: [], selectedExpiry: null };
  }
  const expiries = [
    ...new Set(
      data.data.filter((r) => r.optionType !== "XX").map((r) => r.expiryDate),
    ),
  ].sort((a, b) => new Date(a) - new Date(b));
  const sel = expiry || expiries[0];
  const filtered = data.data.filter(
    (r) => r.expiryDate === sel && r.optionType !== "XX",
  );
  const ceMap = {},
    peMap = {};
  for (const r of filtered) {
    const sp =
      typeof r.strikePrice === "string"
        ? parseFloat(r.strikePrice)
        : r.strikePrice;
    if (isNaN(sp) || sp === 0) continue;
    const leg = {
      openInterest: r.openInterest || 0,
      changeinOpenInterest: r.changeinOpenInterest || 0,
      totalTradedVolume: r.totalTradedVolume || 0,
      lastPrice: r.lastPrice || 0,
      change: r.change || 0,
    };
    if (r.optionType === "CE") ceMap[sp] = leg;
    else if (r.optionType === "PE") peMap[sp] = leg;
  }
  const empty = {
    openInterest: 0,
    changeinOpenInterest: 0,
    totalTradedVolume: 0,
    lastPrice: 0,
    change: 0,
  };
  const strikes = [...new Set([...Object.keys(ceMap), ...Object.keys(peMap)])]
    .map(Number)
    .sort((a, b) => a - b);
  return {
    rows: strikes.map((sp) => ({
      strikePrice: sp,
      CE: ceMap[sp] || empty,
      PE: peMap[sp] || empty,
    })),
    expiries,
    selectedExpiry: sel,
  };
}

// ═══════════════════════════════════════════════════════════════
// ANALYSIS ENGINE
// ═══════════════════════════════════════════════════════════════

// ATM: strike nearest to underlying spot price
const findATM = (rows, uv) =>
  rows.length
    ? rows.reduce((b, r) =>
      Math.abs(r.strikePrice - uv) < Math.abs(b.strikePrice - uv) ? r : b,
    ).strikePrice
    : 0;

// PCR: total Put OI / total Call OI across ALL strikes
// > 1.2 → Bullish (heavy put writing = market expects support)
// < 0.8 → Bearish (heavy call writing = market expects resistance)
const calcPCR = (rows) => {
  const ce = rows.reduce((s, r) => s + r.CE.openInterest, 0);
  const pe = rows.reduce((s, r) => s + r.PE.openInterest, 0);
  return ce === 0 ? 0 : pe / ce;
};

// Max Pain: strike where aggregate option writer loss is minimised
function calcMaxPain(rows) {
  let min = Infinity,
    mp = rows[0]?.strikePrice || 0;
  for (const t of rows) {
    let loss = 0;
    for (const r of rows) {
      if (t.strikePrice > r.strikePrice)
        loss += (t.strikePrice - r.strikePrice) * r.CE.openInterest;
      if (t.strikePrice < r.strikePrice)
        loss += (r.strikePrice - t.strikePrice) * r.PE.openInterest;
    }
    if (loss < min) {
      min = loss;
      mp = t.strikePrice;
    }
  }
  return mp;
}

// ── FIX: direction-aware support / resistance ─────────────────
// Resistance = top N CE OI at strikes ABOVE spot  (call writers capping upside)
// Support    = top N PE OI at strikes BELOW spot  (put writers cushioning downside)
// Without the direction filter, a deep ITM put strike with massive OI would
// incorrectly show as "support" even though it's well above the current price.
function topResistance(rows, spot, n = 3) {
  return [...rows]
    .filter((r) => r.strikePrice > spot) // only strikes above spot
    .sort((a, b) => b.CE.openInterest - a.CE.openInterest)
    .slice(0, n)
    .map((r) => r.strikePrice);
}
function topSupport(rows, spot, n = 3) {
  return [...rows]
    .filter((r) => r.strikePrice < spot) // only strikes below spot
    .sort((a, b) => b.PE.openInterest - a.PE.openInterest)
    .slice(0, n)
    .map((r) => r.strikePrice);
}

// ── Signal generation ─────────────────────────────────────────
function generateSignal(rows, atm, pcr, spot) {
  const atmRow = rows.find((r) => r.strikePrice === atm) || rows[0];

  // Resistance / Support with direction filter
  const resistance = topResistance(rows, spot); // CE OI above spot
  const support = topSupport(rows, spot); // PE OI below spot

  // 1. OI Zone score (30 pts)
  // Has a solid support wall below ATM?  Has a solid resistance ceiling above?
  const nearestSup = support[0]; // highest-OI support strike below spot
  const nearestRes = resistance[0]; // lowest-OI resistance strike above spot (sorted by OI not price, so pick closest)
  const closestRes = resistance.length ? Math.min(...resistance) : Infinity;
  const closestSup = support.length ? Math.max(...support) : 0;

  // How far is spot from its nearest support/resistance?
  const distToRes = closestRes - spot; // positive = resistance above
  const distToSup = spot - closestSup; // positive = support below

  // Bullish if sitting close to support, bearish if pinned near resistance
  const zoneScore = 30; // always full weight — both zones exist
  const zoneBias = distToSup < distToRes ? 1 : -1; // closer to support → bullish

  // 2. PCR score (20 pts)
  const pcrBias = pcr > 1.2 ? 1 : pcr < 0.8 ? -1 : 0;
  const pcrScore = 20; // always contributes; direction via pcrBias

  // 3. OI Change at ATM (25 pts) — detects fresh money direction
  const ceΔ = atmRow?.CE.changeinOpenInterest || 0;
  const peΔ = atmRow?.PE.changeinOpenInterest || 0;
  // Bullish: put OI building + call OI unwinding
  // Bearish: call OI building + put OI unwinding
  const oiChangeBias = peΔ > 0 && ceΔ < 0 ? 1 : ceΔ > 0 && peΔ < 0 ? -1 : 0;
  const oiChangeScore = oiChangeBias !== 0 ? 25 : 10;

  // 4. Volume at ATM (15 pts)
  const ceVol = atmRow?.CE.totalTradedVolume || 0;
  const peVol = atmRow?.PE.totalTradedVolume || 0;
  const volBias = peVol > ceVol * 1.3 ? 1 : ceVol > peVol * 1.3 ? -1 : 0;
  const volScore = volBias !== 0 ? 15 : 7;

  // 5. Distance from ATM (10 pts) — tighter = more reliable signal
  const strikePitch =
    rows.length > 1
      ? (rows[rows.length - 1].strikePrice - rows[0].strikePrice) / rows.length
      : 50;
  const distFromATM = Math.abs(spot - atm);
  const distScore =
    distFromATM <= strikePitch ? 10 : distFromATM <= strikePitch * 2 ? 7 : 4;

  const strength = Math.min(
    100,
    zoneScore + pcrScore + oiChangeScore + volScore + distScore,
  );

  // Combined directional bias (all factors vote ±1)
  const totalBias = pcrBias + oiChangeBias + volBias + zoneBias;

  let signal = "NO TRADE";
  if (strength > 50) {
    if (totalBias >= 2) signal = "BUY CALL";
    else if (totalBias <= -2) signal = "BUY PUT";
  }

  return {
    signal,
    strength: Math.round(strength),
    strengthLabel:
      strength > 70 ? "Strong" : strength > 50 ? "Moderate" : "Weak",
    pcr: pcr.toFixed(2),
    pcrBias: pcr > 1.2 ? "Bullish" : pcr < 0.8 ? "Bearish" : "Neutral",
    oiChangeBias:
      oiChangeBias === 1
        ? "Bullish"
        : oiChangeBias === -1
          ? "Bearish"
          : "Neutral",
    topSupport: support, // PE OI below spot  → price floor
    topResistance: resistance, // CE OI above spot  → price ceiling
    distToRes: Math.round(distToRes),
    distToSup: Math.round(distToSup),
  };
}

// OI Build-up type per strike (CE side shown in table)
// Uses price change + OI change to classify smart money intent
const buildupType = (r) => {
  const priceChg = r.CE.change;
  const oiChg = r.CE.changeinOpenInterest;
  if (priceChg >= 0 && oiChg >= 0) return "Long Build-up"; // price ↑ OI ↑
  if (priceChg < 0 && oiChg >= 0) return "Short Build-up"; // price ↓ OI ↑
  if (priceChg >= 0 && oiChg < 0) return "Short Covering"; // price ↑ OI ↓
  return "Long Unwinding"; // price ↓ OI ↓
};

// ═══════════════════════════════════════════════════════════════
// INSTITUTIONAL (SMART MONEY) ANALYSIS ENGINE
// ═══════════════════════════════════════════════════════════════

// pcr must be passed in from the top-level App (calcPCRFull on full chain for indices,
// calcPCR on complete per-expiry rows for stocks). Never recompute from displayRows —
// the display window excludes far-OTM strikes which carry the bulk of CE OI, causing
// PCR to read ~0.75 instead of the correct 1.20 (same bug documented in calcPCRFull).
function calcInstitutional(rows, spot, atm, pcr) {
  if (!rows.length) return null;

  const atmIdx = rows.findIndex((r) => r.strikePrice === atm);
  const nearATM = rows.filter((_, i) => Math.abs(i - atmIdx) <= 2);

  const totalCeOI = rows.reduce((s, r) => s + r.CE.openInterest, 0);
  const totalPeOI = rows.reduce((s, r) => s + r.PE.openInterest, 0);

  // ── STEP 1: OI spike detection ──────────────────────────────
  const avgCeDOI =
    rows.reduce((s, r) => s + Math.abs(r.CE.changeinOpenInterest), 0) /
    rows.length;
  const avgPeDOI =
    rows.reduce((s, r) => s + Math.abs(r.PE.changeinOpenInterest), 0) /
    rows.length;

  const spikes = [];
  rows.forEach((r, idx) => {
    const ceDOI = r.CE.changeinOpenInterest;
    const peDOI = r.PE.changeinOpenInterest;
    const nearness = Math.abs(idx - atmIdx) <= 3 ? "ATM±3" : "OTM";

    if (ceDOI > avgCeDOI * 2 && ceDOI > 0) {
      const withVol = r.CE.totalTradedVolume > r.CE.openInterest * 0.04;
      spikes.push({
        strike: r.strikePrice,
        side: "CE",
        doi: ceDOI,
        vol: r.CE.totalTradedVolume,
        ltp: r.CE.lastPrice,
        chg: r.CE.change,
        type:
          r.CE.change <= 0
            ? "Aggressive Call Writing"
            : "Call Long Build-up",
        highConv: withVol,
        nearness,
      });
    }
    if (peDOI > avgPeDOI * 2 && peDOI > 0) {
      const withVol = r.PE.totalTradedVolume > r.PE.openInterest * 0.04;
      spikes.push({
        strike: r.strikePrice,
        side: "PE",
        doi: peDOI,
        vol: r.PE.totalTradedVolume,
        ltp: r.PE.lastPrice,
        chg: r.PE.change,
        type:
          r.PE.change >= 0
            ? "Aggressive Put Writing"
            : "Put Short Build-up",
        highConv: withVol,
        nearness,
      });
    }
  });
  const topSpikes = [...spikes].sort((a, b) => b.doi - a.doi).slice(0, 3);

  // Cluster detection: consecutive spikes = writing wall
  const spikeStrikes = new Set(spikes.map((s) => s.strike));
  const sortedSpikeStrikes = [...spikeStrikes].sort((a, b) => a - b);
  const clusters = [];
  let cur = [];
  for (const s of sortedSpikeStrikes) {
    if (!cur.length || s - cur[cur.length - 1] <= 100) {
      cur.push(s);
    } else {
      if (cur.length >= 2) clusters.push([...cur]);
      cur = [s];
    }
  }
  if (cur.length >= 2) clusters.push(cur);

  // ── STEP 2: Footprint — rolling / walls / traps ──────────────
  const rolls = [];
  for (let i = 1; i < rows.length; i++) {
    const prev = rows[i - 1],
      cur = rows[i];
    if (prev.CE.changeinOpenInterest < -avgCeDOI && cur.CE.changeinOpenInterest > avgCeDOI)
      rolls.push({ from: prev.strikePrice, to: cur.strikePrice, side: "CE" });
    if (prev.PE.changeinOpenInterest < -avgPeDOI && cur.PE.changeinOpenInterest > avgPeDOI)
      rolls.push({ from: prev.strikePrice, to: cur.strikePrice, side: "PE" });
  }

  const traps = [];
  rows.forEach((r) => {
    // Call writers trapped: CE OI rising but price also rising
    if (r.CE.changeinOpenInterest > avgCeDOI && r.CE.change > 0)
      traps.push({
        strike: r.strikePrice,
        side: "CE",
        msg: `CE OI building at ${r.strikePrice} but price rising — call writers exposed`,
      });
    // Put writers trapped: PE OI rising but price also falling
    if (r.PE.changeinOpenInterest > avgPeDOI && r.PE.change < 0)
      traps.push({
        strike: r.strikePrice,
        side: "PE",
        msg: `PE OI building at ${r.strikePrice} but price falling — put writers exposed`,
      });
  });

  // ── STEP 3: Volume confirmation ──────────────────────────────
  const highConvZones = spikes
    .filter((s) => s.highConv)
    .map((s) => s.strike);
  const lowConvNoise = spikes
    .filter((s) => !s.highConv)
    .map((s) => s.strike);

  // ── STEP 4: ATM shift ────────────────────────────────────────
  const nearCeDOI = nearATM.reduce(
    (s, r) => s + r.CE.changeinOpenInterest,
    0
  );
  const nearPeDOI = nearATM.reduce(
    (s, r) => s + r.PE.changeinOpenInterest,
    0
  );
  const atmShift =
    nearPeDOI > nearCeDOI * 1.3
      ? "PE Dominant"
      : nearCeDOI > nearPeDOI * 1.3
        ? "CE Dominant"
        : "Balanced";

  // ── STEP 5: Institutional signals ───────────────────────────
  const signals = [];
  const aboveSpot = rows.filter((r) => r.strikePrice > spot);
  const belowSpot = rows.filter((r) => r.strikePrice < spot);
  const topRes3 = [...aboveSpot]
    .sort((a, b) => b.CE.openInterest - a.CE.openInterest)
    .slice(0, 3);
  const topSup3 = [...belowSpot]
    .sort((a, b) => b.PE.openInterest - a.PE.openInterest)
    .slice(0, 3);

  spikes.forEach((s) => {
    if (s.type === "Aggressive Call Writing" && s.highConv)
      signals.push({
        icon: "🔴",
        label: "Strong Call Writing Zone (Institutional Resistance)",
        strike: s.strike,
        conf: "HIGH",
      });
    if (s.type === "Aggressive Put Writing" && s.highConv)
      signals.push({
        icon: "🟢",
        label: "Strong Put Writing Zone (Institutional Support)",
        strike: s.strike,
        conf: "HIGH",
      });
    if (s.type === "Aggressive Call Writing" && !s.highConv)
      signals.push({
        icon: "🟡",
        label: "Fake Move – Low Conviction (CE write, no vol)",
        strike: s.strike,
        conf: "LOW",
      });
    if (s.type === "Aggressive Put Writing" && !s.highConv)
      signals.push({
        icon: "🟡",
        label: "Fake Move – Low Conviction (PE write, no vol)",
        strike: s.strike,
        conf: "LOW",
      });
  });
  rows.forEach((r) => {
    if (r.CE.changeinOpenInterest < -avgCeDOI && r.CE.change > 0)
      signals.push({
        icon: "⚡",
        label: "Short Covering Rally Possible",
        strike: r.strikePrice,
        conf: "MED",
      });
    if (r.PE.changeinOpenInterest < -avgPeDOI && r.PE.change < 0)
      signals.push({
        icon: "📉",
        label: "Long Unwinding Detected",
        strike: r.strikePrice,
        conf: "MED",
      });
  });
  traps.forEach((t) =>
    signals.push({
      icon: "⚠️",
      label: `Trap Zone – Avoid Trade at ${t.strike}`,
      strike: t.strike,
      conf: "TRAP",
    })
  );
  // Breakout check: spot near or above top resistance with vol
  const nearRes = topRes3[0];
  if (
    nearRes &&
    spot >= nearRes.strikePrice - 50 &&
    nearRes.CE.totalTradedVolume > nearRes.CE.openInterest * 0.05
  )
    signals.push({
      icon: "🚀",
      label: "Breakout Supported by Institutions",
      strike: nearRes.strikePrice,
      conf: "HIGH",
    });

  // ── STEP 6: OI concentration ─────────────────────────────────
  const top3Ce = [...rows]
    .sort((a, b) => b.CE.openInterest - a.CE.openInterest)
    .slice(0, 3);
  const top3Pe = [...rows]
    .sort((a, b) => b.PE.openInterest - a.PE.openInterest)
    .slice(0, 3);
  const concCe =
    totalCeOI > 0
      ? (top3Ce.reduce((s, r) => s + r.CE.openInterest, 0) / totalCeOI) * 100
      : 0;
  const concPe =
    totalPeOI > 0
      ? (top3Pe.reduce((s, r) => s + r.PE.openInterest, 0) / totalPeOI) * 100
      : 0;

  // ── Smart money bias score ────────────────────────────────────
  // pcr is the full-chain value passed in from App — do NOT recompute from rows
  const pcrBias = pcr > 1.2 ? 1 : pcr < 0.8 ? -1 : 0;
  const oiBias = nearPeDOI > nearCeDOI ? 1 : nearCeDOI > nearPeDOI ? -1 : 0;
  const closestRes = topRes3.length ? Math.min(...topRes3.map((r) => r.strikePrice)) : Infinity;
  const closestSup = topSup3.length ? Math.max(...topSup3.map((r) => r.strikePrice)) : 0;
  const zoneBias = spot - closestSup < closestRes - spot ? 1 : -1;
  const totalBias = pcrBias + oiBias + zoneBias;
  const smartBias =
    totalBias >= 2 ? "BULLISH" : totalBias <= -2 ? "BEARISH" : "NEUTRAL";

  return {
    topSpikes,
    clusters,
    rolls,
    traps,
    highConvZones,
    lowConvNoise,
    atmShift,
    signals: signals.slice(0, 10),
    top3Ce,
    top3Pe,
    concCe,
    concPe,
    totalCeOI,
    totalPeOI,
    smartBias,
    topRes: topRes3,
    topSup: topSup3,
    pcr,
  };
}

// ── Institutional Panel Component ─────────────────────────────
const IBadge = ({ conf }) => {
  const map = {
    HIGH: { bg: C.greenBg, color: C.green, border: `${C.green}40` },
    MED: { bg: "#1c1400", color: C.yellow, border: `${C.yellow}40` },
    LOW: { bg: C.surface2, color: C.muted, border: `${C.border}` },
    TRAP: { bg: "#2a1500", color: "#ff7b00", border: "#ff7b0040" },
  };
  const s = map[conf] || map.LOW;
  return (
    <span
      style={{
        display: "inline-block",
        padding: "1px 7px",
        borderRadius: 4,
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: 0.5,
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.border}`,
        flexShrink: 0,
      }}
    >
      {conf}
    </span>
  );
};

function InstitutionalPanel({ rows, spot, atm, maxPain, pcr }) {
  const inst = calcInstitutional(rows, spot, atm, pcr);
  if (!inst) return null;

  const {
    topSpikes,
    clusters,
    rolls,
    traps,
    highConvZones,
    lowConvNoise,
    atmShift,
    signals,
    top3Ce,
    top3Pe,
    concCe,
    concPe,
    totalCeOI,
    totalPeOI,
    smartBias,
    topRes,
    topSup,
  } = inst;

  const biasColor =
    smartBias === "BULLISH" ? C.green : smartBias === "BEARISH" ? C.red : C.yellow;
  const biasBg =
    smartBias === "BULLISH" ? C.greenBg : smartBias === "BEARISH" ? C.redBg : C.surface2;
  const biasIcon = smartBias === "BULLISH" ? "▲" : smartBias === "BEARISH" ? "▼" : "—";

  const card = (children, extra = {}) => (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 10,
        padding: "12px 14px",
        marginBottom: 10,
        ...extra,
      }}
    >
      {children}
    </div>
  );

  const cardTitle = (txt, icon) => (
    <div
      style={{
        fontSize: 10,
        color: C.muted,
        letterSpacing: 1,
        marginBottom: 10,
        textTransform: "uppercase",
      }}
    >
      {icon} {txt}
    </div>
  );

  const fmt = (n) => {
    if (!n && n !== 0) return "—";
    const abs = Math.abs(n);
    if (abs >= 100000) return `${(n / 100000).toFixed(1)}L`;
    if (abs >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toString();
  };

  const maxCeOI = Math.max(...top3Ce.map((r) => r.CE.openInterest), 1);
  const maxPeOI = Math.max(...top3Pe.map((r) => r.PE.openInterest), 1);

  return (
    <div>
      {/* ── Smart Money Bias Header ── */}
      {card(
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <div
            style={{
              background: biasBg,
              border: `1px solid ${biasColor}44`,
              borderRadius: 8,
              padding: "8px 16px",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 20, fontWeight: 800, color: biasColor }}>
              {biasIcon} {smartBias}
            </span>
            <span style={{ fontSize: 10, color: C.muted }}>SMART MONEY BIAS</span>
          </div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {[
              {
                l: "PCR",
                v: pcr.toFixed(2),
                c: pcr > 1.2 ? C.green : pcr < 0.8 ? C.red : C.yellow,
                sub: pcr > 1.2 ? "Bullish" : pcr < 0.8 ? "Bearish" : "Neutral",
              },
              { l: "ATM Shift", v: atmShift, c: atmShift === "PE Dominant" ? C.green : atmShift === "CE Dominant" ? C.red : C.muted },
              { l: "MaxPain", v: maxPain, c: C.yellow },
              { l: "Spikes", v: topSpikes.length, c: C.blue },
              { l: "Traps", v: traps.length, c: traps.length > 0 ? "#ff7b00" : C.muted },
            ].map(({ l, v, c, sub }) => (
              <div key={l} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 9, color: C.muted }}>{l}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: c }}>{v}</div>
                {sub && <div style={{ fontSize: 9, color: c }}>{sub}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Support / Resistance Zones ── */}
      <div style={{ display: "flex", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
        <div
          style={{
            flex: 1,
            minWidth: 160,
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            padding: "12px 14px",
          }}
        >
          <div style={{ fontSize: 10, color: C.green, letterSpacing: 1, marginBottom: 8 }}>
            ▲ SUPPORT — TOP PE OI BELOW SPOT
          </div>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {topSup.length ? (
              topSup.map((r, i) => (
                <span
                  key={r.strikePrice}
                  style={{
                    background: i === 0 ? C.greenBg : "#111",
                    border: `1px solid ${C.green}40`,
                    color: C.green,
                    padding: "2px 9px",
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: 700,
                    opacity: 1 - i * 0.2,
                  }}
                >
                  {r.strikePrice}
                </span>
              ))
            ) : (
              <span style={{ color: C.muted, fontSize: 10 }}>None below spot</span>
            )}
          </div>
          {topSup.length > 0 && (
            <div style={{ fontSize: 10, color: `${C.green}88`, marginTop: 6 }}>
              Wall OI:{" "}
              {fmt(topSup.reduce((s, r) => s + r.PE.openInterest, 0))} ·{" "}
              {((topSup.reduce((s, r) => s + r.PE.openInterest, 0) / (totalPeOI || 1)) * 100).toFixed(1)}% of total PE
            </div>
          )}
        </div>
        <div
          style={{
            flex: 1,
            minWidth: 160,
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            padding: "12px 14px",
          }}
        >
          <div style={{ fontSize: 10, color: C.red, letterSpacing: 1, marginBottom: 8 }}>
            ▼ RESISTANCE — TOP CE OI ABOVE SPOT
          </div>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {topRes.length ? (
              topRes.map((r, i) => (
                <span
                  key={r.strikePrice}
                  style={{
                    background: i === 0 ? C.redBg : "#111",
                    border: `1px solid ${C.red}40`,
                    color: C.red,
                    padding: "2px 9px",
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: 700,
                    opacity: 1 - i * 0.2,
                  }}
                >
                  {r.strikePrice}
                </span>
              ))
            ) : (
              <span style={{ color: C.muted, fontSize: 10 }}>None above spot</span>
            )}
          </div>
          {topRes.length > 0 && (
            <div style={{ fontSize: 10, color: `${C.red}88`, marginTop: 6 }}>
              Wall OI:{" "}
              {fmt(topRes.reduce((s, r) => s + r.CE.openInterest, 0))} ·{" "}
              {((topRes.reduce((s, r) => s + r.CE.openInterest, 0) / (totalCeOI || 1)) * 100).toFixed(1)}% of total CE
            </div>
          )}
        </div>
      </div>

      {/* ── Top Institutional Spikes ── */}
      {card(
        <>
          {cardTitle("Top Institutional Spikes (ΔOI)", "🔥")}
          {topSpikes.length === 0 ? (
            <div style={{ fontSize: 11, color: C.muted }}>No significant spikes detected in current data.</div>
          ) : (
            topSpikes.map((s, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  padding: "8px 0",
                  borderBottom: i < topSpikes.length - 1 ? `1px solid ${C.border}` : "none",
                }}
              >
                <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>
                  {s.side === "CE" ? "🔴" : "🟢"}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: C.text }}>{s.type}</div>
                  <div style={{ fontSize: 10, color: C.blue, marginTop: 2 }}>
                    Strike {s.strike} · {s.side} · ΔOI {fmt(s.doi)} · Vol {fmt(s.vol)} · LTP {s.ltp}
                    {s.chg !== undefined && (
                      <span style={{ color: s.chg >= 0 ? C.green : C.red }}>
                        {" "}({s.chg > 0 ? "+" : ""}{typeof s.chg === "number" ? s.chg.toFixed(1) : s.chg}%)
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      marginTop: 3,
                      color: s.highConv ? C.green : C.muted,
                    }}
                  >
                    {s.highConv
                      ? "▰ HIGH CONVICTION — Volume confirms institutional entry"
                      : "▱ LOW CONVICTION — Volume absent, possibly passive"}
                  </div>
                  <div style={{ fontSize: 9, color: C.muted, marginTop: 1 }}>
                    {s.nearness} ·{" "}
                    {clusters.some((c) => c.includes(s.strike))
                      ? "Part of a writing cluster"
                      : "Isolated spike"}
                  </div>
                </div>
                <IBadge conf={s.highConv ? "HIGH" : "LOW"} />
              </div>
            ))
          )}
        </>
      )}

      {/* ── Institutional Signals ── */}
      {signals.length > 0 &&
        card(
          <>
            {cardTitle("Institutional Signals", "⚡")}
            {signals.map((s, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "7px 0",
                  borderBottom: i < signals.length - 1 ? `1px solid ${C.border}` : "none",
                }}
              >
                <span style={{ fontSize: 13, flexShrink: 0 }}>{s.icon}</span>
                <div style={{ flex: 1, fontSize: 12, color: C.text }}>{s.label}</div>
                <span
                  style={{
                    fontSize: 10,
                    color: C.muted,
                    flexShrink: 0,
                    marginRight: 6,
                  }}
                >
                  {s.strike}
                </span>
                <IBadge conf={s.conf} />
              </div>
            ))}
          </>
        )}

      {/* ── Trap Signals ── */}
      {traps.length > 0 &&
        card(
          <>
            {cardTitle("Trap Signals", "⚠️")}
            {traps.map((t, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  padding: "7px 0",
                  borderBottom: i < traps.length - 1 ? `1px solid ${C.border}` : "none",
                }}
              >
                <span
                  style={{
                    fontSize: 13,
                    flexShrink: 0,
                    color: "#ff7b00",
                    animation: "none",
                  }}
                >
                  ⚠️
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: "#ff7b00" }}>{t.msg}</div>
                  <div style={{ fontSize: 10, color: `#ff7b0088`, marginTop: 2 }}>
                    Trap Zone — avoid directional trade at this strike
                  </div>
                </div>
                <IBadge conf="TRAP" />
              </div>
            ))}
          </>,
          { border: `1px solid #ff7b0033` }
        )}

      {/* ── Position Rolls ── */}
      {rolls.length > 0 &&
        card(
          <>
            {cardTitle("Position Rolls Detected (Shift in Positions)", "🔄")}
            {rolls.map((r, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "6px 0",
                  borderBottom: i < rolls.length - 1 ? `1px solid ${C.border}` : "none",
                }}
              >
                <span style={{ fontSize: 12, color: C.purple }}>↔</span>
                <div style={{ flex: 1, fontSize: 12, color: C.text }}>
                  {r.side} position rolled from{" "}
                  <b style={{ color: C.red }}>{r.from}</b> →{" "}
                  <b style={{ color: C.green }}>{r.to}</b>
                </div>
                <span
                  style={{
                    fontSize: 9,
                    padding: "1px 7px",
                    borderRadius: 4,
                    background: "#1a0a1a",
                    color: C.purple,
                    border: `1px solid ${C.purple}40`,
                  }}
                >
                  ROLL
                </span>
              </div>
            ))}
          </>
        )}

      {/* ── Volume Conviction Zones ── */}
      {card(
        <>
          {cardTitle("Volume Confirmation Zones", "📊")}
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 140 }}>
              <div style={{ fontSize: 9, color: C.green, marginBottom: 5 }}>
                ▰ HIGH CONVICTION ZONES (OI + Volume confirmed)
              </div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {highConvZones.length ? (
                  highConvZones.map((s) => (
                    <span
                      key={s}
                      style={{
                        background: C.greenBg,
                        border: `1px solid ${C.green}40`,
                        color: C.green,
                        padding: "2px 7px",
                        borderRadius: 4,
                        fontSize: 10,
                        fontWeight: 700,
                      }}
                    >
                      {s}
                    </span>
                  ))
                ) : (
                  <span style={{ fontSize: 10, color: C.muted }}>None detected</span>
                )}
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 140 }}>
              <div style={{ fontSize: 9, color: C.muted, marginBottom: 5 }}>
                ▱ LOW CONVICTION NOISE (OI spike, volume absent)
              </div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {lowConvNoise.length ? (
                  lowConvNoise.map((s) => (
                    <span
                      key={s}
                      style={{
                        background: C.surface2,
                        border: `1px solid ${C.border}`,
                        color: C.muted,
                        padding: "2px 7px",
                        borderRadius: 4,
                        fontSize: 10,
                      }}
                    >
                      {s}
                    </span>
                  ))
                ) : (
                  <span style={{ fontSize: 10, color: C.muted }}>None</span>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── OI Concentration ── */}
      {card(
        <>
          {cardTitle("OI Concentration — Smart Money Distribution", "📈")}
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 140 }}>
              <div style={{ fontSize: 10, color: C.red, marginBottom: 6 }}>
                CE — Top 3 hold {concCe.toFixed(1)}% of total OI
              </div>
              {top3Ce.map((r, i) => (
                <div key={r.strikePrice} style={{ marginBottom: 6 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 10,
                      marginBottom: 2,
                    }}
                  >
                    <span style={{ color: C.text }}>{r.strikePrice}</span>
                    <span style={{ color: C.red }}>{fmt(r.CE.openInterest)}</span>
                  </div>
                  <div
                    style={{
                      height: 4,
                      background: C.border,
                      borderRadius: 2,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${(r.CE.openInterest / maxCeOI) * 100}%`,
                        height: "100%",
                        background: i === 0 ? C.red : `${C.red}66`,
                        borderRadius: 2,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div style={{ flex: 1, minWidth: 140 }}>
              <div style={{ fontSize: 10, color: C.green, marginBottom: 6 }}>
                PE — Top 3 hold {concPe.toFixed(1)}% of total OI
              </div>
              {top3Pe.map((r, i) => (
                <div key={r.strikePrice} style={{ marginBottom: 6 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 10,
                      marginBottom: 2,
                    }}
                  >
                    <span style={{ color: C.text }}>{r.strikePrice}</span>
                    <span style={{ color: C.green }}>{fmt(r.PE.openInterest)}</span>
                  </div>
                  <div
                    style={{
                      height: 4,
                      background: C.border,
                      borderRadius: 2,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${(r.PE.openInterest / maxPeOI) * 100}%`,
                        height: "100%",
                        background: i === 0 ? C.green : `${C.green}66`,
                        borderRadius: 2,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Institution building or exiting? */}
          <div
            style={{
              marginTop: 10,
              paddingTop: 10,
              borderTop: `1px solid ${C.border}`,
              display: "flex",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            {[
              {
                label: "CE Net ΔOI",
                val: rows.reduce((s, r) => s + r.CE.changeinOpenInterest, 0),
                up: "Building CE (Bearish pressure)",
                dn: "CE Exiting (Bullish relief)",
                upC: C.red,
                dnC: C.green,
              },
              {
                label: "PE Net ΔOI",
                val: rows.reduce((s, r) => s + r.PE.changeinOpenInterest, 0),
                up: "Building PE (Bullish support)",
                dn: "PE Exiting (Bearish risk)",
                upC: C.green,
                dnC: C.red,
              },
            ].map(({ label, val, up, dn, upC, dnC }) => (
              <div key={label} style={{ flex: 1, minWidth: 140 }}>
                <div style={{ fontSize: 9, color: C.muted, marginBottom: 3 }}>{label}</div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: val >= 0 ? upC : dnC,
                  }}
                >
                  {val >= 0 ? "+" : ""}{fmt(val)}
                </div>
                <div style={{ fontSize: 10, color: val >= 0 ? upC : dnC }}>
                  {val >= 0 ? up : dn}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SEARCHABLE SYMBOL PICKER
// ═══════════════════════════════════════════════════════════════
function SymbolPicker({ selected, onChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef(null);
  const inputRef = useRef(null);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return FO_LIST;
    return FO_LIST.filter(
      (i) =>
        i.name.toLowerCase().includes(q) || i.symbol.toLowerCase().includes(q),
    );
  }, [query]);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  const indices = filtered.filter((i) => i.type === "index");
  const stocks = filtered.filter((i) => i.type === "stock");

  const Item = ({ item }) => (
    <div
      onClick={() => {
        onChange(item);
        setOpen(false);
        setQuery("");
      }}
      style={{
        padding: "8px 12px",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
        borderRadius: 5,
        background:
          selected?.symbol === item.symbol ? C.surface2 : "transparent",
        transition: "background .1s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = C.surface2)}
      onMouseLeave={(e) =>
      (e.currentTarget.style.background =
        selected?.symbol === item.symbol ? C.surface2 : "transparent")
      }
    >
      <div
        style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}
      >
        <span
          style={{
            fontSize: 9,
            fontWeight: 700,
            padding: "2px 5px",
            borderRadius: 3,
            flexShrink: 0,
            background: item.type === "index" ? "#0d1e2e" : "#1a0a1a",
            color: item.type === "index" ? C.blue : C.purple,
            letterSpacing: 0.5,
          }}
        >
          {item.type === "index" ? "IDX" : "STK"}
        </span>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              color: C.text,
              fontSize: 13,
              fontWeight: 600,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {item.symbol}
          </div>
          <div
            style={{
              color: C.muted,
              fontSize: 10,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {item.name}
          </div>
        </div>
      </div>
      <span style={{ color: C.muted, fontSize: 10, flexShrink: 0 }}>
        Lot: {item.lot}
      </span>
    </div>
  );

  return (
    <div
      ref={ref}
      style={{ position: "relative", minWidth: 0, flex: 1, maxWidth: 320 }}
    >
      {/* Trigger button */}
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          padding: "8px 12px",
          borderRadius: 8,
          border: `1px solid ${open ? C.blue : C.border}`,
          background: C.surface,
          color: C.text,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          fontFamily: "'IBM Plex Mono',monospace",
          transition: "border-color .2s",
        }}
      >
        <div
          style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}
        >
          {selected && (
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                padding: "2px 5px",
                borderRadius: 3,
                flexShrink: 0,
                background: selected.type === "index" ? "#0d1e2e" : "#1a0a1a",
                color: selected.type === "index" ? C.blue : C.purple,
              }}
            >
              {selected.type === "index" ? "IDX" : "STK"}
            </span>
          )}
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {selected ? selected.symbol : "Select Symbol"}
          </span>
        </div>
        <span style={{ color: C.muted, fontSize: 10, flexShrink: 0 }}>▾</span>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            zIndex: 1000,
            boxShadow: "0 8px 32px #00000088",
            overflow: "hidden",
            minWidth: 280,
          }}
        >
          {/* Search */}
          <div
            style={{
              padding: "8px 10px",
              borderBottom: `1px solid ${C.border}`,
            }}
          >
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search symbol or name…"
              style={{
                width: "100%",
                padding: "7px 10px",
                borderRadius: 6,
                border: `1px solid ${C.border}`,
                background: C.bg,
                color: C.text,
                fontFamily: "'IBM Plex Mono',monospace",
                fontSize: 12,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>
          {/* Results */}
          <div
            style={{
              maxHeight: 300,
              overflowY: "auto",
              padding: "4px 6px 6px",
            }}
          >
            {indices.length > 0 && (
              <>
                <div
                  style={{
                    fontSize: 9,
                    color: C.muted,
                    padding: "6px 6px 3px",
                    letterSpacing: 1,
                  }}
                >
                  ── INDICES
                </div>
                {indices.map((i) => (
                  <Item key={i.symbol} item={i} />
                ))}
              </>
            )}
            {stocks.length > 0 && (
              <>
                <div
                  style={{
                    fontSize: 9,
                    color: C.muted,
                    padding: "6px 6px 3px",
                    letterSpacing: 1,
                  }}
                >
                  ── STOCKS ({stocks.length})
                </div>
                {stocks.map((i) => (
                  <Item key={i.symbol} item={i} />
                ))}
              </>
            )}
            {filtered.length === 0 && (
              <div
                style={{
                  padding: "20px",
                  textAlign: "center",
                  color: C.muted,
                  fontSize: 12,
                }}
              >
                No results for "{query}"
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// CHART TOOLTIP
// ═══════════════════════════════════════════════════════════════
const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: C.bg,
        border: `1px solid ${C.border}`,
        borderRadius: 8,
        padding: "8px 12px",
        fontSize: 11,
      }}
    >
      <p style={{ color: C.muted, marginBottom: 4 }}>
        Strike <b style={{ color: C.text }}>{label}</b>
      </p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color, margin: "2px 0" }}>
          {p.name}: <b>{(p.value / 1000).toFixed(1)}K</b>
        </p>
      ))}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// SIGNAL BANNER
// ═══════════════════════════════════════════════════════════════
function SignalBanner({ sig, atm, maxPain, spot }) {
  const meta = {
    "BUY CALL": { color: C.green, bg: C.greenBg, icon: "▲" },
    "BUY PUT": { color: C.red, bg: C.redBg, icon: "▼" },
    "NO TRADE": { color: C.muted, bg: C.surface, icon: "—" },
  }[sig.signal];
  const pcrColor = sig.pcr > 1.2 ? C.green : sig.pcr < 0.8 ? C.red : C.yellow;
  return (
    <div
      style={{
        background: meta.bg,
        border: `1px solid ${meta.color}40`,
        borderRadius: 10,
        padding: "12px 14px",
        marginBottom: 12,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: meta.color,
            textShadow: `0 0 16px ${meta.color}80`,
            letterSpacing: 1,
          }}
        >
          {meta.icon} {sig.signal}
        </span>
        <div>
          <div style={{ fontSize: 10, color: C.muted }}>Strength</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div
              style={{
                width: 80,
                height: 5,
                background: C.border,
                borderRadius: 3,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${sig.strength}%`,
                  height: "100%",
                  background:
                    sig.strength > 70
                      ? C.green
                      : sig.strength > 50
                        ? C.yellow
                        : C.muted,
                  borderRadius: 3,
                }}
              />
            </div>
            <span style={{ color: meta.color, fontWeight: 700, fontSize: 13 }}>
              {sig.strength}
            </span>
            <span style={{ color: C.muted, fontSize: 10 }}>
              {sig.strengthLabel}
            </span>
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
        {[
          { l: "Spot", v: spot?.toFixed(1), c: C.text },
          { l: "ATM", v: atm, c: C.blue },
          { l: "MaxPain", v: maxPain, c: C.yellow },
          { l: "PCR", v: sig.pcr, c: pcrColor, sub: sig.pcrBias },
          { l: "↑ Res", v: `+${sig.distToRes}`, c: C.red, sub: "to res" },
          { l: "↓ Sup", v: `-${sig.distToSup}`, c: C.green, sub: "to sup" },
        ].map(({ l, v, c, sub }) => (
          <div key={l} style={{ textAlign: "center" }}>
            <div style={{ fontSize: 9, color: C.muted }}>{l}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: c }}>{v}</div>
            {sub && <div style={{ fontSize: 9, color: c }}>{sub}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ZONE BADGES
// ═══════════════════════════════════════════════════════════════
function ZoneBadges({ sig }) {
  return (
    <div
      style={{ display: "flex", gap: 12, marginBottom: 12, flexWrap: "wrap" }}
    >
      <div style={{ flex: 1, minWidth: 160 }}>
        <div
          style={{
            fontSize: 9,
            color: C.green,
            marginBottom: 5,
            letterSpacing: 1,
          }}
        >
          ▲ SUPPORT — top PE OI below spot
        </div>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {sig.topSupport.length ? (
            sig.topSupport.map((s, i) => (
              <span
                key={s}
                style={{
                  background: i === 0 ? C.greenBg : "#111",
                  border: `1px solid ${C.green}40`,
                  color: C.green,
                  padding: "2px 8px",
                  borderRadius: 4,
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                {s}
              </span>
            ))
          ) : (
            <span style={{ color: C.muted, fontSize: 10 }}>
              No data below spot
            </span>
          )}
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 160 }}>
        <div
          style={{
            fontSize: 9,
            color: C.red,
            marginBottom: 5,
            letterSpacing: 1,
          }}
        >
          ▼ RESISTANCE — top CE OI above spot
        </div>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {sig.topResistance.length ? (
            sig.topResistance.map((s, i) => (
              <span
                key={s}
                style={{
                  background: i === 0 ? C.redBg : "#111",
                  border: `1px solid ${C.red}40`,
                  color: C.red,
                  padding: "2px 8px",
                  borderRadius: 4,
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                {s}
              </span>
            ))
          ) : (
            <span style={{ color: C.muted, fontSize: 10 }}>
              No data above spot
            </span>
          )}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ fontSize: 9, color: C.muted }}>OI CHANGE BIAS</div>
        <span
          style={{
            color:
              sig.oiChangeBias === "Bullish"
                ? C.green
                : sig.oiChangeBias === "Bearish"
                  ? C.red
                  : C.yellow,
            fontWeight: 700,
            fontSize: 12,
          }}
        >
          {sig.oiChangeBias}
        </span>
        <div style={{ fontSize: 9, color: C.muted }}>PCR BIAS</div>
        <span
          style={{
            color:
              sig.pcrBias === "Bullish"
                ? C.green
                : sig.pcrBias === "Bearish"
                  ? C.red
                  : C.yellow,
            fontWeight: 700,
            fontSize: 12,
          }}
        >
          {sig.pcrBias}
        </span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// NSE API FETCH HELPERS
// ═══════════════════════════════════════════════════════════════

const REFRESH_MS = 120_000; // auto-refresh every 2 minutes

/**
 * fetchOptionChain(instrument) → Promise<rawData>
 *
 * Calls your backend proxy (same origin) which forwards to NSE and returns
 * the raw API JSON. Replace the URL with your actual endpoint.
 *
 * Index endpoint : GET /api/option-chain?symbol=NIFTY     → {records:{...}}
 * Stock endpoint : GET /api/option-chain?symbol=MAZDOCK   → {data:[...], timestamp}
 *
 * The function normalises both shapes into the internal rawData format the
 * parsers already understand, so NO changes to parseIndexChain / parseStockChain.
 *
 * Why a backend proxy?
 *   NSE sets strict CORS headers (no wildcard origin) and requires browser-like
 *   cookies/referer headers. A thin server-side proxy (Node/Python/etc.) strips
 *   that complexity and keeps your API key / session cookie off the client.
 */
async function fetchOptionChain(instrument) {
  const isIndex = instrument.type === "index";

  const apiName = isIndex ? "F&O" : "optionChain";
  const json = await getNSEData(apiName, instrument.symbol);

  // ── Normalise index response ────────────────────────────────
  // NSE index shape: { records: { timestamp, underlyingValue, data:[...] } }
  // We split it into displayData (ATM ±15) + fullOI (all strikes, compact)
  if (isIndex) {
    const rec = json.records ?? json; // tolerate both wrapped / unwrapped
    const allRows = (rec.data ?? [])
      .filter((r) => r.CE || r.PE)
      .sort((a, b) => a.strikePrice - b.strikePrice);

    const uv = rec.underlyingValue ?? 0;
    const atmIdx = allRows.reduce(
      (bi, r, i) =>
        Math.abs(r.strikePrice - uv) < Math.abs(allRows[bi].strikePrice - uv)
          ? i
          : bi,
      0,
    );
    const displayData = allRows.slice(Math.max(0, atmIdx - 15), atmIdx + 16);

    // fullOI: compact {s, c, p} for all strikes — used for PCR + MaxPain
    const fullOI = allRows.map((r) => ({
      s: r.strikePrice,
      c: r.CE?.openInterest ?? 0,
      p: r.PE?.openInterest ?? 0,
    }));

    return {
      timestamp: rec.timestamp ?? new Date().toLocaleString("en-IN"),
      underlyingValue: uv,
      displayData,
      fullOI,
    };
  }

  // ── Normalise stock response ────────────────────────────────
  // NSE stock shape: { data:[{optionType, strikePrice, expiryDate, ...}], timestamp }
  // parseStockChain already handles this shape directly.
  return {
    timestamp: json.timestamp ?? new Date().toLocaleString("en-IN"),
    underlyingValue: json.data?.[0]?.underlyingValue ?? 0,
    data: json.data ?? [],
  };
}

// ═══════════════════════════════════════════════════════════════
// Per-symbol seed data — used for offline/demo mode.
// The hook swaps rawData to the matching seed instantly on symbol change,
// so parsers never see cross-type stale data during the async fetch gap.
const SEED_DATA = {
  NIFTY: INDEX_DATA, // index shape: { displayData, fullOI, underlyingValue, timestamp }
  MAZDOCK: STOCK_DATA, // stock shape: { data:[...], underlyingValue, timestamp }
};

// useOptionChain — custom hook
// Key contract: rawData is ALWAYS the correct shape for the current instrument.
// It is set to null (or the symbol's seed) synchronously before each fetch,
// preventing the parse layer from receiving the previous symbol's data.
function useOptionChain(instrument) {
  const [rawData, setRawData] = useState(
    () => SEED_DATA[instrument.symbol] ?? null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fetchedAt, setFetchedAt] = useState(null);
  const abortRef = useRef(null);

  const load = useCallback(async (inst) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    // Immediately swap to the new symbol's seed (or null).
    // This clears stale data BEFORE isIndex/isStock affects the parse layer.
    setRawData(SEED_DATA[inst.symbol] ?? null);
    setLoading(true);
    setError(null);

    try {
      const data = await fetchOptionChain(inst);
      if (controller.signal.aborted) return;
      setRawData(data);
      setFetchedAt(Date.now());
      setError(null);
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(err.message ?? "Failed to fetch option chain");
      // keep seed visible on error — don't blank out
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(instrument);
    return () => abortRef.current?.abort();
  }, [instrument, load]);

  useEffect(() => {
    const id = setInterval(() => load(instrument), REFRESH_MS);
    return () => clearInterval(id);
  }, [instrument, load]);

  const retry = useCallback(() => load(instrument), [instrument, load]);
  return { rawData, loading, error, fetchedAt, retry };
}

// ═══════════════════════════════════════════════════════════════
// LOADING SKELETON
// ═══════════════════════════════════════════════════════════════
function LoadingSkeleton() {
  const bar = (w, h = 10, r = 4) => (
    <div
      style={{
        width: w,
        height: h,
        borderRadius: r,
        background: `linear-gradient(90deg, ${C.surface} 25%, ${C.surface2} 50%, ${C.surface} 75%)`,
        backgroundSize: "200% 100%",
        animation: "shimmer 1.4s infinite",
      }}
    />
  );
  return (
    <div style={{ padding: "0 0 24px" }}>
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
      {/* Signal banner skeleton */}
      <div
        style={{
          background: C.surface,
          borderRadius: 10,
          padding: 16,
          marginBottom: 12,
          display: "flex",
          gap: 16,
          alignItems: "center",
        }}
      >
        {bar(120, 28, 6)}
        {bar(200, 14, 4)}
        {bar(80, 28, 6)}
        {bar(80, 28, 6)}
        {bar(80, 28, 6)}
      </div>
      {/* Zones skeleton */}
      <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
        <div
          style={{
            flex: 1,
            background: C.surface,
            borderRadius: 8,
            padding: 12,
            display: "flex",
            gap: 8,
          }}
        >
          {[60, 60, 60].map((w, i) => bar(w, 22, 4, i))}
        </div>
        <div
          style={{
            flex: 1,
            background: C.surface,
            borderRadius: 8,
            padding: 12,
            display: "flex",
            gap: 8,
          }}
        >
          {[60, 60, 60].map((w, i) => bar(w, 22, 4, i))}
        </div>
      </div>
      {/* Chart skeleton */}
      <div
        style={{
          background: C.surface,
          borderRadius: 10,
          padding: 16,
          height: 250,
          display: "flex",
          alignItems: "flex-end",
          gap: 4,
        }}
      >
        {Array.from({ length: 20 }, (_, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: `${20 + Math.sin(i) * 30 + 40}%`,
              background: C.surface2,
              borderRadius: "3px 3px 0 0",
              opacity: 0.5,
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ERROR PANEL
// ═══════════════════════════════════════════════════════════════
function ErrorPanel({ error, onRetry, instrument }) {
  return (
    <div
      style={{
        background: "#1a0808",
        border: `1px solid ${C.red}40`,
        borderRadius: 10,
        padding: "20px 24px",
        marginBottom: 12,
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 28, marginBottom: 8 }}>⚠️</div>
      <div
        style={{ color: C.red, fontWeight: 700, fontSize: 14, marginBottom: 6 }}
      >
        Failed to load {instrument.symbol}
      </div>
      <div
        style={{
          color: C.muted,
          fontSize: 11,
          marginBottom: 16,
          fontFamily: "monospace",
        }}
      >
        {error}
      </div>
      <button
        onClick={onRetry}
        style={{
          padding: "8px 20px",
          borderRadius: 6,
          border: `1px solid ${C.red}`,
          background: C.redBg,
          color: C.red,
          cursor: "pointer",
          fontFamily: "'IBM Plex Mono',monospace",
          fontWeight: 600,
          fontSize: 12,
        }}
      >
        ↺ Retry
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// COUNTDOWN TIMER  — shows seconds until next auto-refresh
// ═══════════════════════════════════════════════════════════════
function RefreshCountdown({ fetchedAt }) {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    if (!fetchedAt) return;
    const tick = () => {
      const elapsed = Date.now() - fetchedAt;
      setSecs(Math.max(0, Math.round((REFRESH_MS - elapsed) / 1000)));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [fetchedAt]);
  const pct = fetchedAt
    ? Math.round(((Date.now() - fetchedAt) / REFRESH_MS) * 100)
    : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      {/* Progress ring */}
      <svg width={16} height={16} style={{ flexShrink: 0 }}>
        <circle
          cx={8}
          cy={8}
          r={6}
          fill="none"
          stroke={C.border}
          strokeWidth={2}
        />
        <circle
          cx={8}
          cy={8}
          r={6}
          fill="none"
          stroke={C.blue}
          strokeWidth={2}
          strokeDasharray={`${(pct / 100) * 37.7} 37.7`}
          strokeLinecap="round"
          transform="rotate(-90 8 8)"
          style={{ transition: "stroke-dasharray 1s linear" }}
        />
      </svg>
      <span style={{ fontSize: 10, color: C.muted }}>
        {secs > 0 ? `refresh in ${secs}s` : "refreshing…"}
      </span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN APP
// Props:
//   initialData  — optional pre-fetched rawData (SSR / first paint)
//                  index shape: { timestamp, underlyingValue, displayData, fullOI }
//                  stock shape: { timestamp, underlyingValue, data }
//   initialSymbol — optional FO_LIST entry to pre-select (default: NIFTY)
// ═══════════════════════════════════════════════════════════════
export default function App({ initialData = null, initialSymbol = null }) {
  const defaultInstrument = initialSymbol ?? FO_LIST[0];
  const [instrument, setInstrument] = useState(defaultInstrument);
  const [scalpMode, setScalpMode] = useState(false);
  const [activeTab, setActiveTab] = useState("oi");
  const [selectedExpiry, setSelectedExpiry] = useState(null);

  const isIndex = instrument.type === "index";

  // ── Data fetching ───────────────────────────────────────────
  // The hook handles seed data internally via SEED_DATA[symbol].
  // No seedData variable here — that was the root cause of the crash
  // (useState ignores prop changes after mount, leaving stale cross-type data).
  const { rawData, loading, error, fetchedAt, retry } =
    useOptionChain(instrument);

  // Reset expiry and tab whenever the user switches instruments
  useEffect(() => {
    setSelectedExpiry(null);
    setActiveTab("oi");
  }, [instrument]);

  // ── Parse rawData → normalised rows ────────────────────────
  // Guards against shape mismatch: rawData may briefly be null (between symbol
  // change and seed/fetch resolution) or the wrong shape if the instrument type
  // flipped faster than the async fetch could clear it. Both parsers return []
  // on bad input, so the UI gracefully shows a skeleton instead of crashing.
  const {
    rows,
    expiries,
    selectedExpiry: activeExpiry,
    underlyingValue,
  } = useMemo(() => {
    const empty = {
      rows: [],
      expiries: [],
      selectedExpiry: null,
      underlyingValue: 0,
    };
    if (!rawData) return empty;
    if (isIndex) {
      const rows = parseIndexChain(rawData);
      // parseIndexChain returns [] when passed stock-shaped data — show skeleton
      if (!rows.length && !rawData.displayData && !rawData.data) return empty;
      return {
        rows,
        expiries: [],
        selectedExpiry: null,
        underlyingValue: rawData.underlyingValue ?? 0,
      };
    } else {
      const parsed = parseStockChain(rawData, selectedExpiry);
      return {
        rows: parsed.rows,
        expiries: parsed.expiries,
        selectedExpiry: parsed.selectedExpiry,
        underlyingValue: rawData.underlyingValue ?? 0,
      };
    }
  }, [isIndex, rawData, selectedExpiry]);

  // ── Analysis (all memoised) ─────────────────────────────────
  const atm = useMemo(
    () => (rows.length ? findATM(rows, underlyingValue) : 0),
    [rows, underlyingValue],
  );

  // PCR: index → full 133-strike chain to avoid ATM-window distortion
  //       stock → complete per-expiry rows
  const pcr = useMemo(
    () => (isIndex ? calcPCRFull(rawData?.fullOI) : calcPCR(rows)),
    [isIndex, rawData, rows],
  );

  // MaxPain: index → full chain; stock → complete per-expiry rows
  const maxPain = useMemo(
    () =>
      isIndex
        ? calcMaxPainFull(rawData?.fullOI)
        : rows.length
          ? calcMaxPain(rows)
          : 0,
    [isIndex, rawData, rows],
  );

  const sig = useMemo(
    () =>
      rows.length ? generateSignal(rows, atm, pcr, underlyingValue) : null,
    [rows, atm, pcr, underlyingValue],
  );

  // ── Display window (chart + table) ─────────────────────────
  const range = scalpMode ? (isIndex ? 200 : 100) : isIndex ? 1500 : 600;
  const displayRows = useMemo(
    () => rows.filter((r) => Math.abs(r.strikePrice - atm) <= range),
    [rows, atm, range],
  );

  const chartData = useMemo(
    () =>
      displayRows.map((r) => ({
        strike: r.strikePrice,
        "Call OI": r.CE.openInterest,
        "Put OI": r.PE.openInterest,
        "CE ΔOI": r.CE.changeinOpenInterest,
        "PE ΔOI": r.PE.changeinOpenInterest,
        isATM: r.strikePrice === atm,
        isSup: sig?.topSupport.includes(r.strikePrice),
        isRes: sig?.topResistance.includes(r.strikePrice),
      })),
    [displayRows, atm, sig],
  );

  // ── Helpers ─────────────────────────────────────────────────
  const Tab = ({ id, label }) => (
    <button
      onClick={() => setActiveTab(id)}
      style={{
        padding: "5px 12px",
        borderRadius: 5,
        border: "none",
        cursor: "pointer",
        fontFamily: "'IBM Plex Mono',monospace",
        fontSize: 11,
        fontWeight: 600,
        background: activeTab === id ? C.surface2 : "transparent",
        color: activeTab === id ? C.text : C.muted,
      }}
    >
      {label}
    </button>
  );

  const timestamp = rawData?.timestamp ?? "—";

  // ── Render ──────────────────────────────────────────────────
  return (
    <div
      style={{
        background: C.bg,
        minHeight: "100vh",
        color: C.text,
        fontFamily: "'IBM Plex Mono',monospace",
      }}
    >
      <div
        style={{ maxWidth: 1200, margin: "0 auto", padding: "12px 12px 24px" }}
      >
        {/* ══ TOP BAR ════════════════════════════════════════ */}
        <div style={{ marginBottom: 12 }}>
          {/* Row 1: controls */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
              marginBottom: 8,
            }}
          >
            <SymbolPicker
              selected={instrument}
              onChange={(ins) => setInstrument(ins)}
            />

            {/* Expiry dropdown (stocks only) */}
            {!isIndex && expiries.length > 0 && (
              <select
                value={activeExpiry || ""}
                onChange={(e) => setSelectedExpiry(e.target.value)}
                style={{
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: `1px solid ${C.border}`,
                  background: C.surface,
                  color: C.text,
                  fontFamily: "'IBM Plex Mono',monospace",
                  fontSize: 12,
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                {expiries.map((ex) => (
                  <option key={ex} value={ex}>
                    {ex}
                  </option>
                ))}
              </select>
            )}

            {/* Scalp toggle */}
            <button
              onClick={() => setScalpMode((s) => !s)}
              style={{
                padding: "7px 12px",
                borderRadius: 7,
                flexShrink: 0,
                border: `1px solid ${scalpMode ? C.yellow : C.border}`,
                background: scalpMode ? "#2d2200" : "transparent",
                color: scalpMode ? C.yellow : C.muted,
                cursor: "pointer",
                fontFamily: "'IBM Plex Mono',monospace",
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              ⚡ {scalpMode ? "SCALP ON" : "SCALP"}
            </button>

            {/* Manual refresh button */}
            <button
              onClick={retry}
              disabled={loading}
              title="Refresh now"
              style={{
                padding: "7px 10px",
                borderRadius: 7,
                flexShrink: 0,
                border: `1px solid ${C.border}`,
                background: "transparent",
                color: loading ? C.muted : C.text,
                cursor: loading ? "not-allowed" : "pointer",
                fontFamily: "'IBM Plex Mono',monospace",
                fontSize: 13,
                opacity: loading ? 0.5 : 1,
                transition: "transform .3s",
                transform: loading ? "rotate(360deg)" : "none",
              }}
            >
              ↺
            </button>

            {/* Refresh countdown — right-aligned */}
            <div style={{ marginLeft: "auto" }}>
              {loading ? (
                <span style={{ fontSize: 10, color: C.blue }}>● fetching…</span>
              ) : fetchedAt ? (
                <RefreshCountdown fetchedAt={fetchedAt} />
              ) : null}
            </div>
          </div>

          {/* Row 2: instrument header */}
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontSize: 20,
                fontWeight: 800,
                color: isIndex ? C.blue : C.purple,
              }}
            >
              {instrument.symbol}
            </span>
            {underlyingValue > 0 && (
              <span style={{ fontSize: 18, fontWeight: 700, color: C.text }}>
                ₹{underlyingValue.toLocaleString("en-IN")}
              </span>
            )}
            <span style={{ fontSize: 11, color: C.muted }}>
              {instrument.name}
            </span>
            <span style={{ fontSize: 10, color: C.muted, marginLeft: "auto" }}>
              {timestamp}
            </span>
          </div>

          {/* Chips row */}
          <div
            style={{ marginTop: 4, display: "flex", gap: 8, flexWrap: "wrap" }}
          >
            <span
              style={{
                fontSize: 10,
                background: C.surface2,
                color: C.muted,
                padding: "2px 8px",
                borderRadius: 4,
              }}
            >
              Lot: <b style={{ color: C.text }}>{instrument.lot}</b>
            </span>
            {!isIndex && activeExpiry && (
              <span
                style={{
                  fontSize: 10,
                  background: "#1a0a1a",
                  color: C.purple,
                  padding: "2px 8px",
                  borderRadius: 4,
                }}
              >
                {activeExpiry}
              </span>
            )}
            {scalpMode && (
              <span
                style={{
                  fontSize: 10,
                  background: "#2d2200",
                  color: C.yellow,
                  padding: "2px 8px",
                  borderRadius: 4,
                }}
              >
                ±{isIndex ? 200 : 100} from ATM
              </span>
            )}
          </div>
        </div>

        {/* ══ ERROR STATE ════════════════════════════════════ */}
        {error && (
          <ErrorPanel error={error} onRetry={retry} instrument={instrument} />
        )}

        {/* ══ LOADING STATE (first load, no data yet) ════════ */}
        {loading && !rawData && <LoadingSkeleton />}

        {/* ══ CONTENT (show even while background-refreshing) ═ */}
        {rawData && (
          <>
            {/* Signal banner */}
            {sig && (
              <SignalBanner
                sig={sig}
                atm={atm}
                maxPain={maxPain}
                spot={underlyingValue}
              />
            )}
            {sig && <ZoneBadges sig={sig} />}

            {/* Tabs */}
            <div
              style={{
                display: "flex",
                gap: 3,
                marginBottom: 10,
                borderBottom: `1px solid ${C.border}`,
                paddingBottom: 4,
                flexWrap: "wrap",
              }}
            >
              <Tab id="oi" label="OI Chart" />
              <Tab id="doi" label="ΔOI Chart" />
              <Tab id="table" label="Table" />
              <Tab id="inst" label="🧠 Smart Money" />
              {!isIndex && <Tab id="expiry" label="Expiries" />}
            </div>

            {/* Stale data overlay when background-refreshing */}
            <div style={{ position: "relative" }}>
              {loading && rawData && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    zIndex: 10,
                    borderRadius: 10,
                    background: `${C.bg}55`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backdropFilter: "blur(1px)",
                  }}
                >
                  <span style={{ color: C.blue, fontSize: 11 }}>
                    ● Refreshing data…
                  </span>
                </div>
              )}

              {/* OI Chart */}
              {activeTab === "oi" && (
                <div
                  style={{
                    background: C.surface,
                    borderRadius: 10,
                    padding: "12px 8px",
                    marginBottom: 10,
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      color: C.muted,
                      marginBottom: 8,
                      paddingLeft: 4,
                    }}
                  >
                    Call OI vs Put OI · ATM:{" "}
                    <b style={{ color: C.blue }}>{atm}</b>
                  </div>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart
                      data={chartData}
                      barCategoryGap="15%"
                      margin={{ left: -15, right: 4 }}
                    >
                      <XAxis
                        dataKey="strike"
                        tick={{ fill: C.muted, fontSize: 9 }}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        tick={{ fill: C.muted, fontSize: 9 }}
                        tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
                        width={38}
                      />
                      <Tooltip content={<ChartTip />} />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      <ReferenceLine
                        x={atm}
                        stroke={C.blue}
                        strokeDasharray="4 3"
                        label={{ value: "ATM", fill: C.blue, fontSize: 9 }}
                      />
                      <ReferenceLine
                        x={maxPain}
                        stroke={C.yellow}
                        strokeDasharray="4 3"
                        label={{ value: "MP", fill: C.yellow, fontSize: 9 }}
                      />
                      <Bar dataKey="Call OI">
                        {chartData.map((e, i) => (
                          <Cell
                            key={i}
                            fill={
                              e.isRes ? C.red : e.isATM ? "#ff7b72" : "#3a1a1a"
                            }
                            opacity={e.isRes ? 1 : 0.75}
                          />
                        ))}
                      </Bar>
                      <Bar dataKey="Put OI">
                        {chartData.map((e, i) => (
                          <Cell
                            key={i}
                            fill={
                              e.isSup
                                ? C.green
                                : e.isATM
                                  ? "#56d364"
                                  : C.greenBg
                            }
                            opacity={e.isSup ? 1 : 0.75}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* ΔOI Chart */}
              {activeTab === "doi" && (
                <div
                  style={{
                    background: C.surface,
                    borderRadius: 10,
                    padding: "12px 8px",
                    marginBottom: 10,
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      color: C.muted,
                      marginBottom: 8,
                      paddingLeft: 4,
                    }}
                  >
                    Change in OI · Smart Money Activity
                  </div>
                  <ResponsiveContainer width="100%" height={210}>
                    <BarChart
                      data={chartData}
                      barCategoryGap="15%"
                      margin={{ left: -15, right: 4 }}
                    >
                      <XAxis
                        dataKey="strike"
                        tick={{ fill: C.muted, fontSize: 9 }}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        tick={{ fill: C.muted, fontSize: 9 }}
                        tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
                        width={38}
                      />
                      <Tooltip content={<ChartTip />} />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      <ReferenceLine y={0} stroke={C.border} />
                      <ReferenceLine
                        x={atm}
                        stroke={C.blue}
                        strokeDasharray="4 3"
                      />
                      <Bar dataKey="CE ΔOI">
                        {chartData.map((e, i) => (
                          <Cell
                            key={i}
                            fill={e["CE ΔOI"] >= 0 ? C.red : C.green}
                            opacity={0.85}
                          />
                        ))}
                      </Bar>
                      <Bar dataKey="PE ΔOI">
                        {chartData.map((e, i) => (
                          <Cell
                            key={i}
                            fill={e["PE ΔOI"] >= 0 ? C.green : C.red}
                            opacity={0.85}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  {(() => {
                    const sm = chartData
                      .filter(
                        (r) =>
                          Math.abs(r["CE ΔOI"]) > 300 ||
                          Math.abs(r["PE ΔOI"]) > 300,
                      )
                      .slice(0, 5);
                    return (
                      sm.length > 0 && (
                        <div style={{ marginTop: 8, paddingLeft: 4 }}>
                          <div
                            style={{
                              fontSize: 9,
                              color: C.yellow,
                              marginBottom: 4,
                            }}
                          >
                            ⚡ Smart Money
                          </div>
                          <div
                            style={{
                              display: "flex",
                              gap: 5,
                              flexWrap: "wrap",
                            }}
                          >
                            {sm.map((r) => (
                              <span
                                key={r.strike}
                                style={{
                                  background: "#1c1400",
                                  border: `1px solid ${C.yellow}40`,
                                  color: C.yellow,
                                  padding: "2px 7px",
                                  borderRadius: 4,
                                  fontSize: 10,
                                }}
                              >
                                {r.strike}{" "}
                                {r["PE ΔOI"] > r["CE ΔOI"] ? "🟢PE" : "🔴CE"}
                              </span>
                            ))}
                          </div>
                        </div>
                      )
                    );
                  })()}
                </div>
              )}

              {/* Table */}
              {activeTab === "table" && sig && (
                <div
                  style={{
                    background: C.surface,
                    borderRadius: 10,
                    padding: 10,
                    marginBottom: 10,
                    overflowX: "auto",
                  }}
                >
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      fontSize: 11,
                      minWidth: 520,
                    }}
                  >
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                        {[
                          "CE OI",
                          "CE ΔOI",
                          "CE LTP",
                          "STRIKE",
                          "PE OI",
                          "PE ΔOI",
                          "PE LTP",
                          "Build-up",
                        ].map((h) => (
                          <th
                            key={h}
                            style={{
                              padding: "5px 6px",
                              color: C.muted,
                              textAlign: "right",
                              whiteSpace: "nowrap",
                              fontWeight: 600,
                            }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {displayRows.map((r) => {
                        const isATM = r.strikePrice === atm;
                        const isSup = sig.topSupport.includes(r.strikePrice);
                        const isRes = sig.topResistance.includes(r.strikePrice);
                        const bu = buildupType(r);
                        const buC =
                          bu === "Long Build-up"
                            ? C.green
                            : bu === "Short Build-up"
                              ? C.red
                              : bu === "Short Covering"
                                ? C.blue
                                : C.muted;
                        return (
                          <tr
                            key={r.strikePrice}
                            style={{
                              borderBottom: `1px solid ${C.surface2}`,
                              background: isATM
                                ? "#161e2e"
                                : isRes
                                  ? C.redBg
                                  : isSup
                                    ? C.greenBg
                                    : "transparent",
                            }}
                          >
                            <td
                              style={{
                                padding: "3px 6px",
                                textAlign: "right",
                                color: C.red,
                              }}
                            >
                              {r.CE.openInterest.toLocaleString()}
                            </td>
                            <td
                              style={{
                                padding: "3px 6px",
                                textAlign: "right",
                                color:
                                  r.CE.changeinOpenInterest >= 0
                                    ? C.red
                                    : C.green,
                              }}
                            >
                              {r.CE.changeinOpenInterest > 0 ? "+" : ""}
                              {r.CE.changeinOpenInterest.toLocaleString()}
                            </td>
                            <td
                              style={{
                                padding: "3px 6px",
                                textAlign: "right",
                                color: C.text,
                              }}
                            >
                              {r.CE.lastPrice}
                            </td>
                            <td
                              style={{
                                padding: "3px 8px",
                                textAlign: "center",
                                fontWeight: 700,
                                color: isATM
                                  ? C.blue
                                  : isRes
                                    ? C.red
                                    : isSup
                                      ? C.green
                                      : C.text,
                                background: isATM ? "#1c2a3a" : undefined,
                              }}
                            >
                              {r.strikePrice}
                              {isATM ? " ◆" : ""}
                            </td>
                            <td
                              style={{
                                padding: "3px 6px",
                                textAlign: "right",
                                color: C.green,
                              }}
                            >
                              {r.PE.openInterest.toLocaleString()}
                            </td>
                            <td
                              style={{
                                padding: "3px 6px",
                                textAlign: "right",
                                color:
                                  r.PE.changeinOpenInterest >= 0
                                    ? C.green
                                    : C.red,
                              }}
                            >
                              {r.PE.changeinOpenInterest > 0 ? "+" : ""}
                              {r.PE.changeinOpenInterest.toLocaleString()}
                            </td>
                            <td
                              style={{
                                padding: "3px 6px",
                                textAlign: "right",
                                color: C.text,
                              }}
                            >
                              {r.PE.lastPrice}
                            </td>
                            <td
                              style={{
                                padding: "3px 6px",
                                textAlign: "right",
                                color: buC,
                                whiteSpace: "nowrap",
                                fontSize: 10,
                              }}
                            >
                              {bu}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Smart Money / Institutional Analysis */}
              {activeTab === "inst" && (
                <InstitutionalPanel
                  rows={displayRows}
                  spot={underlyingValue}
                  atm={atm}
                  maxPain={maxPain}
                  pcr={pcr}
                />
              )}

              {/* Expiry cards (stock only) */}
              {activeTab === "expiry" && !isIndex && (
                <div
                  style={{
                    background: C.surface,
                    borderRadius: 10,
                    padding: 12,
                    marginBottom: 10,
                  }}
                >
                  <div
                    style={{ fontSize: 10, color: C.muted, marginBottom: 10 }}
                  >
                    PCR & OI across all expiries · {instrument.symbol}
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {expiries.map((ex) => {
                      const p = parseStockChain(rawData, ex);
                      const pcrV = calcPCR(p.rows).toFixed(2);
                      const totCE = p.rows.reduce(
                        (s, r) => s + r.CE.openInterest,
                        0,
                      );
                      const totPE = p.rows.reduce(
                        (s, r) => s + r.PE.openInterest,
                        0,
                      );
                      const pc =
                        pcrV > 1.2 ? C.green : pcrV < 0.8 ? C.red : C.yellow;
                      const isActive = ex === activeExpiry;
                      return (
                        <div
                          key={ex}
                          onClick={() => {
                            setSelectedExpiry(ex);
                            setActiveTab("oi");
                          }}
                          style={{
                            background: isActive ? "#0d1e2e" : C.bg,
                            border: `1px solid ${isActive ? C.blue : C.border}`,
                            borderRadius: 8,
                            padding: "10px 14px",
                            cursor: "pointer",
                            flex: "1 1 140px",
                            transition: "border-color .15s",
                          }}
                        >
                          <div
                            style={{
                              color: C.blue,
                              fontWeight: 700,
                              fontSize: 11,
                              marginBottom: 6,
                            }}
                          >
                            {ex}
                          </div>
                          <div style={{ display: "flex", gap: 12 }}>
                            <div>
                              <div style={{ fontSize: 9, color: C.muted }}>
                                CE OI
                              </div>
                              <div
                                style={{
                                  color: C.red,
                                  fontSize: 12,
                                  fontWeight: 700,
                                }}
                              >
                                {(totCE / 1000).toFixed(1)}K
                              </div>
                            </div>
                            <div>
                              <div style={{ fontSize: 9, color: C.muted }}>
                                PE OI
                              </div>
                              <div
                                style={{
                                  color: C.green,
                                  fontSize: 12,
                                  fontWeight: 700,
                                }}
                              >
                                {(totPE / 1000).toFixed(1)}K
                              </div>
                            </div>
                            <div>
                              <div style={{ fontSize: 9, color: C.muted }}>
                                PCR
                              </div>{" "}
                              <div
                                style={{
                                  color: pc,
                                  fontSize: 12,
                                  fontWeight: 700,
                                }}
                              >
                                {pcrV}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ marginTop: 8, fontSize: 10, color: C.muted }}>
                    Tap a card to load its full analysis
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                fontSize: 10,
                color: C.muted,
                marginTop: 4,
                paddingTop: 8,
                borderTop: `1px solid ${C.border}`,
              }}
            >
              <span>
                F&O: <b style={{ color: C.text }}>{instrument.symbol}</b>
              </span>
              <span>·</span>
              <span>
                Lot: <b style={{ color: C.text }}>{instrument.lot}</b>
              </span>
              <span>·</span>
              <span>
                ATM: <b style={{ color: C.blue }}>{atm || "—"}</b>
              </span>
              <span>·</span>
              <span>
                MaxPain: <b style={{ color: C.yellow }}>{maxPain || "—"}</b>
              </span>
              <span>·</span>
              <span>
                PCR:{" "}
                <b
                  style={{
                    color:
                      sig?.pcr > 1.2
                        ? C.green
                        : sig?.pcr < 0.8
                          ? C.red
                          : C.yellow,
                  }}
                >
                  {sig?.pcr ?? "—"}
                </b>
              </span>
              <span style={{ marginLeft: "auto" }}>
                {timestamp} · auto-refresh 2 min
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
