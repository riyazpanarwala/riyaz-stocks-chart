// ═══════════════════════════════════════════════════════════════
// INSTITUTIONAL (SMART MONEY) ANALYSIS ENGINE  (pure functions)
// ═══════════════════════════════════════════════════════════════
import { fmtN } from "./formatters.js";

/**
 * @typedef {import("./parsers.js").OptionRow} OptionRow
 */

// ─── Helpers ──────────────────────────────────────────────────

function avgAbsDelta(rows, side) {
  if (!rows.length) return 0;
  return rows.reduce((s, r) => s + Math.abs(r[side].changeinOpenInterest), 0) / rows.length;
}

// ─── Main analysis ────────────────────────────────────────────

/**
 * Full institutional analysis of a snapshot.
 * Returns null if rows is empty.
 *
 * @param {OptionRow[]} rows
 * @param {number}      spot
 * @param {number}      atm    ATM strike
 * @param {number}      pcr
 * @returns {object|null}
 */
export function calcInstitutional(rows, spot, atm, pcr) {
  if (!rows.length) return null;

  const atmIdx = rows.findIndex((r) => r.strikePrice === atm);

  // findIndex returns -1 when the ATM strike isn't in the filtered row set
  // (e.g. scalp-mode cut it off).  Math.abs(i - (-1)) <= 2 would incorrectly
  // match indices 0 and 1.  Fall back to the closest strike by price instead.
  const safeAtmIdx = atmIdx !== -1
    ? atmIdx
    : rows.reduce(
      (bi, r, i) =>
        Math.abs(r.strikePrice - atm) < Math.abs(rows[bi].strikePrice - atm)
          ? i
          : bi,
      0,
    );

  const nearATM = rows.filter((_, i) => Math.abs(i - safeAtmIdx) <= 2);

  const totalCeOI = rows.reduce((s, r) => s + r.CE.openInterest, 0);
  const totalPeOI = rows.reduce((s, r) => s + r.PE.openInterest, 0);

  const avgCeDOI = avgAbsDelta(rows, "CE");
  const avgPeDOI = avgAbsDelta(rows, "PE");

  // ── Spikes ────────────────────────────────────────────────
  const spikes = [];
  rows.forEach((r, idx) => {
    const nearness = Math.abs(idx - safeAtmIdx) <= 3 ? "Near current price" : "Far from price";

    const pushSpike = (side, doi, leg, typeMsg) => {
      const withVol = leg.totalTradedVolume > leg.openInterest * 0.04;
      spikes.push({
        strike: r.strikePrice, side, doi,
        vol: leg.totalTradedVolume,
        ltp: leg.lastPrice,
        chg: leg.change,
        type: typeMsg,
        highConv: withVol,
        nearness,
      });
    };

    if (r.CE.changeinOpenInterest > avgCeDOI * 2 && r.CE.changeinOpenInterest > 0)
      pushSpike("CE", r.CE.changeinOpenInterest, r.CE,
        r.CE.change <= 0 ? "Institutions selling Calls (Bearish wall)" : "Fresh Call buying (Bullish momentum)");

    if (r.PE.changeinOpenInterest > avgPeDOI * 2 && r.PE.changeinOpenInterest > 0)
      pushSpike("PE", r.PE.changeinOpenInterest, r.PE,
        r.PE.change <= 0 ? "Institutions selling Puts (Bullish floor)" : "Fresh Put buying (Bearish pressure)");
  });

  const topSpikes = [...spikes].sort((a, b) => b.doi - a.doi).slice(0, 3);

  // ── Clusters ──────────────────────────────────────────────
  const sortedSpikeStrikes = [...new Set(spikes.map((s) => s.strike))].sort((a, b) => a - b);
  const clusters = [];
  let cur = [];
  for (const s of sortedSpikeStrikes) {
    if (!cur.length || s - cur[cur.length - 1] <= 100) { cur.push(s); }
    else { if (cur.length >= 2) clusters.push([...cur]); cur = [s]; }
  }
  if (cur.length >= 2) clusters.push(cur);

  // ── Rolls ─────────────────────────────────────────────────
  const rolls = [];
  for (let i = 1; i < rows.length; i++) {
    const prev = rows[i - 1], curr = rows[i];
    if (prev.CE.changeinOpenInterest < -avgCeDOI && curr.CE.changeinOpenInterest > avgCeDOI)
      rolls.push({ from: prev.strikePrice, to: curr.strikePrice, side: "CE" });
    if (prev.PE.changeinOpenInterest < -avgPeDOI && curr.PE.changeinOpenInterest > avgPeDOI)
      rolls.push({ from: prev.strikePrice, to: curr.strikePrice, side: "PE" });
  }

  // ── Traps ─────────────────────────────────────────────────
  const traps = [];
  rows.forEach((r) => {
    if (r.CE.changeinOpenInterest > avgCeDOI && r.CE.change > 0)
      traps.push({
        strike: r.strikePrice, side: "CE",
        msg: `Call sellers at ${r.strikePrice} are losing money — price rising against them`
      });
    if (r.PE.changeinOpenInterest > avgPeDOI && r.PE.change > 0)
      traps.push({
        strike: r.strikePrice, side: "PE",
        msg: `Put sellers at ${r.strikePrice} are under pressure — watch for a reversal`
      });
  });

  // ── Conviction zones ─────────────────────────────────────
  const highConvZones = [...new Set(spikes.filter((s) => s.highConv).map((s) => s.strike))];
  const lowConvNoise = [...new Set(spikes.filter((s) => !s.highConv).map((s) => s.strike))];

  // ── ATM shift ─────────────────────────────────────────────
  const nearCeDOI = nearATM.reduce((s, r) => s + r.CE.changeinOpenInterest, 0);
  const nearPeDOI = nearATM.reduce((s, r) => s + r.PE.changeinOpenInterest, 0);
  const atmShift = nearPeDOI > nearCeDOI * 1.3 ? "PE Dominant"
    : nearCeDOI > nearPeDOI * 1.3 ? "CE Dominant"
      : "Balanced";

  // ── Smart-money signals ───────────────────────────────────
  const aboveSpot = rows.filter((r) => r.strikePrice > spot);
  const belowSpot = rows.filter((r) => r.strikePrice < spot);
  const topRes3 = [...aboveSpot].sort((a, b) => b.CE.openInterest - a.CE.openInterest).slice(0, 3);
  const topSup3 = [...belowSpot].sort((a, b) => b.PE.openInterest - a.PE.openInterest).slice(0, 3);

  const signals = [];
  spikes.forEach((s) => {
    if (s.type.includes("selling Calls") && s.highConv)
      signals.push({ icon: "🔴", label: `Strong resistance at ${s.strike} — big players are capping the upside`, strike: s.strike, conf: "HIGH" });
    if (s.type.includes("selling Puts") && s.highConv)
      signals.push({ icon: "🟢", label: `Strong support at ${s.strike} — big players are protecting the downside`, strike: s.strike, conf: "HIGH" });
    if (s.type.includes("selling Calls") && !s.highConv)
      signals.push({ icon: "🟡", label: `Possible fake resistance at ${s.strike} — not backed by real volume`, strike: s.strike, conf: "LOW" });
    if (s.type.includes("selling Puts") && !s.highConv)
      signals.push({ icon: "🟡", label: `Possible fake support at ${s.strike} — not backed by real volume`, strike: s.strike, conf: "LOW" });
  });
  rows.forEach((r) => {
    if (r.CE.changeinOpenInterest < -avgCeDOI && r.CE.change > 0)
      signals.push({ icon: "⚡", label: `Sellers exiting at ${r.strikePrice} — price could move up quickly`, strike: r.strikePrice, conf: "MED" });
    if (r.PE.changeinOpenInterest < -avgPeDOI && r.PE.change < 0)
      signals.push({ icon: "📉", label: `Buyers exiting at ${r.strikePrice} — downside risk increasing`, strike: r.strikePrice, conf: "MED" });
  });
  traps.forEach((t) =>
    signals.push({ icon: "⚠️", label: `Avoid trading at ${t.strike} — conditions are unpredictable here`, strike: t.strike, conf: "TRAP" }));

  const nearRes = topRes3[0];
  if (nearRes && spot >= nearRes.strikePrice - 50 && nearRes.CE.totalTradedVolume > nearRes.CE.openInterest * 0.05)
    signals.push({ icon: "🚀", label: `Breakout possible above ${nearRes.strikePrice} — institutions are supporting the move`, strike: nearRes.strikePrice, conf: "HIGH" });

  // ── OI concentration ─────────────────────────────────────
  const top3Ce = [...rows].sort((a, b) => b.CE.openInterest - a.CE.openInterest).slice(0, 3);
  const top3Pe = [...rows].sort((a, b) => b.PE.openInterest - a.PE.openInterest).slice(0, 3);
  const concCe = totalCeOI > 0 ? (top3Ce.reduce((s, r) => s + r.CE.openInterest, 0) / totalCeOI) * 100 : 0;
  const concPe = totalPeOI > 0 ? (top3Pe.reduce((s, r) => s + r.PE.openInterest, 0) / totalPeOI) * 100 : 0;

  // ── Smart bias ────────────────────────────────────────────
  const pcrBias = pcr > 1.2 ? 1 : pcr < 0.8 ? -1 : 0;
  const oiBias = nearPeDOI > nearCeDOI ? 1 : nearCeDOI > nearPeDOI ? -1 : 0;
  const closestRes = topRes3.length ? Math.min(...topRes3.map((r) => r.strikePrice)) : null;
  const closestSup = topSup3.length ? Math.max(...topSup3.map((r) => r.strikePrice)) : null;
  const zoneBias =
    closestRes == null || closestSup == null
      ? 0
      : spot - closestSup < closestRes - spot ? 1 : -1;

  const totalBias = pcrBias + oiBias + zoneBias;
  const smartBias = totalBias >= 2 ? "BULLISH" : totalBias <= -2 ? "BEARISH" : "NEUTRAL";

  return {
    topSpikes, clusters, rolls, traps,
    highConvZones, lowConvNoise,
    atmShift,
    signals: signals.slice(0, 10),
    top3Ce, top3Pe, concCe, concPe,
    totalCeOI, totalPeOI,
    smartBias,
    topRes: topRes3,
    topSup: topSup3,
    pcr,
  };
}

