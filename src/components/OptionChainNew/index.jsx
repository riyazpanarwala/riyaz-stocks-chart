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
import { isMarketOpen, isHoliday } from "../utils/indianstockmarket";
import {
  detectBreakouts,
  breakoutSignalMeta,
  pushSnapshot,
  MAX_SNAPSHOTS,
} from "./breakoutDetector";

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
// PLAIN-ENGLISH LABEL HELPERS
// All user-facing strings go through these helpers so the UI
// never exposes raw option-chain jargon to a non-technical trader.
// ═══════════════════════════════════════════════════════════════

/** Convert PCR number → plain-English sentiment */
function pcrLabel(pcr) {
  if (pcr > 1.4) return "Very Bullish";
  if (pcr > 1.2) return "Bullish";
  if (pcr < 0.6) return "Very Bearish";
  if (pcr < 0.8) return "Bearish";
  return "Neutral";
}

/** Convert smart-money bias constant → plain-English label */
function biasLabel(bias) {
  if (bias === "BULLISH") return "Market likely to go UP";
  if (bias === "BEARISH") return "Market likely to go DOWN";
  return "Direction unclear — wait & watch";
}

/** Convert ATM shift → plain English */
function atmShiftLabel(shift) {
  if (shift === "PE Dominant")
    return "Buyers protecting the downside (Bullish)";
  if (shift === "CE Dominant") return "Sellers capping the upside (Bearish)";
  return "Both sides balanced";
}

/** Convert build-up type → plain English for table */
function buildupLabel(type) {
  switch (type) {
    case "Long Build-up":
      return "Fresh buying";
    case "Short Build-up":
      return "Fresh selling";
    case "Short Covering":
      return "Sellers exiting (price may rise)";
    case "Long Unwinding":
      return "Buyers exiting (price may fall)";
    default:
      return type;
  }
}

// ═══════════════════════════════════════════════════════════════
// PARSERS
// ═══════════════════════════════════════════════════════════════
function parseIndexChain(records) {
  if (!records || (!records.displayData && !records.data)) return [];
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

function calcPCRFull(fullOI) {
  if (!fullOI?.length) return 0;
  const ce = fullOI.reduce((s, r) => s + r.c, 0);
  const pe = fullOI.reduce((s, r) => s + r.p, 0);
  return ce === 0 ? 0 : pe / ce;
}

// BUG FIX: Original had CE and PE OI swapped in the loss formula.
// Max Pain = price at which total option-writer loss is minimised.
// Call writers lose when expiry is ABOVE their strike → (T - strike) × CE_OI
// Put writers lose when expiry is BELOW their strike → (strike - T) × PE_OI
function calcMaxPainFull(fullOI) {
  if (!fullOI?.length) return 0;
  let min = Infinity,
    mp = fullOI[0].s;
  for (const t of fullOI) {
    let loss = 0;
    for (const r of fullOI) {
      if (t.s > r.s) loss += (t.s - r.s) * r.p; // put writers lose below T — FIXED (was r.c)
      if (t.s < r.s) loss += (r.s - t.s) * r.c; // call writers lose above T — FIXED (was r.p)
    }
    if (loss < min) {
      min = loss;
      mp = t.s;
    }
  }
  return mp;
}

function parseStockChain(data, expiry) {
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

const findATM = (rows, uv) =>
  rows.length
    ? rows.reduce((b, r) =>
        Math.abs(r.strikePrice - uv) < Math.abs(b.strikePrice - uv) ? r : b,
      ).strikePrice
    : 0;

const calcPCR = (rows) => {
  const ce = rows.reduce((s, r) => s + r.CE.openInterest, 0);
  const pe = rows.reduce((s, r) => s + r.PE.openInterest, 0);
  return ce === 0 ? 0 : pe / ce;
};

// BUG FIX: Same max-pain swap as calcMaxPainFull above — put and call OI were swapped.
function calcMaxPain(rows) {
  let min = Infinity,
    mp = rows[0]?.strikePrice || 0;
  for (const t of rows) {
    let loss = 0;
    for (const r of rows) {
      if (t.strikePrice > r.strikePrice)
        loss += (t.strikePrice - r.strikePrice) * r.PE.openInterest;
      if (t.strikePrice < r.strikePrice)
        loss += (r.strikePrice - t.strikePrice) * r.CE.openInterest;
    }
    if (loss < min) {
      min = loss;
      mp = t.strikePrice;
    }
  }
  return mp;
}

function topResistance(rows, spot, n = 3) {
  return [...rows]
    .filter((r) => r.strikePrice > spot)
    .sort((a, b) => b.CE.openInterest - a.CE.openInterest)
    .slice(0, n)
    .map((r) => r.strikePrice);
}

function topSupport(rows, spot, n = 3) {
  return [...rows]
    .filter((r) => r.strikePrice < spot)
    .sort((a, b) => b.PE.openInterest - a.PE.openInterest)
    .slice(0, n)
    .map((r) => r.strikePrice);
}

function generateSignal(rows, atm, pcr, spot) {
  const atmRow = rows.find((r) => r.strikePrice === atm) || rows[0];

  const resistance = topResistance(rows, spot);
  const support = topSupport(rows, spot);

  const closestRes = resistance.length ? Math.min(...resistance) : Infinity;
  const closestSup = support.length ? Math.max(...support) : 0;
  const distToRes = closestRes - spot;
  const distToSup = spot - closestSup;

  const zoneScore = 30;
  const zoneBias = distToSup < distToRes ? 1 : -1;

  const pcrBias = pcr > 1.2 ? 1 : pcr < 0.8 ? -1 : 0;
  const pcrScore = 20;

  const ceΔ = atmRow?.CE.changeinOpenInterest || 0;
  const peΔ = atmRow?.PE.changeinOpenInterest || 0;
  const oiChangeBias = peΔ > 0 && ceΔ < 0 ? 1 : ceΔ > 0 && peΔ < 0 ? -1 : 0;
  const oiChangeScore = oiChangeBias !== 0 ? 25 : 10;

  const ceVol = atmRow?.CE.totalTradedVolume || 0;
  const peVol = atmRow?.PE.totalTradedVolume || 0;
  const volBias = peVol > ceVol * 1.3 ? 1 : ceVol > peVol * 1.3 ? -1 : 0;
  const volScore = volBias !== 0 ? 15 : 7;

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
  const totalBias = pcrBias + oiChangeBias + volBias + zoneBias;

  let signal = "WAIT — No clear direction";
  if (strength > 50) {
    if (totalBias >= 2) signal = "LIKELY UP — Consider buying a Call";
    else if (totalBias <= -2) signal = "LIKELY DOWN — Consider buying a Put";
  }

  return {
    signal,
    rawSignal:
      totalBias >= 2 ? "BUY CALL" : totalBias <= -2 ? "BUY PUT" : "NO TRADE",
    strength: Math.round(strength),
    strengthLabel:
      strength > 70 ? "Strong" : strength > 50 ? "Moderate" : "Weak",
    pcr: pcr.toFixed(2),
    pcrBias: pcrLabel(pcr),
    oiChangeBias:
      oiChangeBias === 1
        ? "New buying activity"
        : oiChangeBias === -1
          ? "New selling activity"
          : "Mixed activity",
    topSupport: support,
    topResistance: resistance,
    distToRes: Math.round(distToRes),
    distToSup: Math.round(distToSup),
  };
}

// BUG FIX: buildupType() now accepts a side parameter ('CE' | 'PE') and reads
// the correct leg — previously always read CE, giving wrong results for put-heavy strikes.
const buildupType = (r, side = "CE") => {
  const leg = r[side];
  const priceChg = leg.change;
  const oiChg = leg.changeinOpenInterest;
  if (priceChg >= 0 && oiChg >= 0) return "Long Build-up";
  if (priceChg < 0 && oiChg >= 0) return "Short Build-up";
  if (priceChg >= 0 && oiChg < 0) return "Short Covering";
  return "Long Unwinding";
};

// ═══════════════════════════════════════════════════════════════
// INSTITUTIONAL (SMART MONEY) ANALYSIS ENGINE
// ═══════════════════════════════════════════════════════════════
function calcInstitutional(rows, spot, atm, pcr) {
  if (!rows.length) return null;

  const atmIdx = rows.findIndex((r) => r.strikePrice === atm);
  const nearATM = rows.filter((_, i) => Math.abs(i - atmIdx) <= 2);

  const totalCeOI = rows.reduce((s, r) => s + r.CE.openInterest, 0);
  const totalPeOI = rows.reduce((s, r) => s + r.PE.openInterest, 0);

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
    const nearness =
      Math.abs(idx - atmIdx) <= 3 ? "Near current price" : "Far from price";

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
            ? "Institutions selling Calls (Bearish wall)"
            : "Fresh Call buying (Bullish momentum)",
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
          r.PE.change <= 0
            ? "Institutions selling Puts (Bullish floor)"
            : "Fresh Put buying (Bearish pressure)",
        highConv: withVol,
        nearness,
      });
    }
  });
  const topSpikes = [...spikes].sort((a, b) => b.doi - a.doi).slice(0, 3);

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

  const rolls = [];
  for (let i = 1; i < rows.length; i++) {
    const prev = rows[i - 1],
      curr = rows[i];
    if (
      prev.CE.changeinOpenInterest < -avgCeDOI &&
      curr.CE.changeinOpenInterest > avgCeDOI
    )
      rolls.push({ from: prev.strikePrice, to: curr.strikePrice, side: "CE" });
    if (
      prev.PE.changeinOpenInterest < -avgPeDOI &&
      curr.PE.changeinOpenInterest > avgPeDOI
    )
      rolls.push({ from: prev.strikePrice, to: curr.strikePrice, side: "PE" });
  }

  const traps = [];
  rows.forEach((r) => {
    if (r.CE.changeinOpenInterest > avgCeDOI && r.CE.change > 0)
      traps.push({
        strike: r.strikePrice,
        side: "CE",
        msg: `Call sellers at ${r.strikePrice} are losing money — price rising against them`,
      });
    if (r.PE.changeinOpenInterest > avgPeDOI && r.PE.change > 0)
      traps.push({
        strike: r.strikePrice,
        side: "PE",
        msg: `Put sellers at ${r.strikePrice} are under pressure — watch for a reversal`,
      });
  });

  const highConvZones = [
    ...new Set(spikes.filter((s) => s.highConv).map((s) => s.strike)),
  ];
  const lowConvNoise = [
    ...new Set(spikes.filter((s) => !s.highConv).map((s) => s.strike)),
  ];

  const nearCeDOI = nearATM.reduce((s, r) => s + r.CE.changeinOpenInterest, 0);
  const nearPeDOI = nearATM.reduce((s, r) => s + r.PE.changeinOpenInterest, 0);

  const atmShiftRaw =
    nearPeDOI > nearCeDOI * 1.3
      ? "PE Dominant"
      : nearCeDOI > nearPeDOI * 1.3
        ? "CE Dominant"
        : "Balanced";

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
    if (s.type.includes("selling Calls") && s.highConv)
      signals.push({
        icon: "🔴",
        label: `Strong resistance at ${s.strike} — big players are capping the upside`,
        strike: s.strike,
        conf: "HIGH",
      });
    if (s.type.includes("selling Puts") && s.highConv)
      signals.push({
        icon: "🟢",
        label: `Strong support at ${s.strike} — big players are protecting the downside`,
        strike: s.strike,
        conf: "HIGH",
      });
    if (s.type.includes("selling Calls") && !s.highConv)
      signals.push({
        icon: "🟡",
        label: `Possible fake resistance at ${s.strike} — not backed by real volume`,
        strike: s.strike,
        conf: "LOW",
      });
    if (s.type.includes("selling Puts") && !s.highConv)
      signals.push({
        icon: "🟡",
        label: `Possible fake support at ${s.strike} — not backed by real volume`,
        strike: s.strike,
        conf: "LOW",
      });
  });
  rows.forEach((r) => {
    if (r.CE.changeinOpenInterest < -avgCeDOI && r.CE.change > 0)
      signals.push({
        icon: "⚡",
        label: `Sellers exiting at ${r.strikePrice} — price could move up quickly`,
        strike: r.strikePrice,
        conf: "MED",
      });
    if (r.PE.changeinOpenInterest < -avgPeDOI && r.PE.change < 0)
      signals.push({
        icon: "📉",
        label: `Buyers exiting at ${r.strikePrice} — downside risk increasing`,
        strike: r.strikePrice,
        conf: "MED",
      });
  });
  traps.forEach((t) =>
    signals.push({
      icon: "⚠️",
      label: `Avoid trading at ${t.strike} — conditions are unpredictable here`,
      strike: t.strike,
      conf: "TRAP",
    }),
  );
  const nearRes = topRes3[0];
  if (
    nearRes &&
    spot >= nearRes.strikePrice - 50 &&
    nearRes.CE.totalTradedVolume > nearRes.CE.openInterest * 0.05
  )
    signals.push({
      icon: "🚀",
      label: `Breakout possible above ${nearRes.strikePrice} — institutions are supporting the move`,
      strike: nearRes.strikePrice,
      conf: "HIGH",
    });

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

  const pcrBias = pcr > 1.2 ? 1 : pcr < 0.8 ? -1 : 0;
  const oiBias = nearPeDOI > nearCeDOI ? 1 : nearCeDOI > nearPeDOI ? -1 : 0;
  const closestRes = topRes3.length
    ? Math.min(...topRes3.map((r) => r.strikePrice))
    : Infinity;
  const closestSup = topSup3.length
    ? Math.max(...topSup3.map((r) => r.strikePrice))
    : 0;
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
    atmShift: atmShiftRaw,
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

