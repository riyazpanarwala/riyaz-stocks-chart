// ═══════════════════════════════════════════════════════════════
// OPTION SPOT CANDLESTICK CHART WITH OPTION CHAIN LEVEL OVERLAYS
// Displays underlying spot price action with dynamic barriers:
// - Call OI Resistance Wall (Ceiling)
// - Put OI Support Wall (Floor)
// - Max Pain Target Strike
// - At-The-Money (ATM) Strike
// - Straddle Expected Expiry Range Band
// ═══════════════════════════════════════════════════════════════
"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { C } from "../constants.js";
import { getFinanceDataAction } from "../../../app/actions/finance.js";

/**
 * Resolves the Yahoo Finance symbol for an instrument.
 * @param {object} instrument - Instrument from FO_LIST
 * @returns {string} Yahoo Finance ticker
 */
function resolveYahooTicker(instrument) {
  if (!instrument?.symbol) return "^NSEI";
  const sym = instrument.symbol.toUpperCase();
  const INDEX_MAP = {
    NIFTY: "^NSEI",
    BANKNIFTY: "^NSEBANK",
    FINNIFTY: "NIFTY_FIN_SERVICE.NS",
    MIDCPNIFTY: "NIFTY_MID_SELECT.NS",
    NIFTYNXT50: "NIFTY_NEXT_50.NS",
  };
  if (INDEX_MAP[sym]) return INDEX_MAP[sym];
  return `${sym}.NS`;
}

/**
 * Formats timestamps nicely for X-axis labels.
 */
function formatTimeLabel(dateStr, interval) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return String(dateStr).slice(0, 10);

  if (interval === "1d") {
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
  }
  return d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Kolkata",
  });
}

function formatTooltipDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Kolkata",
  });
}

const INTERVAL_CONFIGS = [
  { id: "5m", label: "5m Intraday", days: 3 },
  { id: "15m", label: "15m Intraday", days: 7 },
  { id: "1h", label: "1h Hourly", days: 30 },
  { id: "1d", label: "1D Daily", days: 120 },
];

