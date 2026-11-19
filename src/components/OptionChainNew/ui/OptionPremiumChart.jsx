"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { C } from "../constants.js";
import OptionCandlestickChart from "./OptionCandlestickChart.jsx";
import { useShoonyaWebSocket } from "../hooks/useShoonyaWebSocket.js";

const INTERVALS = [
  { id: "1m", label: "1m", minutes: 1 },
  { id: "3m", label: "3m", minutes: 3 },
  { id: "5m", label: "5m", minutes: 5 },
  { id: "15m", label: "15m", minutes: 15 },
  { id: "30m", label: "30m", minutes: 30 },
  { id: "60m", label: "1h", minutes: 60 },
];

const POPULAR_SYMBOLS = [
  { symbol: "NIFTY", name: "NIFTY 50 (NSE)" },
  { symbol: "BANKNIFTY", name: "BANK NIFTY (NSE)" },
  { symbol: "SENSEX", name: "BSE SENSEX (BFO)" },
  { symbol: "FINNIFTY", name: "FIN NIFTY (NSE)" },
  { symbol: "MIDCPNIFTY", name: "MIDCAP NIFTY (NSE)" },
  { symbol: "CRUDEOIL", name: "CRUDE OIL (MCX)" },
  { symbol: "NATURALGAS", name: "NATURAL GAS (MCX)" },
  { symbol: "GOLD", name: "GOLD (MCX)" },
  { symbol: "SILVER", name: "SILVER (MCX)" },
];

const DEFAULT_ATM = {
  NIFTY: 25500,
  BANKNIFTY: 52000,
  SENSEX: 80000,
  FINNIFTY: 24000,
  MIDCPNIFTY: 12500,
  CRUDEOIL: 7850,
  CRUDEOILM: 7850,
  NATURALGAS: 310,
  GOLD: 127500,
  GOLDM: 127500,
  SILVER: 158000,
  SILVERM: 158000,
  SILVERMIC: 158000,
};

function timeLabel(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Kolkata",
  });
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const candle = payload[0].payload;
  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 8,
        padding: "9px 12px",
        color: C.text,
        fontSize: 11,
        boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
      }}
    >
      <div style={{ color: C.muted, marginBottom: 5 }}>{timeLabel(label)}</div>
      <div>
        Close: <b style={{ color: C.blue }}>₹{Number(candle.close).toFixed(2)}</b>
      </div>
      <div style={{ color: C.muted, marginTop: 2 }}>
        O: ₹{candle.open} · H: ₹{candle.high} · L: ₹{candle.low}
      </div>
      {candle.volume > 0 && (
        <div style={{ color: C.muted, marginTop: 2 }}>
          Vol: {Number(candle.volume).toLocaleString("en-IN")}
          {candle.oi > 0 && ` · OI: ${Number(candle.oi).toLocaleString("en-IN")}`}
        </div>
      )}
    </div>
  );
}