// ─── Diff alerts ─────────────────────────────────────────────

/**
 * Diff two consecutive snapshots and return change-alerts.
 *
 * @param {OptionRow[]} prevRows
 * @param {OptionRow[]} currRows
 * @param {number}      spot
 * @returns {object[]}
 */
export function diffInstitutional(prevRows, currRows, spot) {
  if (!prevRows?.length || !currRows?.length) return [];

  const prevMap = Object.fromEntries(prevRows.map((r) => [r.strikePrice, r]));
  const alerts = [];

  const avgCePrev = avgAbsDelta(prevRows, "CE");
  const avgPePrev = avgAbsDelta(prevRows, "PE");
  const avgCeCurr = avgAbsDelta(currRows, "CE");
  const avgPeCurr = avgAbsDelta(currRows, "PE");

  currRows.forEach((curr) => {
    const { strikePrice: strike } = curr;
    const prev = prevMap[strike];

    const wasSpike = (side, avgPrev) => prev ? prev[side].changeinOpenInterest > avgPrev * 2 : false;
    const isSpike = (side, avgCurr) => curr[side].changeinOpenInterest > avgCurr * 2;

    // ── New spikes ───────────────────────────────────────
    const checkNewSpike = (side, avgP, avgC) => {
      const prevDoi = prev?.[side].changeinOpenInterest ?? 0;
      if (!wasSpike(side, avgP) && isSpike(side, avgC) && curr[side].changeinOpenInterest > prevDoi) {
        const leg = curr[side];
        const isCe = side === "CE";
        alerts.push({
          type: "NEW", strike, side, severity: "NEW",
          label: isCe
            ? `New seller activity at ${strike} — ${leg.change <= 0 ? "big players selling Calls (resistance building)" : "fresh Call buyers entering"}`
            : `New activity at ${strike} — ${leg.change <= 0 ? "big players selling Puts (support building)" : "fresh Put buyers entering (bearish pressure)"}`,
          detail: `OI added: ${fmtN(leg.changeinOpenInterest)} · Volume: ${fmtN(leg.totalTradedVolume)} · Price: ₹${leg.lastPrice}`,
          highConv: leg.totalTradedVolume > leg.openInterest * 0.04,
        });
      }
    };
    checkNewSpike("CE", avgCePrev, avgCeCurr);
    checkNewSpike("PE", avgPePrev, avgPeCurr);

    // ── Accelerating spikes ──────────────────────────────
    const checkSurge = (side, avgP, avgC) => {
      if (!prev) return;
      if (wasSpike(side, avgP) && isSpike(side, avgC) && prev[side].changeinOpenInterest > 0) {
        const growth = (curr[side].changeinOpenInterest - prev[side].changeinOpenInterest) / prev[side].changeinOpenInterest;
        if (growth > 0.5) {
          const isCe = side === "CE";
          alerts.push({
            type: "SURGE", strike, side, severity: "SURGE",
            label: isCe
              ? `Resistance surging at ${strike} — sellers accelerating (+${(growth * 100).toFixed(0)}% in 2 min)`
              : `Support surging at ${strike} — floor getting stronger (+${(growth * 100).toFixed(0)}% in 2 min)`,
            detail: `Was ${fmtN(prev[side].changeinOpenInterest)} → Now ${fmtN(curr[side].changeinOpenInterest)} · Institutional acceleration`,
            highConv: true,
          });
        }
      }
    };
    checkSurge("CE", avgCePrev, avgCeCurr);
    checkSurge("PE", avgPePrev, avgPeCurr);

    // ── Traps ────────────────────────────────────────────
    const checkTrap = (side, avgP, avgC, isCe) => {
      const prevTrap = prev ? (prev[side].changeinOpenInterest > avgP && prev[side].change > 0) : false;
      const currTrap = curr[side].changeinOpenInterest > avgC && curr[side].change > 0;
      const prevDoi = prev?.[side].changeinOpenInterest ?? 0;
      const prevChange = prev?.[side].change ?? 0;
      if (!prevTrap && currTrap && curr[side].changeinOpenInterest > prevDoi && curr[side].change > prevChange)
        alerts.push({
          type: "TRAP", strike, side, severity: "NEW",
          label: isCe
            ? `Danger zone at ${strike} — Call sellers are losing, avoid trading here`
            : `Unstable zone at ${strike} — Put sellers under pressure, avoid trading here`,
          detail: isCe
            ? "Sellers added positions but price is rising against them"
            : "Put sellers added positions but price is moving against them",
          highConv: false,
        });
    };
    checkTrap("CE", avgCePrev, avgCeCurr, true);
    checkTrap("PE", avgPePrev, avgPeCurr, false);
  });

  // ── ATM sentiment flip ────────────────────────────────
  const atmCurr = spot
    ? currRows.reduce((b, r) => Math.abs(r.strikePrice - spot) < Math.abs(b.strikePrice - spot) ? r : b)
    : currRows[Math.floor(currRows.length / 2)];
  const atmPrev = atmCurr && prevMap[atmCurr.strikePrice];

  if (atmPrev && atmCurr) {
    const dom = (r) => r.PE.changeinOpenInterest > r.CE.changeinOpenInterest * 1.3 ? "PE"
      : r.CE.changeinOpenInterest > r.PE.changeinOpenInterest * 1.3 ? "CE"
        : "BAL";
    const prevDom = dom(atmPrev);
    const currDom = dom(atmCurr);
    if (prevDom !== currDom && currDom !== "BAL") {
      const humanPrev = prevDom === "BAL" ? "Balanced" : prevDom === "PE" ? "downside protection" : "upside capping";
      alerts.push({
        type: "FLIP", strike: atmCurr.strikePrice, side: currDom, severity: "FLIP",
        label: `Sentiment shift at ${atmCurr.strikePrice} — ${currDom === "PE" ? "buyers protecting downside (bullish flip)" : "sellers capping upside (bearish flip)"}`,
        detail: `Was ${humanPrev} — big money changed sides`,
        highConv: true,
      });
    }
  }

  // ── Wall shifts ──────────────────────────────────────
  const midSpot = spot || currRows[Math.floor(currRows.length / 2)]?.strikePrice || 0;

  const shiftAlert = (aboveSpot, side, humanDir) => {
    const prevTop = [...prevRows].filter((r) => aboveSpot ? r.strikePrice > midSpot : r.strikePrice < midSpot)
      .sort((a, b) => b[side].openInterest - a[side].openInterest)[0];
    const currTop = [...currRows].filter((r) => aboveSpot ? r.strikePrice > midSpot : r.strikePrice < midSpot)
      .sort((a, b) => b[side].openInterest - a[side].openInterest)[0];
    if (prevTop && currTop && prevTop.strikePrice !== currTop.strikePrice)
      alerts.push({
        type: "WALL_SHIFT", strike: currTop.strikePrice, side, severity: "FLIP",
        label: `${humanDir} moved: ${prevTop.strikePrice} → ${currTop.strikePrice}`,
        detail: `Big ${side === "CE" ? "sellers" : "buyers"} shifted their position — the ${side === "CE" ? "upper barrier" : "lower safety net"} has changed`,
        highConv: true,
      });
  };

  shiftAlert(true, "CE", "Resistance ceiling");
  shiftAlert(false, "PE", "Support floor");

  return alerts;
}