export const OptionSpotChart = React.memo(function OptionSpotChart({
  instrument,
  spot = 0,
  atm = 0,
  maxPain = 0,
  sig = null,
  straddleInfo = null,
}) {
  const [interval, setIntervalState] = useState("15m");
  const [candles, setCandles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hoverIdx, setHoverIdx] = useState(null);

  // Overlay visibility toggles
  const [showRes, setShowRes] = useState(true);
  const [showSup, setShowSup] = useState(true);
  const [showMaxPain, setShowMaxPain] = useState(true);
  const [showAtm, setShowAtm] = useState(true);
  const [showRange, setShowRange] = useState(true);

  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 900, height: 420 });

  // Handle container resizing
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        if (width > 200) {
          setDimensions((prev) => ({
            ...prev,
            width: Math.floor(width),
          }));
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const requestSeqRef = useRef(0);

  // Fetch candles
  const fetchCandles = useCallback(async () => {
    const seq = ++requestSeqRef.current;
    setLoading(true);
    setError(null);
    try {
      const ticker = resolveYahooTicker(instrument);
      const conf = INTERVAL_CONFIGS.find((c) => c.id === interval) || INTERVAL_CONFIGS[1];
      const fromDate = new Date(Date.now() - conf.days * 24 * 3600 * 1000)
        .toISOString()
        .split("T")[0];

      const res = await getFinanceDataAction({
        symbol: ticker,
        interval,
        fromDate,
      });

      if (seq !== requestSeqRef.current) return;

      if (!res || res.error || !Array.isArray(res)) {
        throw new Error(res?.error || "No candlestick data available for this symbol");
      }

      // Filter invalid candles and ensure ascending chronological order
      const valid = res.filter(
        (c) =>
          c &&
          Number.isFinite(c.open) &&
          Number.isFinite(c.high) &&
          Number.isFinite(c.low) &&
          Number.isFinite(c.close)
      );

      if (valid.length === 0) {
        throw new Error("No candlestick data available for this symbol");
      }

      valid.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      setCandles(valid);
      setHoverIdx(valid.length > 0 ? valid.length - 1 : null);
    } catch (err) {
      if (seq !== requestSeqRef.current) return;
      console.error("[OptionSpotChart] Candle fetch failed:", err);
      setCandles([]);
      setHoverIdx(null);
      setError(err.message || "Failed to load candlestick chart");
    } finally {
      if (seq === requestSeqRef.current) {
        setLoading(false);
      }
    }
  }, [instrument, interval]);

  useEffect(() => {
    fetchCandles();
  }, [fetchCandles]);

  // Key option levels
  const resStrike = sig?.topResistance?.[0] ?? null;
  const supStrike = sig?.topSupport?.[0] ?? null;
  const rangeHigh = straddleInfo?.expectedUpper ?? null;
  const rangeLow = straddleInfo?.expectedLower ?? null;

  // Chart layout geometry
  const padding = { top: 25, right: 90, bottom: 65, left: 15 };
  const plotWidth = Math.max(100, dimensions.width - padding.left - padding.right);
  const plotHeight = Math.max(100, dimensions.height - padding.top - padding.bottom);
  const volumeHeight = Math.min(65, plotHeight * 0.22);
  const pricePlotHeight = plotHeight - volumeHeight - 12;

  // Compute Scales
  const { minPrice, maxPrice, maxVol, priceToY, volToY, indexToX } = useMemo(() => {
    if (!candles.length) {
      return {
        minPrice: 0,
        maxPrice: 100,
        maxVol: 1,
        priceToY: () => 0,
        volToY: () => 0,
        indexToX: () => 0,
      };
    }

    let min = Math.min(...candles.map((c) => c.low));
    let max = Math.max(...candles.map((c) => c.high));
    const mVol = Math.max(...candles.map((c) => c.volume || 0), 1);

    // Expand min/max bounds to encompass visible option levels so lines are never clipped
    const levelsToInclude = [];
    if (showRes && resStrike) levelsToInclude.push(resStrike);
    if (showSup && supStrike) levelsToInclude.push(supStrike);
    if (showMaxPain && maxPain) levelsToInclude.push(maxPain);
    if (showAtm && atm) levelsToInclude.push(atm);
    if (showRange && rangeHigh) levelsToInclude.push(rangeHigh);
    if (showRange && rangeLow) levelsToInclude.push(rangeLow);

    // Also include current spot if known
    if (spot > 0) levelsToInclude.push(spot);

    for (const lvl of levelsToInclude) {
      if (Number.isFinite(lvl) && lvl > 0) {
        min = Math.min(min, lvl);
        max = Math.max(max, lvl);
      }
    }

    const priceSpan = max - min || 1;
    const paddedMin = min - priceSpan * 0.04;
    const paddedMax = max + priceSpan * 0.04;

    const pToY = (p) => {
      const clamped = Math.max(paddedMin, Math.min(paddedMax, p));
      return padding.top + (1 - (clamped - paddedMin) / (paddedMax - paddedMin)) * pricePlotHeight;
    };

    const vToY = (v) => {
      const ratio = Math.min(1, Math.max(0, v / mVol));
      const baseY = padding.top + pricePlotHeight + 12 + volumeHeight;
      return baseY - ratio * volumeHeight;
    };

    const count = candles.length;
    const step = count > 1 ? plotWidth / count : plotWidth;
    const iToX = (idx) => padding.left + (idx + 0.5) * step;

    return {
      minPrice: paddedMin,
      maxPrice: paddedMax,
      maxVol: mVol,
      priceToY: pToY,
      volToY: vToY,
      indexToX: iToX,
    };
  }, [
    candles,
    showRes,
    resStrike,
    showSup,
    supStrike,
    showMaxPain,
    maxPain,
    showAtm,
    atm,
    showRange,
    rangeHigh,
    rangeLow,
    spot,
    plotWidth,
    pricePlotHeight,
    volumeHeight,
    padding.top,
    padding.left,
  ]);

  // Generate nice price grid ticks (5-6 ticks)
  const priceTicks = useMemo(() => {
    if (minPrice >= maxPrice) return [];
    const span = maxPrice - minPrice;
    const rawStep = span / 5;
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const normalized = rawStep / magnitude;
    let step;
    if (normalized < 1.5) step = 1 * magnitude;
    else if (normalized < 3.5) step = 2 * magnitude;
    else if (normalized < 7.5) step = 5 * magnitude;
    else step = 10 * magnitude;

    const ticks = [];
    let start = Math.ceil(minPrice / step) * step;
    while (start <= maxPrice) {
      ticks.push(start);
      start += step;
    }
    return ticks;
  }, [minPrice, maxPrice]);

  // Generate time ticks (every N candles)
  const timeTicks = useMemo(() => {
    if (!candles.length) return [];
    const count = candles.length;
    const targetTicks = Math.min(count, Math.max(3, Math.floor(plotWidth / 90)));
    const stride = Math.max(1, Math.floor(count / targetTicks));
    const ticks = [];
    for (let i = 0; i < count; i += stride) {
      ticks.push({ index: i, date: candles[i].date });
    }
    return ticks;
  }, [candles, plotWidth]);

  // Candle width based on count
  const candleWidth = useMemo(() => {
    if (!candles.length) return 4;
    const step = plotWidth / candles.length;
    return Math.max(2, Math.min(16, step * 0.7));
  }, [candles.length, plotWidth]);

  // Handle pointer tracking
  const handlePointerMove = (e) => {
    if (!candles.length || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - padding.left;
    if (x < 0 || x > plotWidth) return;
    const step = plotWidth / candles.length;
    const idx = Math.min(candles.length - 1, Math.max(0, Math.floor(x / step)));
    setHoverIdx(idx);
  };

  const handlePointerLeave = () => {
    if (candles.length > 0) {
      setHoverIdx(candles.length - 1);
    }
  };

  const activeCandle = hoverIdx != null && candles[hoverIdx] ? candles[hoverIdx] : null;
  const prevCandle = hoverIdx != null && hoverIdx > 0 ? candles[hoverIdx - 1] : null;
  const candleChange = activeCandle && prevCandle
    ? activeCandle.close - prevCandle.close
    : 0;
  const candleChangePct = prevCandle && prevCandle.close
    ? (candleChange / prevCandle.close) * 100
    : 0;

  // Distance metrics
  const activeSpot = activeCandle?.close ?? spot;
  const distToRes = resStrike && activeSpot ? resStrike - activeSpot : null;
  const distToSup = supStrike && activeSpot ? activeSpot - supStrike : null;

  return (
    <div
      style={{
        background: C.surface,
        borderRadius: 10,
        padding: "12px 14px",
        marginBottom: 12,
        border: `1px solid ${C.border}`,
        position: "relative",
      }}
    >
      {/* ── Top Bar: Title, Spot & Timeframe controls ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 10,
          marginBottom: 10,
          borderBottom: `1px solid ${C.surface2}`,
          paddingBottom: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: C.text }}>
            🕯️ {instrument.symbol} Spot Candlestick Chart
          </span>
          {activeCandle && (
            <span style={{ fontSize: 15, fontWeight: 700, color: C.text }}>
              ₹{activeCandle.close.toLocaleString("en-IN", { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
            </span>
          )}
          {prevCandle && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: candleChange >= 0 ? C.green : C.red,
              }}
            >
              {candleChange >= 0 ? "+" : ""}
              {candleChange.toFixed(1)} ({candleChange >= 0 ? "+" : ""}
              {candleChangePct.toFixed(2)}%)
            </span>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          {INTERVAL_CONFIGS.map((c) => (
            <button
              key={c.id}
              onClick={() => setIntervalState(c.id)}
              style={{
                padding: "3px 9px",
                borderRadius: 4,
                border: `1px solid ${interval === c.id ? C.blue : C.border}`,
                background: interval === c.id ? "#14253d" : "transparent",
                color: interval === c.id ? C.blue : C.muted,
                fontFamily: "'IBM Plex Mono',monospace",
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {c.label.split(" ")[0]}
            </button>
          ))}

          <button
            onClick={fetchCandles}
            disabled={loading}
            title="Refresh candles"
            style={{
              padding: "3px 8px",
              borderRadius: 4,
              border: `1px solid ${C.border}`,
              background: "transparent",
              color: loading ? C.muted : C.text,
              cursor: loading ? "not-allowed" : "pointer",
              fontFamily: "'IBM Plex Mono',monospace",
              fontSize: 12,
            }}
          >
            ↺
          </button>
        </div>
      </div>

      {/* ── Overlay Level Toggles ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          flexWrap: "wrap",
          marginBottom: 10,
          fontSize: 10,
        }}
      >
        <span style={{ color: C.muted, marginRight: 2 }}>Overlays:</span>

        {resStrike && (
          <button
            onClick={() => setShowRes((s) => !s)}
            style={{
              padding: "2px 8px",
              borderRadius: 4,
              cursor: "pointer",
              background: showRes ? "#2a0d0d" : "transparent",
              border: `1px solid ${showRes ? C.red : C.border}`,
              color: showRes ? C.red : C.muted,
              fontSize: 10,
              fontWeight: 600,
            }}
          >
            {showRes ? "✓ " : ""}🔴 Ceiling ({resStrike})
          </button>
        )}

        {supStrike && (
          <button
            onClick={() => setShowSup((s) => !s)}
            style={{
              padding: "2px 8px",
              borderRadius: 4,
              cursor: "pointer",
              background: showSup ? "#0d2a16" : "transparent",
              border: `1px solid ${showSup ? C.green : C.border}`,
              color: showSup ? C.green : C.muted,
              fontSize: 10,
              fontWeight: 600,
            }}
          >
            {showSup ? "✓ " : ""}🟢 Floor ({supStrike})
          </button>
        )}

        {maxPain > 0 && (
          <button
            onClick={() => setShowMaxPain((s) => !s)}
            style={{
              padding: "2px 8px",
              borderRadius: 4,
              cursor: "pointer",
              background: showMaxPain ? "#2d2200" : "transparent",
              border: `1px solid ${showMaxPain ? C.yellow : C.border}`,
              color: showMaxPain ? C.yellow : C.muted,
              fontSize: 10,
              fontWeight: 600,
            }}
          >
            {showMaxPain ? "✓ " : ""}🟡 Max Pain ({maxPain})
          </button>
        )}

        {atm > 0 && (
          <button
            onClick={() => setShowAtm((s) => !s)}
            style={{
              padding: "2px 8px",
              borderRadius: 4,
              cursor: "pointer",
              background: showAtm ? "#14253d" : "transparent",
              border: `1px solid ${showAtm ? C.blue : C.border}`,
              color: showAtm ? C.blue : C.muted,
              fontSize: 10,
              fontWeight: 600,
            }}
          >
            {showAtm ? "✓ " : ""}🔵 ATM ({atm})
          </button>
        )}

        {rangeHigh && rangeLow && (
          <button
            onClick={() => setShowRange((s) => !s)}
            style={{
              padding: "2px 8px",
              borderRadius: 4,
              cursor: "pointer",
              background: showRange ? "#20122e" : "transparent",
              border: `1px solid ${showRange ? C.purple : C.border}`,
              color: showRange ? C.purple : C.muted,
              fontSize: 10,
              fontWeight: 600,
            }}
          >
            {showRange ? "✓ " : ""}🟣 Expected Range ({rangeLow}–{rangeHigh})
          </button>
        )}
      </div>

      {/* ── Floating OHLC Inspector ── */}
      {activeCandle && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
            background: C.surface2,
            border: `1px solid ${C.border}`,
            borderRadius: 6,
            padding: "5px 10px",
            marginBottom: 8,
            fontSize: 10,
            color: C.muted,
          }}
        >
          <span>
            Time: <b style={{ color: C.text }}>{formatTooltipDate(activeCandle.date)}</b>
          </span>
          <span>
            O: <b style={{ color: C.text }}>{activeCandle.open.toFixed(1)}</b>
          </span>
          <span>
            H: <b style={{ color: C.green }}>{activeCandle.high.toFixed(1)}</b>
          </span>
          <span>
            L: <b style={{ color: C.red }}>{activeCandle.low.toFixed(1)}</b>
          </span>
          <span>
            C: <b style={{ color: activeCandle.close >= activeCandle.open ? C.green : C.red }}>{activeCandle.close.toFixed(1)}</b>
          </span>
          {activeCandle.volume > 0 && (
            <span>
              Vol: <b style={{ color: C.text }}>{(activeCandle.volume / 1000).toFixed(0)}K</b>
            </span>
          )}

          {distToRes != null && (
            <span style={{ marginLeft: "auto", color: C.red }}>
              Gap to Ceiling: <b>+{Math.round(distToRes)} pts</b>
            </span>
          )}
          {distToSup != null && (
            <span style={{ color: C.green }}>
              Gap to Floor: <b>-{Math.round(distToSup)} pts</b>
            </span>
          )}
        </div>
      )}

      {/* ── Main Chart Canvas Area ── */}
      <div
        ref={containerRef}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        style={{
          width: "100%",
          height: dimensions.height,
          position: "relative",
          userSelect: "none",
          cursor: "crosshair",
        }}
      >
        {loading && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: `${C.surface}bb`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 10,
              backdropFilter: "blur(2px)",
            }}
          >
            <span style={{ color: C.blue, fontSize: 12 }}>● Loading candlestick data…</span>
          </div>
        )}

        {error && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: C.surface,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              zIndex: 10,
            }}
          >
            <span style={{ color: C.red, fontSize: 12 }}>⚠️ {error}</span>
            <button
              onClick={fetchCandles}
              style={{
                padding: "4px 12px",
                borderRadius: 5,
                background: C.surface2,
                border: `1px solid ${C.border}`,
                color: C.text,
                fontSize: 11,
                cursor: "pointer",
              }}
            >
              Retry
            </button>
          </div>
        )}

        {candles.length > 0 && (
          <svg
            width="100%"
            height={dimensions.height}
            viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
            style={{ display: "block" }}
          >
            <defs>
              <linearGradient id="rangeBandGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={C.purple} stopOpacity="0.12" />
                <stop offset="100%" stopColor={C.purple} stopOpacity="0.04" />
              </linearGradient>
            </defs>

            {/* ── Background & Price Grid Lines ── */}
            {priceTicks.map((p) => {
              const y = priceToY(p);
              return (
                <g key={`price-${p}`}>
                  <line
                    x1={padding.left}
                    y1={y}
                    x2={padding.left + plotWidth}
                    y2={y}
                    stroke={C.surface2}
                    strokeWidth={1}
                    strokeDasharray="2 3"
                  />
                  <text
                    x={padding.left + plotWidth + 6}
                    y={y + 3}
                    fill={C.muted}
                    fontSize={9}
                    fontFamily="'IBM Plex Mono',monospace"
                  >
                    {p.toLocaleString("en-IN")}
                  </text>
                </g>
              );
            })}

            {/* ── Time Grid Lines ── */}
            {timeTicks.map((t) => {
              const x = indexToX(t.index);
              return (
                <g key={`time-${t.index}`}>
                  <line
                    x1={x}
                    y1={padding.top}
                    x2={x}
                    y2={padding.top + plotHeight}
                    stroke={C.surface2}
                    strokeWidth={1}
                    strokeDasharray="2 3"
                  />
                  <text
                    x={x}
                    y={padding.top + plotHeight + 16}
                    fill={C.muted}
                    fontSize={9}
                    textAnchor="middle"
                    fontFamily="'IBM Plex Mono',monospace"
                  >
                    {formatTimeLabel(t.date, interval)}
                  </text>
                </g>
              );
            })}

            {/* ── Straddle Expected Expiry Range Band ── */}
            {showRange && rangeHigh && rangeLow && (
              <g>
                <rect
                  x={padding.left}
                  y={priceToY(rangeHigh)}
                  width={plotWidth}
                  height={Math.max(2, priceToY(rangeLow) - priceToY(rangeHigh))}
                  fill="url(#rangeBandGrad)"
                  stroke={C.purple}
                  strokeWidth={1}
                  strokeDasharray="4 4"
                  opacity={0.7}
                />
                <line
                  x1={padding.left}
                  y1={priceToY(rangeHigh)}
                  x2={padding.left + plotWidth}
                  y2={priceToY(rangeHigh)}
                  stroke={C.purple}
                  strokeWidth={1}
                  strokeDasharray="4 4"
                />
                <line
                  x1={padding.left}
                  y1={priceToY(rangeLow)}
                  x2={padding.left + plotWidth}
                  y2={priceToY(rangeLow)}
                  stroke={C.purple}
                  strokeWidth={1}
                  strokeDasharray="4 4"
                />
                {/* Range Labels on Right */}
                <rect
                  x={padding.left + plotWidth + 4}
                  y={priceToY(rangeHigh) - 8}
                  width={80}
                  height={15}
                  rx={3}
                  fill="#20122e"
                  stroke={C.purple}
                  strokeWidth={1}
                />
                <text
                  x={padding.left + plotWidth + 8}
                  y={priceToY(rangeHigh) + 3}
                  fill={C.purple}
                  fontSize={8}
                  fontWeight={700}
                  fontFamily="'IBM Plex Mono',monospace"
                >
                  ▲ {rangeHigh}
                </text>

                <rect
                  x={padding.left + plotWidth + 4}
                  y={priceToY(rangeLow) - 8}
                  width={80}
                  height={15}
                  rx={3}
                  fill="#20122e"
                  stroke={C.purple}
                  strokeWidth={1}
                />
                <text
                  x={padding.left + plotWidth + 8}
                  y={priceToY(rangeLow) + 3}
                  fill={C.purple}
                  fontSize={8}
                  fontWeight={700}
                  fontFamily="'IBM Plex Mono',monospace"
                >
                  ▼ {rangeLow}
                </text>
              </g>
            )}

            {/* ── Call OI Resistance Wall Line ── */}
            {showRes && resStrike && (
              <g>
                <line
                  x1={padding.left}
                  y1={priceToY(resStrike)}
                  x2={padding.left + plotWidth}
                  y2={priceToY(resStrike)}
                  stroke={C.red}
                  strokeWidth={1.5}
                  strokeDasharray="5 3"
                />
                <rect
                  x={padding.left + plotWidth + 4}
                  y={priceToY(resStrike) - 9}
                  width={82}
                  height={17}
                  rx={3}
                  fill="#2a0d0d"
                  stroke={C.red}
                  strokeWidth={1}
                />
                <text
                  x={padding.left + plotWidth + 8}
                  y={priceToY(resStrike) + 3}
                  fill={C.red}
                  fontSize={8.5}
                  fontWeight={700}
                  fontFamily="'IBM Plex Mono',monospace"
                >
                  🛑 CEIL {resStrike}
                </text>
              </g>
            )}

            {/* ── Put OI Support Wall Line ── */}
            {showSup && supStrike && (
              <g>
                <line
                  x1={padding.left}
                  y1={priceToY(supStrike)}
                  x2={padding.left + plotWidth}
                  y2={priceToY(supStrike)}
                  stroke={C.green}
                  strokeWidth={1.5}
                  strokeDasharray="5 3"
                />
                <rect
                  x={padding.left + plotWidth + 4}
                  y={priceToY(supStrike) - 9}
                  width={82}
                  height={17}
                  rx={3}
                  fill="#0d2a16"
                  stroke={C.green}
                  strokeWidth={1}
                />
                <text
                  x={padding.left + plotWidth + 8}
                  y={priceToY(supStrike) + 3}
                  fill={C.green}
                  fontSize={8.5}
                  fontWeight={700}
                  fontFamily="'IBM Plex Mono',monospace"
                >
                  🛡️ FLOOR {supStrike}
                </text>
              </g>
            )}

            {/* ── Max Pain Strike Line ── */}
            {showMaxPain && maxPain > 0 && (
              <g>
                <line
                  x1={padding.left}
                  y1={priceToY(maxPain)}
                  x2={padding.left + plotWidth}
                  y2={priceToY(maxPain)}
                  stroke={C.yellow}
                  strokeWidth={1.2}
                  strokeDasharray="4 4"
                />
                <rect
                  x={padding.left + plotWidth + 4}
                  y={priceToY(maxPain) - 9}
                  width={82}
                  height={17}
                  rx={3}
                  fill="#2d2200"
                  stroke={C.yellow}
                  strokeWidth={1}
                />
                <text
                  x={padding.left + plotWidth + 8}
                  y={priceToY(maxPain) + 3}
                  fill={C.yellow}
                  fontSize={8.5}
                  fontWeight={700}
                  fontFamily="'IBM Plex Mono',monospace"
                >
                  🎯 PAIN {maxPain}
                </text>
              </g>
            )}

            {/* ── ATM Strike Line ── */}
            {showAtm && atm > 0 && (
              <g>
                <line
                  x1={padding.left}
                  y1={priceToY(atm)}
                  x2={padding.left + plotWidth}
                  y2={priceToY(atm)}
                  stroke={C.blue}
                  strokeWidth={1}
                  strokeDasharray="2 2"
                  opacity={0.8}
                />
                <rect
                  x={padding.left + plotWidth + 4}
                  y={priceToY(atm) - 8}
                  width={82}
                  height={16}
                  rx={3}
                  fill="#14253d"
                  stroke={C.blue}
                  strokeWidth={1}
                />
                <text
                  x={padding.left + plotWidth + 8}
                  y={priceToY(atm) + 3}
                  fill={C.blue}
                  fontSize={8.5}
                  fontWeight={700}
                  fontFamily="'IBM Plex Mono',monospace"
                >
                  ◆ ATM {atm}
                </text>
              </g>
            )}

            {/* ── Volume Bars (Sub-Chart) ── */}
            {candles.map((c, i) => {
              if (!c.volume) return null;
              const x = indexToX(i) - candleWidth / 2;
              const y = volToY(c.volume);
              const baseY = padding.top + pricePlotHeight + 12 + volumeHeight;
              const isBullish = c.close >= c.open;
              return (
                <rect
                  key={`vol-${i}`}
                  x={x}
                  y={y}
                  width={candleWidth}
                  height={Math.max(1, baseY - y)}
                  fill={isBullish ? C.green : C.red}
                  opacity={hoverIdx === i ? 0.8 : 0.3}
                />
              );
            })}

            {/* ── Candlesticks ── */}
            {candles.map((c, i) => {
              const x = indexToX(i);
              const isBullish = c.close >= c.open;
              const candleColor = isBullish ? C.green : C.red;
              const wickYTop = priceToY(c.high);
              const wickYBottom = priceToY(c.low);
              const bodyTop = priceToY(Math.max(c.open, c.close));
              const bodyBottom = priceToY(Math.min(c.open, c.close));
              const bodyHeight = Math.max(1.5, bodyBottom - bodyTop);

              return (
                <g key={`candle-${i}`}>
                  {/* Wick */}
                  <line
                    x1={x}
                    y1={wickYTop}
                    x2={x}
                    y2={wickYBottom}
                    stroke={candleColor}
                    strokeWidth={1}
                    opacity={hoverIdx === i ? 1 : 0.85}
                  />
                  {/* Body */}
                  <rect
                    x={x - candleWidth / 2}
                    y={bodyTop}
                    width={candleWidth}
                    height={bodyHeight}
                    fill={isBullish ? candleColor : candleColor}
                    stroke={candleColor}
                    strokeWidth={0.5}
                    rx={0.5}
                    opacity={hoverIdx === i ? 1 : 0.9}
                  />
                </g>
              );
            })}

            {/* ── Crosshair on Cursor Hover ── */}
            {hoverIdx != null && candles[hoverIdx] && (
              <g>
                <line
                  x1={indexToX(hoverIdx)}
                  y1={padding.top}
                  x2={indexToX(hoverIdx)}
                  y2={padding.top + plotHeight}
                  stroke={C.text}
                  strokeWidth={0.8}
                  strokeDasharray="3 3"
                  opacity={0.6}
                />
                <line
                  x1={padding.left}
                  y1={priceToY(candles[hoverIdx].close)}
                  x2={padding.left + plotWidth}
                  y2={priceToY(candles[hoverIdx].close)}
                  stroke={C.text}
                  strokeWidth={0.8}
                  strokeDasharray="3 3"
                  opacity={0.6}
                />
                {/* Active price cursor pill on right axis */}
                <rect
                  x={padding.left + plotWidth + 4}
                  y={priceToY(candles[hoverIdx].close) - 9}
                  width={82}
                  height={18}
                  rx={3}
                  fill={C.text}
                />
                <text
                  x={padding.left + plotWidth + 8}
                  y={priceToY(candles[hoverIdx].close) + 3}
                  fill={C.bg}
                  fontSize={9}
                  fontWeight={800}
                  fontFamily="'IBM Plex Mono',monospace"
                >
                  ₹{candles[hoverIdx].close.toFixed(1)}
                </text>
              </g>
            )}
          </svg>
        )}
      </div>

      {/* ── Bottom Explanatory Legend ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          flexWrap: "wrap",
          fontSize: 10,
          color: C.muted,
          marginTop: 10,
          paddingTop: 8,
          borderTop: `1px solid ${C.surface2}`,
        }}
      >
        <span>
          🔴 <b>Ceiling (Resistance)</b>: Highest Call bets strike (strong selling barrier)
        </span>
        <span>·</span>
        <span>
          🟢 <b>Floor (Support)</b>: Highest Put bets strike (strong buyer support)
        </span>
        <span>·</span>
        <span>
          🟡 <b>Max Pain</b>: Option sellers target strike where buyers lose most
        </span>
        <span>·</span>
        <span>
          🟣 <b>Expected Range</b>: ATM Straddle 1-sigma bounds
        </span>
      </div>
    </div>
  );
});