export default function OptionPremiumChart({
  instrument,
  activeExpiry,
  expiries = [],
  atm,
  rows = [],
  spot,
}) {
  const [activeSymbol, setActiveSymbol] = useState(() => instrument?.symbol || "NIFTY");

  const currentAtm = useMemo(() => {
    if (activeSymbol === instrument?.symbol && atm) return atm;
    return DEFAULT_ATM[activeSymbol] || (atm || 25500);
  }, [activeSymbol, instrument?.symbol, atm]);

  const [selectedStrike, setSelectedStrike] = useState(() => {
    const sym = instrument?.symbol || "NIFTY";
    if (sym === instrument?.symbol && atm) return atm;
    return DEFAULT_ATM[sym] || 25500;
  });
  const [optionType, setOptionType] = useState("CE");
  const [selectedExpiry, setSelectedExpiry] = useState(() => activeExpiry || null);
  const [interval, setInterval] = useState("5m");
  const [chartType, setChartType] = useState("candle"); // "candle" | "line"

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [auth, setAuth] = useState({ configured: false, authorizeUrl: null });
  const [authCode, setAuthCode] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // Live WebSocket state & price flash
  const [liveQuote, setLiveQuote] = useState(null);
  const [priceFlash, setPriceFlash] = useState(null); // "up" | "down" | null
  const prevPriceRef = useRef(null);
  const flashTimeoutRef = useRef(null);
  const candleBaseDayVolumeRef = useRef(null);
  const candleInitialBarVolumeRef = useRef(0);

  useEffect(() => {
    return () => {
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    };
  }, []);

  // Custom strike input mode toggle
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customInput, setCustomInput] = useState("");

  // Sync state when parent instrument, ATM, or activeExpiry changes
  useEffect(() => {
    if (instrument?.symbol) {
      setActiveSymbol(instrument.symbol);
      const parentAtm = (atm && instrument.symbol !== "SENSEX") ? atm : (DEFAULT_ATM[instrument.symbol] || 25500);
      setSelectedStrike(parentAtm);
    }
  }, [instrument?.symbol, atm]);

  useEffect(() => {
    if (atm && activeSymbol === instrument?.symbol) {
      setSelectedStrike(atm);
    }
  }, [atm, activeSymbol, instrument?.symbol]);

  useEffect(() => {
    if (activeExpiry && activeSymbol === instrument?.symbol) {
      setSelectedExpiry(activeExpiry);
    }
  }, [activeExpiry, activeSymbol, instrument?.symbol]);

  // Combined symbols list for dropdown
  const symbolOptions = useMemo(() => {
    const list = [...POPULAR_SYMBOLS];
    if (instrument?.symbol && !list.some((s) => s.symbol === instrument.symbol)) {
      list.push({
        symbol: instrument.symbol,
        name: `${instrument.symbol} (${instrument.type === "index" ? "Index" : "Stock"})`,
      });
    }
    return list;
  }, [instrument]);

  // Combined expiries list from API and props
  const allExpiries = useMemo(() => {
    const list = [];
    if (Array.isArray(data?.availableExpiries)) {
      list.push(...data.availableExpiries);
    }
    if (Array.isArray(expiries) && activeSymbol === instrument?.symbol) {
      list.push(...expiries);
    }
    if (data?.expiry && !list.includes(data.expiry)) {
      list.push(data.expiry);
    }
    return Array.from(new Set(list)).filter(Boolean);
  }, [data?.availableExpiries, data?.expiry, expiries, activeSymbol, instrument?.symbol]);

  // Extract available strikes
  const strikes = useMemo(() => {
    // For SENSEX (BFO), generate strikes with step 100
    if (activeSymbol === "SENSEX") {
      const base = Number(selectedStrike >= 60000 && selectedStrike <= 100000 ? selectedStrike : 80000);
      const list = [];
      for (let i = -15; i <= 15; i++) {
        list.push(base + i * 100);
      }
      if (!list.includes(Number(selectedStrike))) list.push(Number(selectedStrike));
      return Array.from(new Set(list)).sort((a, b) => a - b);
    }

    // For MCX Commodities
    if (activeSymbol === "CRUDEOIL" || activeSymbol === "CRUDEOILM") {
      const base = Number(selectedStrike >= 2000 && selectedStrike <= 20000 ? selectedStrike : 7850);
      const list = [];
      for (let i = -15; i <= 15; i++) {
        list.push(base + i * 50);
      }
      if (!list.includes(Number(selectedStrike))) list.push(Number(selectedStrike));
      return Array.from(new Set(list)).sort((a, b) => a - b);
    }

    if (activeSymbol === "NATURALGAS") {
      const base = Number(selectedStrike >= 50 && selectedStrike <= 1000 ? selectedStrike : 310);
      const list = [];
      for (let i = -15; i <= 15; i++) {
        list.push(base + i * 5);
      }
      if (!list.includes(Number(selectedStrike))) list.push(Number(selectedStrike));
      return Array.from(new Set(list)).sort((a, b) => a - b);
    }

    if (activeSymbol === "GOLD" || activeSymbol === "GOLDM") {
      const base = Number(selectedStrike >= 80000 && selectedStrike <= 180000 ? selectedStrike : 127500);
      const list = [];
      for (let i = -15; i <= 15; i++) {
        list.push(base + i * 500);
      }
      if (!list.includes(Number(selectedStrike))) list.push(Number(selectedStrike));
      return Array.from(new Set(list)).sort((a, b) => a - b);
    }

    if (activeSymbol.startsWith("SILVER")) {
      const base = Number(selectedStrike >= 100000 && selectedStrike <= 220000 ? selectedStrike : 158000);
      const list = [];
      for (let i = -15; i <= 15; i++) {
        list.push(base + i * 500);
      }
      if (!list.includes(Number(selectedStrike))) list.push(Number(selectedStrike));
      return Array.from(new Set(list)).sort((a, b) => a - b);
    }

    let list = (rows ?? [])
      .map((r) => Number(r.strikePrice ?? r.strike))
      .filter((s) => Number.isFinite(s) && s > 0);

    // If rows is empty or not yet loaded, generate strikes around ATM or current strike
    if (list.length === 0) {
      const base = Number(currentAtm || selectedStrike || 25500);
      const step = activeSymbol === "BANKNIFTY" ? 100 : activeSymbol === "MIDCPNIFTY" ? 25 : 50;
      list = [];
      for (let i = -15; i <= 15; i++) {
        list.push(base + i * step);
      }
    }

    if (selectedStrike && !list.includes(Number(selectedStrike))) {
      list.push(Number(selectedStrike));
    }
    if (currentAtm && !list.includes(Number(currentAtm))) {
      list.push(Number(currentAtm));
    }

    return Array.from(new Set(list)).sort((a, b) => a - b);
  }, [rows, currentAtm, activeSymbol, selectedStrike]);

  // Next / Prev strike navigation
  const currentIdx = strikes.indexOf(Number(selectedStrike));
  const canPrev = currentIdx > 0;
  const canNext = currentIdx !== -1 && currentIdx < strikes.length - 1;

  const handlePrevStrike = () => {
    if (canPrev) setSelectedStrike(strikes[currentIdx - 1]);
  };
  const handleNextStrike = () => {
    if (canNext) setSelectedStrike(strikes[currentIdx + 1]);
  };

  const handleSymbolChange = (nextSym) => {
    setActiveSymbol(nextSym);
    setSelectedExpiry(null); // Reset expiry to pick nearest for the new instrument
    const nextAtm = (nextSym === instrument?.symbol && atm) ? atm : (DEFAULT_ATM[nextSym] || 25500);
    setSelectedStrike(nextAtm);
  };

  const applyCustomStrike = (e) => {
    e?.preventDefault();
    const val = Number(customInput.trim());
    if (Number.isFinite(val) && val > 0) {
      setSelectedStrike(val);
      setIsCustomMode(false);
      setCustomInput("");
    }
  };

  useEffect(() => {
    fetch("/api/shoonya-auth", { cache: "no-store" })
      .then((res) => res.json())
      .then(setAuth)
      .catch(() => setAuth({ configured: false, authorizeUrl: null }));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setLiveQuote(null);
    prevPriceRef.current = null;
    try {
      const params = new URLSearchParams({
        symbol: activeSymbol,
        strike: String(selectedStrike),
        optionType,
        interval,
      });
      if (selectedExpiry) {
        params.set("expiry", selectedExpiry);
      }

      const response = await fetch(`/api/option-premium?${params.toString()}`, {
        cache: "no-store",
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Unable to load option candles.");
      }
      setData(result);
      const lastCandle = result.candles?.at(-1);
      if (lastCandle) {
        candleBaseDayVolumeRef.current = lastCandle.dayVolume || result.dayVolume || null;
        candleInitialBarVolumeRef.current = lastCandle.volume || 0;
      } else {
        candleBaseDayVolumeRef.current = null;
        candleInitialBarVolumeRef.current = 0;
      }
      return (result.candles?.length ?? 0) > 0;
    } catch (err) {
      setData(null);
      candleBaseDayVolumeRef.current = null;
      candleInitialBarVolumeRef.current = 0;
      setError(err.message || "Unable to load option candles.");
      return false;
    } finally {
      setLoading(false);
    }
  }, [activeSymbol, selectedStrike, optionType, selectedExpiry, interval]);

  useEffect(() => {
    load();
  }, [load]);

  // Handle incoming live tick from Shoonya WebSocket
  const handleLiveTick = useCallback(
    (tick) => {
      if (!tick) return;
      const ltp = tick.ltp;
      if (ltp == null || !Number.isFinite(ltp) || ltp <= 0) return;

      // Price flash animation
      if (prevPriceRef.current != null && ltp !== prevPriceRef.current) {
        setPriceFlash(ltp > prevPriceRef.current ? "up" : "down");
        if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
        flashTimeoutRef.current = setTimeout(() => setPriceFlash(null), 600);
      }
      prevPriceRef.current = ltp;

      setLiveQuote((prev) => ({
        ltp,
        high: tick.high != null ? tick.high : prev?.high != null ? Math.max(prev.high, ltp) : ltp,
        low: tick.low != null ? tick.low : prev?.low != null ? Math.min(prev.low, ltp) : ltp,
        volume: tick.volume != null ? tick.volume : prev?.volume,
        oi: tick.oi != null ? tick.oi : prev?.oi,
        time: tick.time || Date.now(),
      }));

      // Update or append candle
      setData((currentData) => {
        if (!currentData?.candles || currentData.candles.length === 0) return currentData;

        const candles = [...currentData.candles];
        const lastIdx = candles.length - 1;
        const lastCandle = { ...candles[lastIdx] };

        const intervalObj = INTERVALS.find((i) => i.id === interval);
        const intervalMinutes = intervalObj?.minutes || 5;
        const intervalMs = intervalMinutes * 60 * 1000;
        const lastTime = new Date(lastCandle.date).getTime();
        const tickTime = tick.time || Date.now();
        const tickDayVolume = tick.volume;

        if (Number.isFinite(lastTime) && tickTime >= lastTime && tickTime < lastTime + intervalMs) {
          lastCandle.close = ltp;
          lastCandle.high = Math.max(lastCandle.high, ltp);
          lastCandle.low = Math.min(lastCandle.low, ltp);

          // Update interval bar volume incrementally from cumulative day volume delta
          if (tickDayVolume != null && tickDayVolume > 0) {
            if (candleBaseDayVolumeRef.current == null) {
              candleBaseDayVolumeRef.current = tickDayVolume;
              candleInitialBarVolumeRef.current = lastCandle.volume || 0;
            }
            const delta = Math.max(0, tickDayVolume - candleBaseDayVolumeRef.current);
            lastCandle.volume = (candleInitialBarVolumeRef.current || 0) + delta;
          }

          if (tick.oi != null && tick.oi > 0) {
            lastCandle.oi = tick.oi;
          }
          candles[lastIdx] = lastCandle;
        } else if (Number.isFinite(lastTime) && tickTime >= lastTime + intervalMs) {
          // New candle boundary reached -> reset baseline day volume for the new candle
          if (tickDayVolume != null && tickDayVolume > 0) {
            candleBaseDayVolumeRef.current = tickDayVolume;
          }
          candleInitialBarVolumeRef.current = 0;

          const newTime = new Date(lastTime + intervalMs).toISOString();
          const newCandle = {
            date: newTime,
            open: ltp,
            high: ltp,
            low: ltp,
            close: ltp,
            volume: 0,
            dayVolume: tickDayVolume || lastCandle.dayVolume,
            oi: tick.oi || lastCandle.oi,
          };
          candles.push(newCandle);
        } else {
          lastCandle.close = ltp;
          lastCandle.high = Math.max(lastCandle.high, ltp);
          lastCandle.low = Math.min(lastCandle.low, ltp);
          candles[lastIdx] = lastCandle;
        }

        return { ...currentData, candles };
      });
    },
    [interval],
  );

  const { status: wsStatus } = useShoonyaWebSocket({
    enabled: Boolean(data?.token && data?.exch),
    exchange: data?.exch,
    token: data?.token,
    onTick: handleLiveTick,
  });

  const latest = data?.candles?.at(-1);
  const previous = data?.candles?.at(-2);
  const currentPrice = liveQuote?.ltp ?? latest?.close;
  const currentHigh =
    liveQuote?.high != null && latest?.high != null
      ? Math.max(liveQuote.high, latest.high)
      : (liveQuote?.high ?? latest?.high);
  const currentLow =
    liveQuote?.low != null && latest?.low != null
      ? Math.min(liveQuote.low, latest.low)
      : (liveQuote?.low ?? latest?.low);
  const currentOpen = latest?.open;
  const currentVolume =
    liveQuote?.volume ?? data?.dayVolume ?? latest?.dayVolume ?? latest?.volume;
  const currentOi = liveQuote?.oi ?? latest?.oi;

  const change = currentPrice != null && previous ? currentPrice - previous.close : null;
  const pctChange =
    currentPrice != null && previous && previous.close > 0
      ? ((currentPrice - previous.close) / previous.close) * 100
      : null;

  const connectShoonya = async (event) => {
    event.preventDefault();
    setAuthLoading(true);
    setAuthMessage("");
    try {
      const response = await fetch("/api/shoonya-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: authCode }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not connect Shoonya.");
      setAuthCode("");
      setAuthMessage("Token saved to .env. Loading Shoonya option candles…");
      const hasCandles = await load();
      setAuthMessage(
        hasCandles
          ? "Connected. Token saved and option candles loaded successfully."
          : "Token saved, but Shoonya returned no candles for this contract.",
      );
    } catch (err) {
      setAuthMessage(err.message || "Could not connect Shoonya.");
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <section
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        padding: 16,
        marginTop: 14,
      }}
    >
      {/* Top Header & Controls */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          borderBottom: `1px solid ${C.border}`,
          paddingBottom: 12,
          marginBottom: 12,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ color: C.text, fontSize: 16, fontWeight: 700 }}>
              {activeSymbol} {selectedStrike} {optionType}
            </span>
            <span
              style={{
                fontSize: 10,
                padding: "2px 7px",
                borderRadius: 4,
                fontWeight: 700,
                background: optionType === "CE" ? C.greenBg : C.redBg,
                color: optionType === "CE" ? C.green : C.red,
                border: `1px solid ${optionType === "CE" ? C.green : C.red}44`,
              }}
            >
              {optionType === "CE" ? "CALL" : "PUT"}
            </span>
            {data?.exch && (
              <span
                style={{
                  fontSize: 10,
                  padding: "2px 6px",
                  borderRadius: 4,
                  fontWeight: 600,
                  background:
                    data.exch === "MCX"
                      ? "#3a2505"
                      : data.exch === "BFO"
                      ? "#1a2538"
                      : C.surface2,
                  color:
                    data.exch === "MCX"
                      ? "#f59e0b"
                      : data.exch === "BFO"
                      ? C.blue
                      : C.muted,
                  border: `1px solid ${data.exch === "MCX" ? "#f59e0b55" : C.border}`,
                }}
              >
                {data.exch === "MCX" ? "MCX · MCX" : data.exch === "BFO" ? "BSE · BFO" : "NSE · NFO"}
              </span>
            )}
            {data?.contract && (
              <span
                style={{
                  fontSize: 11,
                  color: C.blue,
                  fontFamily: "monospace",
                  background: C.surface2,
                  padding: "2px 7px",
                  borderRadius: 4,
                  border: `1px solid ${C.border}`,
                }}
              >
                {data.contract}
              </span>
            )}
          </div>
          <div style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>
            Expiry: <b style={{ color: C.text }}>{data?.expiry || selectedExpiry || "Nearest"}</b> · Shoonya Historical Candles
            {spot && activeSymbol === instrument?.symbol ? ` · Spot: ₹${Number(spot).toFixed(2)}` : ""}
          </div>
        </div>

        {/* Filter Controls Toolbar */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {/* Underlying Instrument Selector */}
          <select
            aria-label="Select Underlying Instrument"
            value={activeSymbol}
            onChange={(e) => handleSymbolChange(e.target.value)}
            style={{
              background: C.surface2,
              color: C.text,
              border: `1px solid ${C.border}`,
              borderRadius: 6,
              padding: "6px 9px",
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {symbolOptions.map((opt) => (
              <option key={opt.symbol} value={opt.symbol} style={{ background: C.surface, color: C.text }}>
                {opt.name}
              </option>
            ))}
          </select>

          {/* Chart Mode Toggle: Candles vs Line */}
          <div
            style={{
              display: "flex",
              borderRadius: 6,
              border: `1px solid ${C.border}`,
              overflow: "hidden",
            }}
          >
            <button
              type="button"
              onClick={() => setChartType("candle")}
              title="Candlestick Chart"
              style={{
                border: 0,
                padding: "6px 11px",
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                background: chartType === "candle" ? "#14253d" : "transparent",
                color: chartType === "candle" ? C.blue : C.muted,
              }}
            >
              🕯️ Candles
            </button>
            <button
              type="button"
              onClick={() => setChartType("line")}
              title="Line Chart"
              style={{
                border: 0,
                padding: "6px 11px",
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                background: chartType === "line" ? "#14253d" : "transparent",
                color: chartType === "line" ? C.blue : C.muted,
              }}
            >
              📈 Line
            </button>
          </div>

          {/* CE / PE Toggle */}
          <div
            style={{
              display: "flex",
              borderRadius: 6,
              border: `1px solid ${C.border}`,
              overflow: "hidden",
            }}
          >
            <button
              type="button"
              onClick={() => setOptionType("CE")}
              style={{
                border: 0,
                padding: "6px 12px",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                background: optionType === "CE" ? C.greenBg : "transparent",
                color: optionType === "CE" ? C.green : C.muted,
              }}
            >
              CE
            </button>
            <button
              type="button"
              onClick={() => setOptionType("PE")}
              style={{
                border: 0,
                padding: "6px 12px",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                background: optionType === "PE" ? C.redBg : "transparent",
                color: optionType === "PE" ? C.red : C.muted,
              }}
            >
              PE
            </button>
          </div>

          {/* Strike Selector Controls */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              background: C.surface2,
              border: `1px solid ${C.border}`,
              borderRadius: 6,
              padding: "2px 4px",
            }}
          >
            <span style={{ color: C.muted, fontSize: 11, fontWeight: 600, paddingLeft: 4 }}>
              Strike:
            </span>

            {isCustomMode ? (
              <form onSubmit={applyCustomStrike} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <input
                  type="number"
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  placeholder={
                    activeSymbol === "NATURALGAS"
                      ? "e.g. 310"
                      : activeSymbol === "CRUDEOIL"
                      ? "e.g. 7800"
                      : activeSymbol === "SENSEX"
                      ? "e.g. 80000"
                      : "e.g. 25500"
                  }
                  autoFocus
                  style={{
                    width: 80,
                    background: C.bg,
                    color: C.text,
                    border: `1px solid ${C.blue}`,
                    borderRadius: 4,
                    padding: "3px 6px",
                    fontSize: 11,
                  }}
                />
                <button
                  type="submit"
                  style={{
                    border: 0,
                    borderRadius: 4,
                    background: C.blue,
                    color: C.bg,
                    padding: "3px 7px",
                    fontSize: 10,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Go
                </button>
                <button
                  type="button"
                  onClick={() => setIsCustomMode(false)}
                  style={{
                    border: 0,
                    background: "transparent",
                    color: C.muted,
                    fontSize: 11,
                    cursor: "pointer",
                    padding: "2px 4px",
                  }}
                >
                  ✕
                </button>
              </form>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handlePrevStrike}
                  disabled={!canPrev}
                  title="Previous lower strike"
                  style={{
                    border: 0,
                    background: "transparent",
                    color: canPrev ? C.text : `${C.muted}55`,
                    cursor: canPrev ? "pointer" : "default",
                    padding: "4px 6px",
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                >
                  ◀
                </button>

                <select
                  aria-label="Select Strike Price"
                  value={selectedStrike}
                  onChange={(e) => setSelectedStrike(Number(e.target.value))}
                  style={{
                    background: "transparent",
                    color: C.text,
                    border: 0,
                    padding: "4px 6px",
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                    minWidth: 120,
                  }}
                >
                  {strikes.map((s) => {
                    const diff = currentAtm ? s - currentAtm : 0;
                    const diffText = s === currentAtm
                      ? "ATM"
                      : diff !== 0
                        ? diff > 0 ? `+${diff}` : `${diff}`
                        : "";
                    return (
                      <option key={s} value={s} style={{ background: C.surface, color: C.text }}>
                        {s} {diffText ? `(${diffText})` : ""}
                      </option>
                    );
                  })}
                </select>

                <button
                  type="button"
                  onClick={handleNextStrike}
                  disabled={!canNext}
                  title="Next higher strike"
                  style={{
                    border: 0,
                    background: "transparent",
                    color: canNext ? C.text : `${C.muted}55`,
                    cursor: canNext ? "pointer" : "default",
                    padding: "4px 6px",
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                >
                  ▶
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCustomInput(String(selectedStrike));
                    setIsCustomMode(true);
                  }}
                  title="Type custom strike price"
                  style={{
                    border: `1px solid ${C.border}`,
                    background: C.bg,
                    color: C.muted,
                    borderRadius: 4,
                    padding: "2px 5px",
                    fontSize: 10,
                    cursor: "pointer",
                  }}
                >
                  ✏️
                </button>
              </>
            )}

            {currentAtm && Number(selectedStrike) !== Number(currentAtm) && (
              <button
                type="button"
                onClick={() => setSelectedStrike(currentAtm)}
                title={`Reset to ATM strike (${currentAtm})`}
                style={{
                  border: `1px solid ${C.yellow}66`,
                  background: "#2a2200",
                  color: C.yellow,
                  borderRadius: 4,
                  padding: "2px 6px",
                  fontSize: 10,
                  fontWeight: 700,
                  cursor: "pointer",
                  marginLeft: 2,
                }}
              >
                ATM
              </button>
            )}
          </div>

          {/* Expiry Selector (always visible when available) */}
          {allExpiries.length > 0 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                background: C.surface2,
                border: `1px solid ${C.border}`,
                borderRadius: 6,
                padding: "2px 6px",
              }}
            >
              <span style={{ color: C.muted, fontSize: 11, fontWeight: 600 }}>
                Expiry:
              </span>
              <select
                aria-label="Select Expiry Date"
                value={selectedExpiry || data?.expiry || allExpiries[0] || ""}
                onChange={(e) => setSelectedExpiry(e.target.value)}
                style={{
                  background: "transparent",
                  color: C.text,
                  border: 0,
                  padding: "4px 6px",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {allExpiries.map((exp) => (
                  <option key={exp} value={exp} style={{ background: C.surface, color: C.text }}>
                    {exp}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Interval Buttons */}
          <div style={{ display: "flex", gap: 3 }}>
            {INTERVALS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setInterval(item.id)}
                style={{
                  border: `1px solid ${interval === item.id ? C.blue : C.border}`,
                  background: interval === item.id ? "#14253d" : "transparent",
                  color: interval === item.id ? C.blue : C.muted,
                  borderRadius: 6,
                  padding: "5px 8px",
                  cursor: "pointer",
                  fontSize: 10,
                  fontWeight: interval === item.id ? 700 : 500,
                }}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Reload Button */}
          <button
            type="button"
            onClick={load}
            disabled={loading}
            title="Refresh option candles"
            style={{
              border: `1px solid ${C.border}`,
              background: "transparent",
              color: C.text,
              borderRadius: 6,
              padding: "5px 9px",
              cursor: loading ? "wait" : "pointer",
              fontSize: 11,
            }}
          >
            ↻
          </button>
        </div>
      </div>

      {/* Latest Candle Stats */}
      {latest && (
        <div
          style={{
            display: "flex",
            gap: 16,
            alignItems: "baseline",
            marginBottom: 10,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ color: C.muted, fontSize: 11 }}>LTP:</span>
            <strong
              style={{
                color: priceFlash === "up" ? C.green : priceFlash === "down" ? C.red : C.text,
                fontSize: 22,
                transition: "color 0.25s ease",
              }}
            >
              ₹{Number(currentPrice).toFixed(2)}
            </strong>
          </div>
          {change != null && (
            <span
              style={{
                color: change >= 0 ? C.green : C.red,
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {change >= 0 ? "+" : ""}
              {change.toFixed(2)} ({pctChange != null ? `${pctChange >= 0 ? "+" : ""}${pctChange.toFixed(2)}%` : ""})
            </span>
          )}
          <span style={{ color: C.muted, fontSize: 11 }}>
            High: ₹{currentHigh} · Low: ₹{currentLow} · Open: ₹{currentOpen}
          </span>
          {currentVolume > 0 && (
            <span style={{ color: C.muted, fontSize: 11 }}>
              Volume: {Number(currentVolume).toLocaleString("en-IN")}
            </span>
          )}
          {currentOi > 0 && (
            <span style={{ color: C.muted, fontSize: 11 }}>
              OI: {Number(currentOi).toLocaleString("en-IN")}
            </span>
          )}

          {/* WebSocket Live Badge */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "2px 8px",
              borderRadius: 12,
              fontSize: 10,
              fontWeight: 700,
              background: wsStatus === "connected" ? "rgba(34, 197, 94, 0.12)" : "rgba(148, 163, 184, 0.1)",
              border: `1px solid ${wsStatus === "connected" ? "rgba(34, 197, 94, 0.3)" : C.border}`,
              color: wsStatus === "connected" ? "#4ade80" : C.muted,
              marginLeft: "auto",
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background:
                  wsStatus === "connected" ? "#22c55e" : wsStatus === "connecting" ? "#eab308" : "#64748b",
                boxShadow: wsStatus === "connected" ? "0 0 6px #22c55e" : "none",
                display: "inline-block",
              }}
            />
            {wsStatus === "connected"
              ? "LIVE STREAM"
              : wsStatus === "connecting"
              ? "CONNECTING WS..."
              : "STREAM IDLE"}
          </div>

          <span style={{ color: C.muted, fontSize: 10 }}>
            {data.candles.length} candles
          </span>
        </div>
      )}

      {/* Chart Canvas */}
      <div style={{ width: "100%", height: 380, minHeight: 380, marginTop: 4, position: "relative" }}>
        {loading ? (
          <div
            style={{
              display: "flex",
              height: "100%",
              alignItems: "center",
              justifyContent: "center",
              color: C.blue,
              fontSize: 12,
            }}
          >
            Loading option candles from Shoonya…
          </div>
        ) : error ? (
          <div
            role="alert"
            style={{
              background: "#2a1515",
              border: `1px solid ${C.red}44`,
              borderRadius: 8,
              padding: 16,
              color: C.yellow,
              fontSize: 12,
              lineHeight: 1.6,
            }}
          >
            <div style={{ fontWeight: 700, color: C.red, marginBottom: 4 }}>
              Unable to load option contract data
            </div>
            <div>{error}</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 8 }}>
              Check that your Shoonya token has not expired and your IP is whitelisted in your Shoonya API dashboard.
            </div>
          </div>
        ) : !data?.candles?.length ? (
          <div
            style={{
              display: "flex",
              height: "100%",
              alignItems: "center",
              justifyContent: "center",
              color: C.muted,
              fontSize: 12,
            }}
          >
            Shoonya returned no candle records for {activeSymbol} {selectedStrike} {optionType}.
          </div>
        ) : chartType === "candle" ? (
          <OptionCandlestickChart candles={data.candles} optionType={optionType} />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.candles} margin={{ top: 12, right: 16, left: 2, bottom: 2 }}>
              <CartesianGrid stroke={C.border} strokeDasharray="3 4" />
              <XAxis
                dataKey="date"
                tickFormatter={timeLabel}
                minTickGap={40}
                tick={{ fill: C.muted, fontSize: 10 }}
                axisLine={{ stroke: C.border }}
                tickLine={false}
              />
              <YAxis
                domain={["auto", "auto"]}
                tickFormatter={(val) => `₹${val}`}
                width={65}
                tick={{ fill: C.muted, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<ChartTooltip />} />
              <Line
                type="monotone"
                dataKey="close"
                name="Premium"
                stroke={optionType === "CE" ? C.green : C.red}
                strokeWidth={2}
                dot={false}
                activeDot={{
                  r: 4,
                  fill: optionType === "CE" ? C.green : C.red,
                  stroke: C.bg,
                  strokeWidth: 2,
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div style={{ color: C.muted, fontSize: 10, marginTop: 8 }}>
        Historical premium chart powered by Shoonya (Finvasia) Noren API and React Financial Charts. Times displayed in IST.
      </div>

      {/* Shoonya Token Management */}
      <details
        style={{
          marginTop: 14,
          borderTop: `1px solid ${C.border}`,
          paddingTop: 10,
        }}
      >
        <summary style={{ color: C.blue, cursor: "pointer", fontSize: 11, fontWeight: 600 }}>
          ⚙️ Connect / renew Shoonya token
        </summary>
        <div style={{ color: C.muted, fontSize: 11, lineHeight: 1.6, marginTop: 8 }}>
          {auth.configured ? (
            <>
              <p style={{ margin: "4px 0" }}>
                Shoonya access tokens expire after 24 hours. To generate a fresh token:
              </p>
              <ol style={{ paddingLeft: 18, margin: "6px 0 10px" }}>
                <li>
                  <a
                    href={auth.authorizeUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: C.blue, textDecoration: "underline" }}
                  >
                    Open Shoonya OAuth login page
                  </a>
                </li>
                <li>Sign in with your Shoonya credentials and TOTP.</li>
                <li>Copy the <code>code</code> parameter from the browser URL bar after redirect.</li>
                <li>Paste the authorization code below and click &quot;Generate token&quot;.</li>
              </ol>
              <form onSubmit={connectShoonya} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <input
                  aria-label="Shoonya authorization code"
                  value={authCode}
                  onChange={(e) => setAuthCode(e.target.value)}
                  placeholder="Paste authorization code here"
                  autoComplete="off"
                  style={{
                    flex: 1,
                    minWidth: 220,
                    background: C.bg,
                    color: C.text,
                    border: `1px solid ${C.border}`,
                    borderRadius: 6,
                    padding: "7px 10px",
                    fontSize: 11,
                  }}
                />
                <button
                  type="submit"
                  disabled={authLoading || !authCode.trim()}
                  style={{
                    border: 0,
                    borderRadius: 6,
                    padding: "7px 14px",
                    background: C.blue,
                    color: C.bg,
                    fontWeight: 600,
                    cursor: authLoading ? "wait" : "pointer",
                    fontSize: 11,
                  }}
                >
                  {authLoading ? "Connecting…" : "Generate token"}
                </button>
              </form>
            </>
          ) : (
            <p style={{ margin: 0 }}>
              Add <code>SHOONYA_UID</code> and <code>SHOONYA_ACCESS_TOKEN</code> to your local <code>.env</code> file.
              To use the automatic 1-click renewal flow, also add <code>SHOONYA_CLIENT_ID</code> and <code>SHOONYA_SECRET_CODE</code>.
            </p>
          )}
          {authMessage && (
            <p
              role="status"
              style={{
                color: authMessage.includes("Connected") || authMessage.includes("success")
                  ? C.green
                  : C.yellow,
                margin: "8px 0 0",
              }}
            >
              {authMessage}
            </p>
          )}
        </div>
      </details>
    </section>
  );
}