// ═══════════════════════════════════════════════════════════════
// DIFF ENGINE
// ═══════════════════════════════════════════════════════════════
function fmtN(n) {
  if (!n && n !== 0) return "—";
  const abs = Math.abs(n);
  if (abs >= 100000) return `${(n / 100000).toFixed(1)}L`;
  if (abs >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

function diffInstitutional(prevRows, currRows, spot) {
  if (!prevRows?.length || !currRows?.length) return [];
  const alerts = [];
  const prevMap = {};
  prevRows.forEach((r) => {
    prevMap[r.strikePrice] = r;
  });

  const avgCePrev =
    prevRows.reduce((s, r) => s + Math.abs(r.CE.changeinOpenInterest), 0) /
    prevRows.length;
  const avgPePrev =
    prevRows.reduce((s, r) => s + Math.abs(r.PE.changeinOpenInterest), 0) /
    prevRows.length;
  const avgCeCurr =
    currRows.reduce((s, r) => s + Math.abs(r.CE.changeinOpenInterest), 0) /
    currRows.length;
  const avgPeCurr =
    currRows.reduce((s, r) => s + Math.abs(r.PE.changeinOpenInterest), 0) /
    currRows.length;

  currRows.forEach((curr) => {
    const strike = curr.strikePrice;
    const prev = prevMap[strike];

    const prevWasCeSpike = prev
      ? prev.CE.changeinOpenInterest > avgCePrev * 2
      : false;
    const currIsCeSpike = curr.CE.changeinOpenInterest > avgCeCurr * 2;
    const prevWasPeSpike = prev
      ? prev.PE.changeinOpenInterest > avgPePrev * 2
      : false;
    const currIsPeSpike = curr.PE.changeinOpenInterest > avgPeCurr * 2;

    if (!prevWasCeSpike && currIsCeSpike) {
      alerts.push({
        type: "NEW",
        strike,
        side: "CE",
        severity: "NEW",
        label: `New seller activity at ${strike} — ${curr.CE.change <= 0 ? "big players selling Calls (resistance building)" : "fresh Call buyers entering"}`,
        detail: `OI added: ${fmtN(curr.CE.changeinOpenInterest)} · Volume: ${fmtN(curr.CE.totalTradedVolume)} · Price: ₹${curr.CE.lastPrice}`,
        highConv: curr.CE.totalTradedVolume > curr.CE.openInterest * 0.04,
      });
    }
    if (!prevWasPeSpike && currIsPeSpike) {
      alerts.push({
        type: "NEW",
        strike,
        side: "PE",
        severity: "NEW",
        label: `New activity at ${strike} — ${curr.PE.change <= 0 ? "big players selling Puts (support building)" : "fresh Put buyers entering (bearish pressure)"}`,
        detail: `OI added: ${fmtN(curr.PE.changeinOpenInterest)} · Volume: ${fmtN(curr.PE.totalTradedVolume)} · Price: ₹${curr.PE.lastPrice}`,
        highConv: curr.PE.totalTradedVolume > curr.PE.openInterest * 0.04,
      });
    }
    if (
      prev &&
      prevWasCeSpike &&
      currIsCeSpike &&
      prev.CE.changeinOpenInterest > 0
    ) {
      const g =
        (curr.CE.changeinOpenInterest - prev.CE.changeinOpenInterest) /
        prev.CE.changeinOpenInterest;
      if (g > 0.5)
        alerts.push({
          type: "SURGE",
          strike,
          side: "CE",
          severity: "SURGE",
          label: `Resistance surging at ${strike} — sellers accelerating (+${(g * 100).toFixed(0)}% in 2 min)`,
          detail: `Was ${fmtN(prev.CE.changeinOpenInterest)} → Now ${fmtN(curr.CE.changeinOpenInterest)} · Institutional acceleration`,
          highConv: true,
        });
    }
    if (
      prev &&
      prevWasPeSpike &&
      currIsPeSpike &&
      prev.PE.changeinOpenInterest > 0
    ) {
      const g =
        (curr.PE.changeinOpenInterest - prev.PE.changeinOpenInterest) /
        prev.PE.changeinOpenInterest;
      if (g > 0.5)
        alerts.push({
          type: "SURGE",
          strike,
          side: "PE",
          severity: "SURGE",
          label: `Support surging at ${strike} — floor getting stronger (+${(g * 100).toFixed(0)}% in 2 min)`,
          detail: `Was ${fmtN(prev.PE.changeinOpenInterest)} → Now ${fmtN(curr.PE.changeinOpenInterest)} · Institutional acceleration`,
          highConv: true,
        });
    }

    const prevCeTrap = prev
      ? prev.CE.changeinOpenInterest > avgCePrev && prev.CE.change > 0
      : false;
    const currCeTrap =
      curr.CE.changeinOpenInterest > avgCeCurr && curr.CE.change > 0;
    if (!prevCeTrap && currCeTrap)
      alerts.push({
        type: "TRAP",
        strike,
        side: "CE",
        severity: "NEW",
        label: `Danger zone at ${strike} — Call sellers are losing, avoid trading here`,
        detail: `Sellers added positions but price is rising against them`,
        highConv: false,
      });
    const prevPeTrap = prev
      ? prev.PE.changeinOpenInterest > avgPePrev && prev.PE.change > 0
      : false;
    const currPeTrap =
      curr.PE.changeinOpenInterest > avgPeCurr && curr.PE.change > 0;
    if (!prevPeTrap && currPeTrap)
      alerts.push({
        type: "TRAP",
        strike,
        side: "PE",
        severity: "NEW",
        label: `Unstable zone at ${strike} — Put sellers under pressure, avoid trading here`,
        detail: `Put sellers added positions but price is moving against them`,
        highConv: false,
      });
  });

  // BUG FIX: ATM flip now uses real spot price instead of array midpoint index.
  const atmCurr = spot
    ? currRows.reduce((b, r) =>
        Math.abs(r.strikePrice - spot) < Math.abs(b.strikePrice - spot) ? r : b,
      )
    : currRows[Math.floor(currRows.length / 2)];
  const atmPrev = atmCurr && prevMap[atmCurr.strikePrice];

  if (atmPrev && atmCurr) {
    const dom = (r) =>
      r.PE.changeinOpenInterest > r.CE.changeinOpenInterest * 1.3
        ? "PE"
        : r.CE.changeinOpenInterest > r.PE.changeinOpenInterest * 1.3
          ? "CE"
          : "BAL";
    const prevDom = dom(atmPrev);
    const currDom = dom(atmCurr);
    if (prevDom !== currDom && currDom !== "BAL")
      alerts.push({
        type: "FLIP",
        strike: atmCurr.strikePrice,
        side: currDom,
        severity: "FLIP",
        label: `Sentiment shift at ${atmCurr.strikePrice} — ${currDom === "PE" ? "buyers protecting downside (bullish flip)" : "sellers capping upside (bearish flip)"}`,
        detail: `Was ${prevDom === "BAL" ? "Balanced" : prevDom === "PE" ? "downside protection" : "upside capping"} — big money changed sides`,
        highConv: true,
      });
  }

  const midSpot =
    spot || currRows[Math.floor(currRows.length / 2)]?.strikePrice || 0;

  const prevTopRes = [...prevRows]
    .filter((r) => r.strikePrice > midSpot)
    .sort((a, b) => b.CE.openInterest - a.CE.openInterest)[0];
  const currTopRes = [...currRows]
    .filter((r) => r.strikePrice > midSpot)
    .sort((a, b) => b.CE.openInterest - a.CE.openInterest)[0];
  if (
    prevTopRes &&
    currTopRes &&
    prevTopRes.strikePrice !== currTopRes.strikePrice
  )
    alerts.push({
      type: "WALL_SHIFT",
      strike: currTopRes.strikePrice,
      side: "CE",
      severity: "FLIP",
      label: `Resistance ceiling moved: ${prevTopRes.strikePrice} → ${currTopRes.strikePrice}`,
      detail: `Big sellers shifted their position — the upper barrier has changed`,
      highConv: true,
    });

  const prevTopSup = [...prevRows]
    .filter((r) => r.strikePrice < midSpot)
    .sort((a, b) => b.PE.openInterest - a.PE.openInterest)[0];
  const currTopSup = [...currRows]
    .filter((r) => r.strikePrice < midSpot)
    .sort((a, b) => b.PE.openInterest - a.PE.openInterest)[0];
  if (
    prevTopSup &&
    currTopSup &&
    prevTopSup.strikePrice !== currTopSup.strikePrice
  )
    alerts.push({
      type: "WALL_SHIFT",
      strike: currTopSup.strikePrice,
      side: "PE",
      severity: "FLIP",
      label: `Support floor moved: ${prevTopSup.strikePrice} → ${currTopSup.strikePrice}`,
      detail: `Big buyers shifted their position — the lower safety net has changed`,
      highConv: true,
    });

  return alerts;
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
  const labelMap = { HIGH: "HIGH", MED: "MEDIUM", LOW: "LOW", TRAP: "RISKY" };
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
      {labelMap[conf] || conf}
    </span>
  );
};

// ── unified signal → colour/icon helpers ─────────────────────
function sigMeta(rawSignal) {
  if (rawSignal === "BUY CALL")
    return { color: C.green, bg: C.greenBg, icon: "▲" };
  if (rawSignal === "BUY PUT") return { color: C.red, bg: C.redBg, icon: "▼" };
  return { color: C.yellow, bg: C.surface2, icon: "—" };
}

function InstitutionalPanel({ rows, prevRows, spot, atm, maxPain, pcr, sig }) {
  const inst = calcInstitutional(rows, spot, atm, pcr);
  const diffAlerts = useMemo(
    () => diffInstitutional(prevRows, rows, spot),
    [prevRows, rows, spot],
  );
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
    topRes,
    topSup,
  } = inst;

  const meta = sigMeta(sig?.rawSignal ?? "NO TRADE");
  const biasColor = meta.color;
  const biasBg = meta.bg;
  const biasIcon = meta.icon;

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
      {/* ── New Activity Diff Alerts ── */}
      {diffAlerts.length > 0 && (
        <div
          style={{
            background: "#130c00",
            border: "1px solid #ff7b0055",
            borderRadius: 10,
            padding: "12px 14px",
            marginBottom: 10,
          }}
        >
          <div
            style={{
              fontSize: 10,
              color: "#ff7b00",
              letterSpacing: 1,
              marginBottom: 10,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span style={{ fontSize: 13 }}>🔔</span>
            WHAT CHANGED IN THE LAST 2 MINUTES
          </div>
          {diffAlerts.map((a, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                padding: "7px 0",
                borderBottom:
                  i < diffAlerts.length - 1 ? "1px solid #ff7b0022" : "none",
              }}
            >
              <span style={{ fontSize: 13, flexShrink: 0, marginTop: 1 }}>
                {a.severity === "SURGE"
                  ? "🚨"
                  : a.type === "FLIP"
                    ? "🔄"
                    : a.type === "WALL_SHIFT"
                      ? "🧱"
                      : a.side === "CE"
                        ? "🔴"
                        : "🟢"}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: "#ff9a3c" }}>{a.label}</div>
                <div style={{ fontSize: 10, color: "#ff7b0088", marginTop: 2 }}>
                  {a.detail}
                </div>
              </div>
              <span
                style={{
                  fontSize: 9,
                  padding: "2px 7px",
                  borderRadius: 4,
                  fontWeight: 700,
                  letterSpacing: 0.5,
                  flexShrink: 0,
                  background:
                    a.severity === "SURGE"
                      ? "#3a0000"
                      : a.severity === "FLIP"
                        ? "#0d1e2e"
                        : "#1a0c00",
                  color:
                    a.severity === "SURGE"
                      ? C.red
                      : a.severity === "FLIP"
                        ? C.blue
                        : "#ff7b00",
                  border: `1px solid ${a.severity === "SURGE" ? C.red + "44" : a.severity === "FLIP" ? C.blue + "44" : "#ff7b0044"}`,
                }}
              >
                {a.severity === "SURGE"
                  ? "SURGING"
                  : a.severity === "FLIP"
                    ? "SHIFTED"
                    : "NEW"}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── Unified Signal Header (same as top banner) ── */}
      {card(
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              flexWrap: "wrap",
              marginBottom: 14,
            }}
          >
            <div
              style={{
                background: biasBg,
                border: `1px solid ${biasColor}44`,
                borderRadius: 8,
                padding: "10px 18px",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <span
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  color: biasColor,
                  letterSpacing: 0.5,
                }}
              >
                {biasIcon} {sig?.signal ?? "—"}
              </span>
            </div>
            <div>
              <div style={{ fontSize: 9, color: C.muted, marginBottom: 4 }}>
                SIGNAL STRENGTH
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div
                  style={{
                    width: 120,
                    height: 6,
                    background: C.border,
                    borderRadius: 3,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${sig?.strength ?? 0}%`,
                      height: "100%",
                      background:
                        (sig?.strength ?? 0) > 70
                          ? C.green
                          : (sig?.strength ?? 0) > 50
                            ? C.yellow
                            : C.muted,
                      borderRadius: 3,
                    }}
                  />
                </div>
                <span
                  style={{ color: biasColor, fontWeight: 700, fontSize: 14 }}
                >
                  {sig?.strength ?? 0}%
                </span>
                <span style={{ color: C.muted, fontSize: 10 }}>
                  {sig?.strengthLabel ?? ""}
                </span>
              </div>
              <div style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>
                This matches the signal shown in the top banner — both use the
                same analysis
              </div>
            </div>
          </div>

          {/* Why this signal — factor breakdown */}
          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
            <div
              style={{
                fontSize: 9,
                color: C.muted,
                letterSpacing: 1,
                marginBottom: 10,
                textTransform: "uppercase",
              }}
            >
              Why this signal — 5 factors analysed
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {[
                {
                  label: "Market Mood (PCR)",
                  value: pcrLabel(pcr),
                  detail: `PCR ${pcr.toFixed(2)}`,
                  vote: pcr > 1.2 ? "UP" : pcr < 0.8 ? "DOWN" : "NEUTRAL",
                  color: pcr > 1.2 ? C.green : pcr < 0.8 ? C.red : C.yellow,
                },
                {
                  label: "Near Price Activity",
                  value: atmShiftLabel(atmShift).split(" (")[0],
                  detail: "positions near current price",
                  vote:
                    atmShift === "PE Dominant"
                      ? "UP"
                      : atmShift === "CE Dominant"
                        ? "DOWN"
                        : "NEUTRAL",
                  color:
                    atmShift === "PE Dominant"
                      ? C.green
                      : atmShift === "CE Dominant"
                        ? C.red
                        : C.muted,
                },
                {
                  label: "Recent Trades",
                  value: sig?.oiChangeBias ?? "—",
                  detail: "OI change at ATM",
                  vote:
                    sig?.oiChangeBias === "New buying activity"
                      ? "UP"
                      : sig?.oiChangeBias === "New selling activity"
                        ? "DOWN"
                        : "NEUTRAL",
                  color:
                    sig?.oiChangeBias === "New buying activity"
                      ? C.green
                      : sig?.oiChangeBias === "New selling activity"
                        ? C.red
                        : C.yellow,
                },
                {
                  label: "Gap to Support",
                  value: sig ? `-${sig.distToSup} pts` : "—",
                  detail: "how far below floor is",
                  vote: sig && sig.distToSup < sig.distToRes ? "UP" : "DOWN",
                  color: sig && sig.distToSup < sig.distToRes ? C.green : C.red,
                },
                {
                  label: "Gap to Resistance",
                  value: sig ? `+${sig.distToRes} pts` : "—",
                  detail: "how far above ceiling is",
                  vote: sig && sig.distToRes > sig.distToSup ? "UP" : "DOWN",
                  color: sig && sig.distToRes > sig.distToSup ? C.green : C.red,
                },
              ].map(({ label, value, detail, vote, color }) => (
                <div
                  key={label}
                  style={{
                    flex: "1 1 140px",
                    background: C.bg,
                    border: `1px solid ${C.border}`,
                    borderRadius: 8,
                    padding: "8px 10px",
                  }}
                >
                  <div style={{ fontSize: 9, color: C.muted, marginBottom: 4 }}>
                    {label}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color }}>
                    {value}
                  </div>
                  <div style={{ fontSize: 9, color: C.muted, marginTop: 2 }}>
                    {detail}
                  </div>
                  <div
                    style={{
                      marginTop: 5,
                      display: "inline-block",
                      padding: "1px 7px",
                      borderRadius: 3,
                      fontSize: 9,
                      fontWeight: 700,
                      background:
                        vote === "UP"
                          ? C.greenBg
                          : vote === "DOWN"
                            ? C.redBg
                            : C.surface2,
                      color:
                        vote === "UP"
                          ? C.green
                          : vote === "DOWN"
                            ? C.red
                            : C.yellow,
                      border: `1px solid ${vote === "UP" ? C.green + "40" : vote === "DOWN" ? C.red + "40" : C.yellow + "40"}`,
                    }}
                  >
                    {vote === "UP"
                      ? "▲ Bullish vote"
                      : vote === "DOWN"
                        ? "▼ Bearish vote"
                        : "— Neutral"}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Key levels */}
          <div
            style={{
              display: "flex",
              gap: 16,
              flexWrap: "wrap",
              marginTop: 12,
              paddingTop: 12,
              borderTop: `1px solid ${C.border}`,
            }}
          >
            {[
              {
                l: "Max Pain",
                v: maxPain,
                c: C.yellow,
                sub: "where price is pulled at expiry",
              },
              {
                l: "Big Moves Detected",
                v: topSpikes.length,
                c: C.blue,
                sub: "institutional spikes",
              },
              {
                l: "Danger Zones",
                v: traps.length,
                c: traps.length > 0 ? "#ff7b00" : C.muted,
                sub: "strikes to avoid",
              },
            ].map(({ l, v, c, sub }) => (
              <div key={l} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 9, color: C.muted }}>{l}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: c }}>
                  {v}
                </div>
                <div style={{ fontSize: 9, color: C.muted }}>{sub}</div>
              </div>
            ))}
          </div>
        </div>,
      )}

      {/* ── Support / Resistance Zones ── */}
      <div
        style={{ display: "flex", gap: 10, marginBottom: 10, flexWrap: "wrap" }}
      >
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
          <div
            style={{
              fontSize: 10,
              color: C.green,
              letterSpacing: 1,
              marginBottom: 8,
            }}
          >
            ▲ SUPPORT LEVELS — Price floor below current price
          </div>
          <div style={{ fontSize: 9, color: `${C.green}88`, marginBottom: 6 }}>
            Big players have placed large Put positions here — these act as
            cushions
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
              <span style={{ color: C.muted, fontSize: 10 }}>
                No support found below price
              </span>
            )}
          </div>
          {topSup.length > 0 && (
            <div style={{ fontSize: 10, color: `${C.green}88`, marginTop: 6 }}>
              Total size:{" "}
              {fmt(topSup.reduce((s, r) => s + r.PE.openInterest, 0))} (
              {(
                (topSup.reduce((s, r) => s + r.PE.openInterest, 0) /
                  (totalPeOI || 1)) *
                100
              ).toFixed(1)}
              % of all Put positions)
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
          <div
            style={{
              fontSize: 10,
              color: C.red,
              letterSpacing: 1,
              marginBottom: 8,
            }}
          >
            ▼ RESISTANCE LEVELS — Price ceiling above current price
          </div>
          <div style={{ fontSize: 9, color: `${C.red}88`, marginBottom: 6 }}>
            Big players have placed large Call positions here — these act as
            barriers
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
              <span style={{ color: C.muted, fontSize: 10 }}>
                No resistance found above price
              </span>
            )}
          </div>
          {topRes.length > 0 && (
            <div style={{ fontSize: 10, color: `${C.red}88`, marginTop: 6 }}>
              Total size:{" "}
              {fmt(topRes.reduce((s, r) => s + r.CE.openInterest, 0))} (
              {(
                (topRes.reduce((s, r) => s + r.CE.openInterest, 0) /
                  (totalCeOI || 1)) *
                100
              ).toFixed(1)}
              % of all Call positions)
            </div>
          )}
        </div>
      </div>

      {/* ── Top Institutional Spikes ── */}
      {card(
        <>
          {cardTitle("Biggest Position Changes (Where Big Money Moved)", "🔥")}
          {topSpikes.length === 0 ? (
            <div style={{ fontSize: 11, color: C.muted }}>
              No unusually large position changes detected.
            </div>
          ) : (
            topSpikes.map((s, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  padding: "8px 0",
                  borderBottom:
                    i < topSpikes.length - 1 ? `1px solid ${C.border}` : "none",
                }}
              >
                <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>
                  {s.side === "CE" ? "🔴" : "🟢"}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: C.text }}>{s.type}</div>
                  <div style={{ fontSize: 10, color: C.blue, marginTop: 2 }}>
                    Strike {s.strike} · {s.side === "CE" ? "Call" : "Put"} ·
                    Positions added: {fmt(s.doi)} · Volume: {fmt(s.vol)} ·
                    Price: ₹{s.ltp}
                    {s.chg !== undefined && (
                      <span style={{ color: s.chg >= 0 ? C.green : C.red }}>
                        {" "}
                        ({s.chg > 0 ? "+" : ""}
                        {typeof s.chg === "number" ? s.chg.toFixed(1) : s.chg}%)
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
                      ? "✓ Confirmed by trading volume — likely a genuine institutional move"
                      : "⚠ Low trading volume — could be a passive or misleading entry"}
                  </div>
                  <div style={{ fontSize: 9, color: C.muted, marginTop: 1 }}>
                    {s.nearness} ·{" "}
                    {clusters.some((c) => c.includes(s.strike))
                      ? "Part of a cluster of positions"
                      : "Isolated position"}
                  </div>
                </div>
                <IBadge conf={s.highConv ? "HIGH" : "LOW"} />
              </div>
            ))
          )}
        </>,
      )}

      {/* ── Institutional Signals ── */}
      {signals.length > 0 &&
        card(
          <>
            {cardTitle("What This Means for You", "⚡")}
            {signals.map((s, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "7px 0",
                  borderBottom:
                    i < signals.length - 1 ? `1px solid ${C.border}` : "none",
                }}
              >
                <span style={{ fontSize: 13, flexShrink: 0 }}>{s.icon}</span>
                <div style={{ flex: 1, fontSize: 12, color: C.text }}>
                  {s.label}
                </div>
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
          </>,
        )}

      {/* ── Trap Signals ── */}
      {traps.length > 0 &&
        card(
          <>
            {cardTitle("⚠ Zones to Avoid Trading", "⚠️")}
            {traps.map((t, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  padding: "7px 0",
                  borderBottom:
                    i < traps.length - 1 ? `1px solid ${C.border}` : "none",
                }}
              >
                <span style={{ fontSize: 13, flexShrink: 0, color: "#ff7b00" }}>
                  ⚠️
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: "#ff7b00" }}>{t.msg}</div>
                  <div
                    style={{ fontSize: 10, color: "#ff7b0088", marginTop: 2 }}
                  >
                    Avoid entering new trades at this strike — conditions are
                    unstable
                  </div>
                </div>
                <IBadge conf="TRAP" />
              </div>
            ))}
          </>,
          { border: `1px solid #ff7b0033` },
        )}

      {/* ── Position Rolls ── */}
      {rolls.length > 0 &&
        card(
          <>
            {cardTitle("Positions Being Moved (Rollovers)", "🔄")}
            <div style={{ fontSize: 10, color: C.muted, marginBottom: 8 }}>
              Big players are closing their position at one strike and reopening
              at another
            </div>
            {rolls.map((r, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "6px 0",
                  borderBottom:
                    i < rolls.length - 1 ? `1px solid ${C.border}` : "none",
                }}
              >
                <span style={{ fontSize: 12, color: C.purple }}>↔</span>
                <div style={{ flex: 1, fontSize: 12, color: C.text }}>
                  {r.side === "CE" ? "Call" : "Put"} position moved from{" "}
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
                  ROLLOVER
                </span>
              </div>
            ))}
          </>,
        )}

      {/* ── Volume Conviction Zones ── */}
      {card(
        <>
          {cardTitle("Volume Check — Real vs Noise", "📊")}
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 140 }}>
              <div style={{ fontSize: 9, color: C.green, marginBottom: 5 }}>
                ✓ REAL MOVES — Volume confirms the position
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
                  <span style={{ fontSize: 10, color: C.muted }}>
                    None detected
                  </span>
                )}
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 140 }}>
              <div style={{ fontSize: 9, color: C.muted, marginBottom: 5 }}>
                ⚠ POSSIBLE NOISE — Position without matching volume
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
        </>,
      )}

      {/* ── OI Concentration ── */}
      {card(
        <>
          {cardTitle("Where the Money Is Concentrated", "📈")}
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 140 }}>
              <div style={{ fontSize: 10, color: C.red, marginBottom: 6 }}>
                Top Call positions — {concCe.toFixed(1)}% of all Calls are here
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
                    <span style={{ color: C.text }}>
                      Strike {r.strikePrice}
                    </span>
                    <span style={{ color: C.red }}>
                      {fmt(r.CE.openInterest)}
                    </span>
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
                Top Put positions — {concPe.toFixed(1)}% of all Puts are here
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
                    <span style={{ color: C.text }}>
                      Strike {r.strikePrice}
                    </span>
                    <span style={{ color: C.green }}>
                      {fmt(r.PE.openInterest)}
                    </span>
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
                label: "Call Positions (Net)",
                val: rows.reduce((s, r) => s + r.CE.changeinOpenInterest, 0),
                up: "More Calls being added — sellers expect a ceiling",
                dn: "Calls being removed — resistance weakening",
                upC: C.red,
                dnC: C.green,
              },
              {
                label: "Put Positions (Net)",
                val: rows.reduce((s, r) => s + r.PE.changeinOpenInterest, 0),
                up: "More Puts being added — buyers building a floor",
                dn: "Puts being removed — support weakening",
                upC: C.green,
                dnC: C.red,
              },
            ].map(({ label, val, up, dn, upC, dnC }) => (
              <div key={label} style={{ flex: 1, minWidth: 140 }}>
                <div style={{ fontSize: 9, color: C.muted, marginBottom: 3 }}>
                  {label}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: val >= 0 ? upC : dnC,
                  }}
                >
                  {val >= 0 ? "+" : ""}
                  {fmt(val)}
                </div>
                <div style={{ fontSize: 10, color: val >= 0 ? upC : dnC }}>
                  {val >= 0 ? up : dn}
                </div>
              </div>
            ))}
          </div>
        </>,
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
  }[sig.rawSignal] || { color: C.muted, bg: C.surface, icon: "—" };

  const pcrColor =
    parseFloat(sig.pcr) > 1.2
      ? C.green
      : parseFloat(sig.pcr) < 0.8
        ? C.red
        : C.yellow;

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
            fontSize: 20,
            fontWeight: 800,
            color: meta.color,
            letterSpacing: 1,
          }}
        >
          {meta.icon} {sig.signal}
        </span>
        <div>
          <div style={{ fontSize: 10, color: C.muted }}>Signal Strength</div>
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
              {sig.strength}%
            </span>
            <span style={{ color: C.muted, fontSize: 10 }}>
              {sig.strengthLabel}
            </span>
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
        {[
          { l: "Current Price", v: spot?.toFixed(1), c: C.text },
          { l: "ATM Strike", v: atm, c: C.blue },
          { l: "Max Pain", v: maxPain, c: C.yellow },
          { l: "PCR", v: sig.pcr, c: pcrColor, sub: sig.pcrBias },
          { l: "Gap to Resistance", v: `+${sig.distToRes}`, c: C.red },
          { l: "Gap to Support", v: `-${sig.distToSup}`, c: C.green },
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
          ▲ SUPPORT — Price floor (strong Put positions below)
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
              No data below price
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
          ▼ RESISTANCE — Price ceiling (strong Call positions above)
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
              No data above price
            </span>
          )}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ fontSize: 9, color: C.muted }}>RECENT ACTIVITY</div>
        <span
          style={{
            color:
              sig.oiChangeBias === "New buying activity"
                ? C.green
                : sig.oiChangeBias === "New selling activity"
                  ? C.red
                  : C.yellow,
            fontWeight: 700,
            fontSize: 12,
          }}
        >
          {sig.oiChangeBias}
        </span>
        <div style={{ fontSize: 9, color: C.muted }}>OVERALL MOOD (PCR)</div>
        <span
          style={{
            color:
              parseFloat(sig.pcr) > 1.2
                ? C.green
                : parseFloat(sig.pcr) < 0.8
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

const REFRESH_MS = 120_000;

function getMarketStatusLabel() {
  if (isHoliday()) return { open: false, label: "Holiday" };
  if (isMarketOpen()) return { open: true, label: "Market open · live" };
  return { open: false, label: "Market closed" };
}

async function fetchOptionChain(instrument) {
  const isIndex = instrument.type === "index";
  const apiName = isIndex ? "F&O" : "optionChain";
  const json = await getNSEData(apiName, instrument.symbol);

  if (isIndex) {
    const rec = json.records ?? json;
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

  return {
    timestamp: json.timestamp ?? new Date().toLocaleString("en-IN"),
    underlyingValue: json.data?.[0]?.underlyingValue ?? 0,
    data: json.data ?? [],
  };
}

// ═══════════════════════════════════════════════════════════════
// SEED DATA & useOptionChain hook
// ═══════════════════════════════════════════════════════════════
const SEED_DATA = {
  NIFTY: INDEX_DATA,
  MAZDOCK: STOCK_DATA,
};

// FIX #5 (Race Condition): Track the latest request ID so stale responses
// from slow/overlapping fetches are discarded instead of overwriting fresh data.
function useOptionChain(instrument) {
  const [rawData, setRawData] = useState(
    () => SEED_DATA[instrument.symbol] ?? null,
  );
  const [prevRawData, setPrevRawData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fetchedAt, setFetchedAt] = useState(null);
  const [mktStatus, setMktStatus] = useState(() => getMarketStatusLabel());
  const closedFetchDone = useRef(false);
  const latestRequestRef = useRef(0); // FIX #5: replaces AbortController pattern

  const load = useCallback(async (inst, resetPrev = false) => {
    const requestId = Date.now();
    latestRequestRef.current = requestId;

    if (resetPrev) {
      setRawData(SEED_DATA[inst.symbol] ?? null);
      setPrevRawData(null);
      closedFetchDone.current = false;
    }
    setLoading(true);
    setError(null);

    try {
      const data = await fetchOptionChain(inst);
      // FIX #5: Discard response if a newer request has since been issued
      if (latestRequestRef.current !== requestId) return;
      setRawData((cur) => {
        if (cur && cur !== SEED_DATA[inst.symbol] && cur.timestamp) {
          setPrevRawData(cur);
        }
        return data;
      });
      setFetchedAt(Date.now());
      setError(null);
    } catch (err) {
      if (latestRequestRef.current !== requestId) return;
      setError(err.message ?? "Failed to fetch option chain");
    } finally {
      // Only clear loading spinner if this is still the latest request
      if (latestRequestRef.current === requestId) setLoading(false);
    }
  }, []);

  useEffect(() => {
    closedFetchDone.current = !isMarketOpen();
    load(instrument, true);
  }, [instrument, load]);

  useEffect(() => {
    const tick = () => {
      const status = getMarketStatusLabel();
      setMktStatus(status);
      if (isMarketOpen()) {
        closedFetchDone.current = false;
        load(instrument);
      } else if (!closedFetchDone.current) {
        closedFetchDone.current = true;
        load(instrument);
      }
    };
    const id = setInterval(tick, REFRESH_MS);
    return () => clearInterval(id);
  }, [instrument, load]);

  useEffect(() => {
    const id = setInterval(() => setMktStatus(getMarketStatusLabel()), 60_000);
    return () => clearInterval(id);
  }, []);

  const retry = useCallback(() => load(instrument), [instrument, load]);
  return { rawData, prevRawData, loading, error, fetchedAt, retry, mktStatus };
}

// ═══════════════════════════════════════════════════════════════
// LOADING SKELETON
// BUG FIX: bar() accepted only 3 params but was called with 4 (extra index arg).
// Removed the stray 4th argument from all call sites.
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
          {[60, 60, 60].map((w, i) => (
            <div key={i}>{bar(w, 22, 4)}</div>
          ))}
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
          {[60, 60, 60].map((w, i) => (
            <div key={i}>{bar(w, 22, 4)}</div>
          ))}
        </div>
      </div>
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
        Could not load data for {instrument.symbol}
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
        ↺ Try Again
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// COUNTDOWN TIMER
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
        {secs > 0 ? `next refresh in ${secs}s` : "refreshing…"}
      </span>
    </div>
  );
}

function BreakoutPanel({ signals, spot, fetchedAt }) {
  if (!signals?.length) {
    return (
      <div
        style={{
          background: "#0d1117",
          border: "1px solid #21262d",
          borderRadius: 10,
          padding: "14px 16px",
          marginBottom: 10,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <span style={{ fontSize: 18 }}>🔍</span>
        <div>
          <div style={{ fontSize: 12, color: "#8b949e" }}>
            No breakout signals detected right now
          </div>
          <div style={{ fontSize: 10, color: "#8b949e", marginTop: 2 }}>
            The engine scans on every 2-min refresh. Signals appear when OI
            imbalances, wall shifts, or momentum patterns are detected.
          </div>
        </div>
      </div>
    );
  }

  const topSignal = signals[0];
  const meta = breakoutSignalMeta(topSignal.type);

  return (
    <div
      style={{
        border: `1px solid ${meta.border}`,
        borderRadius: 10,
        overflow: "hidden",
        marginBottom: 10,
      }}
    >
      {/* Header bar */}
      <div
        style={{
          background: meta.bg,
          padding: "10px 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          flexWrap: "wrap",
          borderBottom: `1px solid ${meta.border}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }}>{meta.icon}</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: meta.color }}>
              {topSignal.title}
            </div>
            <div style={{ fontSize: 10, color: "#8b949e", marginTop: 2 }}>
              {topSignal.detail}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 9, color: "#8b949e", marginBottom: 3 }}>
              SIGNAL STRENGTH
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div
                style={{
                  width: 80,
                  height: 5,
                  background: "#21262d",
                  borderRadius: 3,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${topSignal.strength}%`,
                    height: "100%",
                    background: meta.color,
                    borderRadius: 3,
                  }}
                />
              </div>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: meta.color,
                }}
              >
                {topSignal.strength}%
              </span>
            </div>
          </div>
          <span
            style={{
              padding: "3px 10px",
              borderRadius: 5,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 0.5,
              background: meta.bg,
              color: meta.color,
              border: `1px solid ${meta.border}`,
            }}
          >
            {meta.label}
          </span>
        </div>
      </div>

      {/* Secondary signals */}
      {signals.length > 1 && (
        <div style={{ background: "#161b22" }}>
          {signals.slice(1).map((sig, i) => {
            const sm = breakoutSignalMeta(sig.type);
            return (
              <div
                key={sig.id}
                style={{
                  padding: "9px 14px",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  borderBottom:
                    i < signals.length - 2 ? "1px solid #21262d" : "none",
                }}
              >
                <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>
                  {sm.icon}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{ fontSize: 11, color: sm.color, fontWeight: 600 }}
                  >
                    {sig.title}
                  </div>
                  <div style={{ fontSize: 10, color: "#8b949e", marginTop: 2 }}>
                    {sig.detail}
                  </div>
                  {sig.strike && (
                    <div
                      style={{
                        display: "inline-block",
                        marginTop: 4,
                        padding: "1px 7px",
                        borderRadius: 3,
                        fontSize: 9,
                        background: sm.bg,
                        color: sm.color,
                        border: `1px solid ${sm.border}`,
                      }}
                    >
                      Strike {sig.strike}
                    </div>
                  )}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      width: 50,
                      height: 4,
                      background: "#21262d",
                      borderRadius: 2,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${sig.strength}%`,
                        height: "100%",
                        background: sm.color,
                        borderRadius: 2,
                      }}
                    />
                  </div>
                  <span style={{ fontSize: 10, color: sm.color }}>
                    {sig.strength}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer */}
      <div
        style={{
          background: "#0d1117",
          padding: "6px 14px",
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          alignItems: "center",
          borderTop: "1px solid #21262d",
        }}
      >
        <span style={{ fontSize: 9, color: "#8b949e" }}>Sources:</span>
        {[...new Set(signals.map((s) => s.source))].map((src) => (
          <span
            key={src}
            style={{
              fontSize: 9,
              background: "#1c2128",
              color: "#8b949e",
              padding: "1px 6px",
              borderRadius: 3,
              border: "1px solid #30363d",
            }}
          >
            {src}
          </span>
        ))}
        {fetchedAt && (
          <span style={{ fontSize: 9, color: "#8b949e", marginLeft: "auto" }}>
            Last scan:{" "}
            {new Date(fetchedAt).toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </span>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════
export default function App({ initialData = null, initialSymbol = null }) {
  const defaultInstrument = initialSymbol ?? FO_LIST[0];
  const [instrument, setInstrument] = useState(defaultInstrument);
  const [scalpMode, setScalpMode] = useState(false);
  const [activeTab, setActiveTab] = useState("oi");
  const [selectedExpiry, setSelectedExpiry] = useState(null);
  const snapshotHistoryRef = useRef([]);

  const isIndex = instrument.type === "index";

  const { rawData, prevRawData, loading, error, fetchedAt, retry, mktStatus } =
    useOptionChain(instrument);

  useEffect(() => {
    setSelectedExpiry(null);
    setActiveTab("oi");
  }, [instrument]);

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

  const atm = useMemo(
    () => (rows.length ? findATM(rows, underlyingValue) : 0),
    [rows, underlyingValue],
  );

  // FIX #10 (PCR Calculation Inconsistency): For stocks, always use the full
  // unfiltered chain for PCR, not just the display window. This ensures PCR
  // is consistent regardless of scalp-mode range or expiry filtering.
  const pcr = useMemo(() => {
    if (isIndex) return calcPCRFull(rawData?.fullOI);
    const allRows = parseStockChain(rawData, selectedExpiry).rows;
    return calcPCR(allRows);
  }, [isIndex, rawData, selectedExpiry]);

  // FIX #15 (Error Boundaries): Wrap max pain calculation in try-catch to
  // prevent a crash on malformed or empty data from taking down the whole app.
  const maxPain = useMemo(() => {
    try {
      return isIndex
        ? calcMaxPainFull(rawData?.fullOI)
        : rows.length
          ? calcMaxPain(rows)
          : 0;
    } catch (e) {
      console.error("MaxPain calc failed:", e);
      return 0;
    }
  }, [isIndex, rawData, rows]);

  const sig = useMemo(
    () =>
      rows.length ? generateSignal(rows, atm, pcr, underlyingValue) : null,
    [rows, atm, pcr, underlyingValue],
  );

  const range = scalpMode ? (isIndex ? 200 : 100) : isIndex ? 1500 : 600;
  const displayRows = useMemo(
    () => rows.filter((r) => Math.abs(r.strikePrice - atm) <= range),
    [rows, atm, range],
  );

  const prevRows = useMemo(() => {
    if (!prevRawData) return [];
    if (isIndex) return parseIndexChain(prevRawData);
    return parseStockChain(prevRawData, selectedExpiry).rows;
  }, [isIndex, prevRawData, selectedExpiry]);

  const prevDisplayRows = useMemo(
    () => prevRows.filter((r) => Math.abs(r.strikePrice - atm) <= range),
    [prevRows, atm, range],
  );

  // FIX #8 (Chart Data Recomputation): Removed `sig` from chartData dependencies.
  // `isSup` and `isRes` are computed inline in Cell renders using the `sig` ref
  // directly — this avoids recomputing the full chart dataset when only the
  // signal changes, while still reflecting the latest support/resistance.
  const chartData = useMemo(
    () =>
      displayRows.map((r) => ({
        strike: r.strikePrice,
        "Call OI": r.CE.openInterest,
        "Put OI": r.PE.openInterest,
        "CE ΔOI": r.CE.changeinOpenInterest,
        "PE ΔOI": r.PE.changeinOpenInterest,
        isATM: r.strikePrice === atm,
      })),
    [displayRows, atm], // FIX #8: removed `sig` — Cell renders compute isSup/isRes live
  );

  // FIX #3 (Stale Snapshot Push): Guard against pushing a duplicate snapshot
  // when rows reference changes but data is identical (common on React re-renders
  // between 2-min API refreshes).
  useEffect(() => {
    if (!rows.length || !underlyingValue) return;

    const lastSnapshot = snapshotHistoryRef.current[snapshotHistoryRef.current.length - 1];
    const key = `${rows.length}-${rows[0]?.strikePrice}-${underlyingValue}-${pcr}`;
    const lastKey = lastSnapshot
      ? `${lastSnapshot.rows.length}-${lastSnapshot.rows[0]?.strikePrice}-${lastSnapshot.spot}-${lastSnapshot.pcr}`
      : null;

    if (key === lastKey) return; // Skip identical snapshots

    snapshotHistoryRef.current = pushSnapshot(snapshotHistoryRef.current, {
      rows,
      spot: underlyingValue,
      atm,
      pcr,
      ts: Date.now(),
    });
  }, [rows, underlyingValue, atm, pcr]);

  // Reset history when symbol changes
  useEffect(() => {
    snapshotHistoryRef.current = [];
  }, [instrument, activeExpiry]);

  const currentSnapshot = useMemo(
    () =>
      !rows.length || !underlyingValue
        ? null
        : {
            rows,
            spot: underlyingValue,
            atm,
            pcr,
            ts: Date.now(),
            contractKey: `${instrument.symbol}:${activeExpiry ?? "index"}`,
          },
    [rows, underlyingValue, atm, pcr, instrument.symbol, activeExpiry],
  );

  const breakoutSignals = useMemo(() => {
    if (!displayRows.length || !underlyingValue || !currentSnapshot) return [];
    const base = snapshotHistoryRef.current.filter(
      (s) => s.contractKey === currentSnapshot.contractKey,
    );
    const snapshots = pushSnapshot(base, currentSnapshot);
    const prev = snapshots.length >= 2 ? snapshots[snapshots.length - 2] : null;

    return detectBreakouts({
      rows: displayRows,
      prevRows: prev?.rows ?? prevDisplayRows,
      spot: underlyingValue,
      prevSpot: prev?.spot ?? 0,
      pcr,
      maxPain,
      snapshots,
    });
  }, [
    displayRows,
    underlyingValue,
    pcr,
    maxPain,
    prevDisplayRows,
    currentSnapshot,
  ]);

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
              ⚡ {scalpMode ? "NEARBY ONLY" : "NEARBY STRIKES"}
            </button>

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
              }}
            >
              ↺
            </button>

            <div style={{ marginLeft: "auto" }}>
              {loading ? (
                <span style={{ fontSize: 10, color: C.blue }}>● Loading…</span>
              ) : fetchedAt ? (
                <RefreshCountdown fetchedAt={fetchedAt} />
              ) : null}
            </div>
          </div>

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
              Lot size: <b style={{ color: C.text }}>{instrument.lot}</b>
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
                Expiry: {activeExpiry}
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
                Showing ±{isIndex ? 200 : 100} points from current price
              </span>
            )}
          </div>
        </div>

        {error && (
          <ErrorPanel error={error} onRetry={retry} instrument={instrument} />
        )}
        {loading && !rawData && <LoadingSkeleton />}

        {rawData && (
          <>
            {sig && (
              <SignalBanner
                sig={sig}
                atm={atm}
                maxPain={maxPain}
                spot={underlyingValue}
              />
            )}
            {sig && <ZoneBadges sig={sig} />}

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
              <Tab id="doi" label="ΔOI Activity" />
              <Tab id="table" label="Strike Table" />
              <Tab id="inst" label="🧠 Smart Money" />
              <Tab
                id="breakout"
                label={`⚡ Breakouts${breakoutSignals.length ? ` (${breakoutSignals.length})` : ""}`}
              />
              {!isIndex && <Tab id="expiry" label="All Expiries" />}
            </div>

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

              {/* OI Chart — FIX #8: isSup/isRes computed live in Cell, not from chartData */}
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
                    Call vs Put open positions · ATM (nearest strike):{" "}
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
                        label={{
                          value: "Max Pain",
                          fill: C.yellow,
                          fontSize: 9,
                        }}
                      />
                      <Bar dataKey="Call OI">
                        {chartData.map((e, i) => {
                          const isRes = sig?.topResistance.includes(e.strike);
                          return (
                            <Cell
                              key={i}
                              fill={
                                isRes ? C.red : e.isATM ? "#ff7b72" : "#3a1a1a"
                              }
                              opacity={isRes ? 1 : 0.75}
                            />
                          );
                        })}
                      </Bar>
                      <Bar dataKey="Put OI">
                        {chartData.map((e, i) => {
                          const isSup = sig?.topSupport.includes(e.strike);
                          return (
                            <Cell
                              key={i}
                              fill={
                                isSup
                                  ? C.green
                                  : e.isATM
                                    ? "#56d364"
                                    : C.greenBg
                              }
                              opacity={isSup ? 1 : 0.75}
                            />
                          );
                        })}
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
                    Change in open positions since yesterday · Positive = new
                    positions added
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
                            ⚡ High Activity Strikes
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
                                {r["PE ΔOI"] > r["CE ΔOI"]
                                  ? "🟢 Puts active"
                                  : "🔴 Calls active"}
                              </span>
                            ))}
                          </div>
                        </div>
                      )
                    );
                  })()}
                </div>
              )}

              {/* Strike Table */}
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
                      minWidth: 600,
                    }}
                  >
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                        {[
                          "Call OI",
                          "Call ΔOI",
                          "Call Price",
                          "STRIKE",
                          "Put OI",
                          "Put ΔOI",
                          "Put Price",
                          "What's Happening",
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
                        const buCE = buildupType(r, "CE");
                        const buLabel = buildupLabel(buCE);
                        const buC =
                          buCE === "Long Build-up"
                            ? C.green
                            : buCE === "Short Build-up"
                              ? C.red
                              : buCE === "Short Covering"
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
                              ₹{r.CE.lastPrice}
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
                              ₹{r.PE.lastPrice}
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
                              {buLabel}
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
                  prevRows={prevDisplayRows}
                  spot={underlyingValue}
                  atm={atm}
                  maxPain={maxPain}
                  pcr={pcr}
                  sig={sig}
                />
              )}

              {activeTab === "breakout" && (
                <BreakoutPanel
                  signals={breakoutSignals}
                  spot={underlyingValue}
                  fetchedAt={fetchedAt}
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
                    Sentiment & open positions across all expiry dates ·{" "}
                    {instrument.symbol}
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
                                Call OI
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
                                Put OI
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
                                Mood
                              </div>
                              <div
                                style={{
                                  color: pc,
                                  fontSize: 12,
                                  fontWeight: 700,
                                }}
                              >
                                {pcrLabel(parseFloat(pcrV))}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ marginTop: 8, fontSize: 10, color: C.muted }}>
                    Click any expiry card to load its full analysis
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
                Symbol: <b style={{ color: C.text }}>{instrument.symbol}</b>
              </span>
              <span>·</span>
              <span>
                Lot size: <b style={{ color: C.text }}>{instrument.lot}</b>
              </span>
              <span>·</span>
              <span>
                ATM: <b style={{ color: C.blue }}>{atm || "—"}</b>
              </span>
              <span>·</span>
              <span>
                Max Pain: <b style={{ color: C.yellow }}>{maxPain || "—"}</b>
              </span>
              <span>·</span>
              <span>
                Market mood (PCR):{" "}
                <b
                  style={{
                    color:
                      parseFloat(sig?.pcr) > 1.2
                        ? C.green
                        : parseFloat(sig?.pcr) < 0.8
                          ? C.red
                          : C.yellow,
                  }}
                >
                  {sig ? pcrLabel(parseFloat(sig.pcr)) : "—"}
                </b>
              </span>
              <span
                style={{
                  marginLeft: "auto",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {timestamp}
                <span
                  style={{
                    padding: "1px 7px",
                    borderRadius: 4,
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: 0.5,
                    background: mktStatus?.open ? "#0d2a16" : "#1c2128",
                    color: mktStatus?.open ? "#3fb950" : "#8b949e",
                    border: `1px solid ${mktStatus?.open ? "#3fb95044" : "#30363d"}`,
                  }}
                >
                  {mktStatus?.label ?? "—"}
                </span>
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
