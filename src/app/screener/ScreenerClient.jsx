"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  FiPlay,
  FiSquare,
  FiSearch,
  FiTrendingUp,
  FiTrendingDown,
  FiClock,
  FiAlertTriangle,
  FiExternalLink,
  FiZap,
  FiLock,
  FiKey,
  FiEye,
  FiEyeOff,
  FiShield,
} from "react-icons/fi";
import { getStockSignalAction } from "../actions/stockSignal";
import {
  checkScreenerAccessAction,
  verifyScreenerAccessAction,
  lockScreenerAccessAction,
} from "../actions/screenerAuth";
import StockSignalModal from "../../components/StockSignalModal";
import "./Screener.scss";

// ── Watchlist Presets ────────────────────────────────────────────────────────
const PRESETS = {
  LEADERS: {
    id: "LEADERS",
    name: "Liquid Leaders",
    description: "Top 20 high-volume NSE liquid leaders & index ETFs",
    symbols: [
      "RELIANCE",
      "TCS",
      "INFY",
      "HDFCBANK",
      "ICICIBANK",
      "BHARTIARTL",
      "SBIN",
      "ITC",
      "LT",
      "SUNPHARMA",
      "TITAN",
      "BAJFINANCE",
      "MARUTI",
      "BEL",
      "NTPC",
      "POWERGRID",
      "TATASTEEL",
      "SUZLON",
      "NIFTYBEES",
      "BANKBEES",
    ],
  },
  NIFTY50: {
    id: "NIFTY50",
    name: "Nifty 50",
    description: "Benchmark 50 index constituents",
    symbols: [
      "ADANIENT",
      "ADANIPORTS",
      "APOLLOHOSP",
      "ASIANPAINT",
      "AXISBANK",
      "BAJAJ-AUTO",
      "BAJFINANCE",
      "BAJAJFINSV",
      "BEL",
      "BPCL",
      "BHARTIARTL",
      "BRITANNIA",
      "CIPLA",
      "COALINDIA",
      "DRREDDY",
      "EICHERMOT",
      "GRASIM",
      "HCLTECH",
      "HDFCBANK",
      "HDFCLIFE",
      "HEROMOTOCO",
      "HINDALCO",
      "HINDUNILVR",
      "ICICIBANK",
      "ITC",
      "INDUSINDBK",
      "INFY",
      "JSWSTEEL",
      "KOTAKBANK",
      "LT",
      "M&M",
      "MARUTI",
      "NTPC",
      "NESTLEIND",
      "ONGC",
      "POWERGRID",
      "RELIANCE",
      "SBILIFE",
      "SHRIRAMFIN",
      "SBIN",
      "SUNPHARMA",
      "TCS",
      "TATACONSUM",
      "TATAMOTORS",
      "TATASTEEL",
      "TECHM",
      "TITAN",
      "TRENT",
      "ULTRACEMCO",
      "WIPRO",
    ],
  },
  NIFTY_NEXT_50: {
    id: "NIFTY_NEXT_50",
    name: "Nifty Next 50",
    description: "Junior Nifty high-growth large-cap constituents",
    symbols: [
      "ABB",
      "ACC",
      "AMBUJACEM",
      "ATGL",
      "BANKBARODA",
      "BERGEPAINT",
      "BHEL",
      "BOSCHLTD",
      "CANBK",
      "CHOLAFIN",
      "COLPAL",
      "CONCOR",
      "DABUR",
      "DIVISLAB",
      "DLF",
      "DMART",
      "ETERNAL",
      "GAIL",
      "GODREJCP",
      "HAL",
      "HAVELLS",
      "HDFCAMC",
      "ICICIGI",
      "ICICIPRULI",
      "INDIGO",
      "IOC",
      "IRCTC",
      "IRFC",
      "JINDALSTEL",
      "JIOFIN",
      "LICI",
      "MARICO",
      "MAXHEALTH",
      "MOTHERSON",
      "MUTHOOTFIN",
      "NAUKRI",
      "PAGEIND",
      "PFC",
      "PIDILITIND",
      "PNB",
      "RECLTD",
      "SBICARD",
      "SHREECEM",
      "SIEMENS",
      "SOLARINDS",
      "SRF",
      "TATAPOWER",
      "TORNTPHARM",
      "TVSMOTOR",
      "VBL",
    ],
  },
  BANKING: {
    id: "BANKING",
    name: "Banking & Finance",
    description: "Leading private & PSU lenders and NBFCs",
    symbols: [
      "HDFCBANK",
      "ICICIBANK",
      "SBIN",
      "KOTAKBANK",
      "AXISBANK",
      "INDUSINDBK",
      "BANKBARODA",
      "PNB",
      "BAJFINANCE",
      "BAJAJFINSV",
      "CHOLAFIN",
      "MUTHOOTFIN",
      "SHRIRAMFIN",
    ],
  },
  IT: {
    id: "IT",
    name: "IT & Tech",
    description: "Top software exporters and IT leaders",
    symbols: [
      "TCS",
      "INFY",
      "HCLTECH",
      "WIPRO",
      "TECHM",
      "LTIM",
      "PERSISTENT",
      "COFORGE",
      "MPHASIS",
      "TATAELXSI",
      "KPITTECH",
    ],
  },
  DEFENSE_PSU: {
    id: "DEFENSE_PSU",
    name: "Defense & PSU",
    description: "Aerospace, defense, and public sector heavyweights",
    symbols: [
      "BEL",
      "HAL",
      "BDL",
      "MAZDOCK",
      "COCHINSHIP",
      "BHEL",
      "NTPC",
      "POWERGRID",
      "COALINDIA",
      "ONGC",
      "IOC",
      "GAIL",
      "SAIL",
    ],
  },
  AUTO: {
    id: "AUTO",
    name: "Auto & Mobility",
    description: "Automakers and EV supply-chain leaders",
    symbols: [
      "MARUTI",
      "TATAMOTORS",
      "M&M",
      "BAJAJ-AUTO",
      "HEROMOTOCO",
      "EICHERMOT",
      "TVSMOTOR",
      "BHARATFORG",
      "SONACOMS",
      "MOTHERSON",
    ],
  },
  PHARMA: {
    id: "PHARMA",
    name: "Pharma & Health",
    description: "Top pharmaceutical, healthcare, and biotech leaders",
    symbols: [
      "SUNPHARMA",
      "DRREDDY",
      "CIPLA",
      "DIVISLAB",
      "APOLLOHOSP",
      "MAXHEALTH",
      "TORNTPHARM",
      "LUPIN",
      "AUROPHARMA",
      "MANKIND",
      "ZYDUSLIFE",
      "ALKEM",
      "BIOCON",
      "GLENMARK",
      "IPCALAB",
    ],
  },
  ENERGY_POWER: {
    id: "ENERGY_POWER",
    name: "Energy & Power",
    description: "Clean energy, power generation, utilities, and oil & gas majors",
    symbols: [
      "TATAPOWER",
      "NTPC",
      "POWERGRID",
      "SUZLON",
      "IREDA",
      "NHPC",
      "SJVN",
      "ADANIGREEN",
      "ADANIPOWER",
      "IOC",
      "BPCL",
      "GAIL",
      "PETRONET",
      "ONGC",
      "RELIANCE",
    ],
  },
  METALS: {
    id: "METALS",
    name: "Metals & Mining",
    description: "High-beta steel, aluminum, copper, and mining producers",
    symbols: [
      "TATASTEEL",
      "JSWSTEEL",
      "HINDALCO",
      "JINDALSTEL",
      "VEDL",
      "COALINDIA",
      "NMDC",
      "SAIL",
      "NATIONALUM",
      "HINDCOPPER",
    ],
  },
  RAILWAYS_INFRA: {
    id: "RAILWAYS_INFRA",
    name: "Railways & Infra",
    description: "High-momentum railway engineering, public capex, and infrastructure leaders",
    symbols: [
      "IRFC",
      "RVNL",
      "IRCTC",
      "RAILTEL",
      "RITES",
      "IRCON",
      "TITAGARH",
      "JWL",
      "CONCOR",
      "LT",
      "NBCC",
    ],
  },
  FMCG: {
    id: "FMCG",
    name: "FMCG & Consumer",
    description: "Fast-moving consumer goods, beverages, and consumption bellwethers",
    symbols: [
      "HINDUNILVR",
      "ITC",
      "NESTLEIND",
      "BRITANNIA",
      "TATACONSUM",
      "VBL",
      "DABUR",
      "MARICO",
      "GODREJCP",
      "COLPAL",
      "UNITDSPR",
      "RADICO",
      "JUBLFOOD",
    ],
  },
  MIDCAP_GROWTH: {
    id: "MIDCAP_GROWTH",
    name: "Midcap Momentum & EMS",
    description: "High-growth electronics manufacturing (EMS), cable/wire, and fintech breakouts",
    symbols: [
      "DIXON",
      "POLYCAB",
      "KAYNES",
      "CDSL",
      "MCX",
      "ANGELONE",
      "BSE",
      "FEDERALBNK",
      "PERSISTENT",
      "TRENT",
      "AMBER",
      "SYRMA",
    ],
  },
  NIFTY_MIDCAP_50: {
    id: "NIFTY_MIDCAP_50",
    name: "Nifty Midcap 50",
    description: "Benchmark 50 mid-sized high-growth market leaders",
    symbols: [
      "ALKEM",
      "ASHOKLEY",
      "ASTRAL",
      "AUROPHARMA",
      "BALKRISIND",
      "BANDHANBNK",
      "BHARATFORG",
      "BSE",
      "CDSL",
      "CGPOWER",
      "COCHINSHIP",
      "COFORGE",
      "CONCOR",
      "CUMMINSIND",
      "DALBHARAT",
      "DEEPAKNTR",
      "DIXON",
      "ESCORTS",
      "FEDERALBNK",
      "GODREJPROP",
      "HINDPETRO",
      "IDFCFIRSTB",
      "INDHOTEL",
      "INDIANB",
      "INDUSTOWER",
      "JUBLFOOD",
      "KPITTECH",
      "LUPIN",
      "MAZDOCK",
      "MPHASIS",
      "MRF",
      "MUTHOOTFIN",
      "OBEROIRLTY",
      "OFSS",
      "PERSISTENT",
      "PETRONET",
      "PHOENIXLTD",
      "PIIND",
      "POLYCAB",
      "PRESTIGE",
      "RVNL",
      "SAIL",
      "SUPREMEIND",
      "SUZLON",
      "TATACOMM",
      "TATAELXSI",
      "TATATECH",
      "UBL",
      "VOLTAS",
      "YESBANK",
    ],
  },
  EXCHANGES_MARKET_INFRA: {
    id: "EXCHANGES_MARKET_INFRA",
    name: "Exchanges & Depositories",
    description: "Stock exchanges, depositories (CDSL & NSDL), market tech, AMCs & broking houses",
    symbols: [
      "BSE",
      "CDSL",
      "NSDL",
      "MCX",
      "CAMS",
      "KFINTECH",
      "ANGELONE",
      "MOTILALOFS",
      "ANANDRATHI",
      "HDFCAMC",
      "NAM-INDIA",
      "UTIAMC",
      "GEOJITFSL",
      "5PAISA",
    ],
  },
  REALTY: {
    id: "REALTY",
    name: "Realty & Real Estate",
    description: "Top real estate developers, commercial REIT sponsors, and property leaders",
    symbols: [
      "BRIGADE",
      "DLF",
      "GODREJPROP",
      "LODHA",
      "OBEROIRLTY",
      "PHOENIXLTD",
      "PRESTIGE",
      "SIGNATURE",
      "SOBHA",
    ],
  },
  CHEMICALS: {
    id: "CHEMICALS",
    name: "Chemicals & Agri",
    description: "Specialty chemicals, agrochemicals, and industrial chemical exporters",
    symbols: [
      "AARTIIND",
      "ATUL",
      "CHAMBLFERT",
      "COROMANDEL",
      "DEEPAKNTR",
      "FLUOROCHEM",
      "NAVINFLUOR",
      "PIIND",
      "SRF",
      "TATACHEM",
      "UPL",
    ],
  },
  PSU_BANKS: {
    id: "PSU_BANKS",
    name: "PSU Banks",
    description: "State-owned commercial banks and public sector lending institutions",
    symbols: [
      "BANKBARODA",
      "BANKINDIA",
      "CANBK",
      "CENTRALBK",
      "INDIANB",
      "IOB",
      "MAHABANK",
      "PNB",
      "SBIN",
      "UCOBANK",
      "UNIONBANK",
    ],
  },
  CAPITAL_GOODS: {
    id: "CAPITAL_GOODS",
    name: "Capital Goods & Engg",
    description: "Heavy electricals, power equipment, cables, and industrial engineering",
    symbols: [
      "ABB",
      "AIAENG",
      "BHEL",
      "BHARATFORG",
      "CGPOWER",
      "CUMMINSIND",
      "DIXON",
      "KAYNES",
      "KEI",
      "POLYCAB",
      "SIEMENS",
      "THERMAX",
    ],
  },
  NEW_AGE_TECH: {
    id: "NEW_AGE_TECH",
    name: "New-Age Tech",
    description: "Consumer internet platforms, fintech, and digital marketplace leaders",
    symbols: [
      "CARTRADE",
      "DELHIVERY",
      "MAPMYINDIA",
      "NAUKRI",
      "NYKAA",
      "PAYTM",
      "POLICYBZR",
      "ZOMATO",
    ],
  },
  CEMENT_BUILDING: {
    id: "CEMENT_BUILDING",
    name: "Cement & Building",
    description: "Cement manufacturers, building products, pipes, and ceramics",
    symbols: [
      "ACC",
      "AMBUJACEM",
      "ASTRAL",
      "DALBHARAT",
      "JKCEMENT",
      "KAJARIACER",
      "RAMCOCEM",
      "SHREECEM",
      "SUPREMEIND",
      "ULTRACEMCO",
    ],
  },
  GREEN_ENERGY: {
    id: "GREEN_ENERGY",
    name: "Green Energy & EV",
    description: "Renewable energy, solar, wind, and EV battery & mobility ecosystem",
    symbols: [
      "ADANIGREEN",
      "ARE&M",
      "BORORENEW",
      "EXIDEIND",
      "INOXWIND",
      "IREDA",
      "JBMA",
      "OLECTRA",
      "SUZLON",
      "TATAPOWER",
    ],
  },
  FNO_MOMENTUM: {
    id: "FNO_MOMENTUM",
    name: "F&O Momentum",
    description: "High-beta breakout stocks and liquid movers in the derivative segment",
    symbols: [
      "BEL",
      "BHEL",
      "BSE",
      "CANBK",
      "COCHINSHIP",
      "COFORGE",
      "DIXON",
      "HAL",
      "MCX",
      "POLYCAB",
      "RVNL",
      "TRENT",
      "VEDL",
      "VOLTAS",
    ],
  },
  CUSTOM: {
    id: "CUSTOM",
    name: "Custom Symbols",
    description: "Enter your own comma-separated list of NSE stocks",
    symbols: [],
  },
};

const WATCHLIST_CATEGORIES = [
  {
    id: "INDICES",
    label: "Indices",
    icon: "🏛️",
    presetIds: ["LEADERS", "NIFTY50", "NIFTY_NEXT_50", "NIFTY_MIDCAP_50"],
  },
  {
    id: "SECTORS",
    label: "Core Sectors",
    icon: "🏭",
    presetIds: [
      "BANKING",
      "IT",
      "AUTO",
      "PHARMA",
      "ENERGY_POWER",
      "METALS",
      "FMCG",
      "CHEMICALS",
    ],
  },
  {
    id: "THEMATIC",
    label: "Thematic & Infra",
    icon: "🚀",
    presetIds: [
      "REALTY",
      "PSU_BANKS",
      "DEFENSE_PSU",
      "RAILWAYS_INFRA",
      "CAPITAL_GOODS",
      "GREEN_ENERGY",
      "CEMENT_BUILDING",
    ],
  },
  {
    id: "MOMENTUM",
    label: "Momentum & Tech",
    icon: "⚡",
    presetIds: [
      "FNO_MOMENTUM",
      "MIDCAP_GROWTH",
      "NEW_AGE_TECH",
      "EXCHANGES_MARKET_INFRA",
    ],
  },
  {
    id: "CUSTOM",
    label: "Custom",
    icon: "✏️",
    presetIds: ["CUSTOM"],
  },
];

const BATCH_CONCURRENCY = 4;

/**
 * Interactive client-side real-time stock screener component.
 * Allows screening NSE universe tickers with concurrent analysis, metrics, and risk lifecycle guards.
 * @returns {JSX.Element}
 */
export default function ScreenerClient() {
  const [activeCategory, setActiveCategory] = useState("INDICES");
  const [activePreset, setActivePreset] = useState("LEADERS");
  const [customInput, setCustomInput] = useState("BEL, TCS, HAL, RELIANCE, INFY, SBIN, ZOMATO");
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState({ current: 0, total: 0 });
  const [results, setResults] = useState([]);
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedModalStock, setSelectedModalStock] = useState(null);

  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [passcode, setPasscode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState("");
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);

  useEffect(() => {
    let mounted = true;
    checkScreenerAccessAction()
      .then((res) => {
        if (mounted) {
          setIsAuthenticated(Boolean(res?.authenticated));
          setIsCheckingAuth(false);
        }
      })
      .catch((err) => {
        console.error("[checkScreenerAccessAction] failed:", err);
        if (mounted) {
          setIsAuthenticated(false);
          setIsCheckingAuth(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  /**
   * Submits the entered passcode to verify access and unlock the screener session.
   * @param {React.FormEvent} [e] - Optional form submission event.
   */
  const handleUnlock = async (e) => {
    if (e) e.preventDefault();
    if (!passcode.trim() || isSubmittingAuth) return;
    setAuthError("");
    setIsSubmittingAuth(true);
    try {
      const res = await verifyScreenerAccessAction(passcode);
      if (res?.success) {
        setIsAuthenticated(true);
        setPasscode("");
      } else {
        setAuthError(res?.error || "Invalid passcode. Please try again.");
      }
    } catch {
      setAuthError("Failed to verify passcode. Please try again.");
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  /**
   * Terminates the current screener session and locks access upon confirmed server action.
   */
  const handleLock = async () => {
    try {
      const res = await lockScreenerAccessAction();
      if (res?.success) {
        setIsAuthenticated(false);
      }
    } catch (err) {
      console.error("[handleLock] failed:", err);
    }
  };

  const scanRunIdRef = useRef(0);

  // Active symbols based on selected preset with duplicate removal
  const targetSymbols = useMemo(() => {
    if (activePreset === "CUSTOM") {
      return [
        ...new Set(
          customInput
            .split(/[,\s]+/)
            .map((s) => s.trim().toUpperCase())
            .filter(Boolean)
        ),
      ];
    }
    return PRESETS[activePreset]?.symbols || [];
  }, [activePreset, customInput]);

  const handleSelectCategory = (catId) => {
    if (isScanning) return;
    setActiveCategory(catId);
    const cat = WATCHLIST_CATEGORIES.find((c) => c.id === catId);
    if (cat && !cat.presetIds.includes(activePreset)) {
      setActivePreset(cat.presetIds[0]);
    }
  };

  // Presets belonging to the selected category
  const currentCategoryPresets = useMemo(() => {
    const cat = WATCHLIST_CATEGORIES.find((c) => c.id === activeCategory);
    if (!cat) return Object.values(PRESETS);
    return cat.presetIds.map((id) => PRESETS[id]).filter(Boolean);
  }, [activeCategory]);

  /**
   * Starts concurrent scanning across target symbols and streams real-time analysis results.
   */
  const handleStartScan = useCallback(async () => {
    if (!targetSymbols.length || isScanning) return;

    const runId = ++scanRunIdRef.current;
    const isStale = () => scanRunIdRef.current !== runId;

    setIsScanning(true);
    setResults([]);
    setScanProgress({ current: 0, total: targetSymbols.length });

    const total = targetSymbols.length;
    let completed = 0;

    // Concurrency queue processor
    const queue = [...targetSymbols];
    const workers = Array.from({ length: Math.min(BATCH_CONCURRENCY, total) }, async () => {
      while (queue.length > 0 && !isStale()) {
        const symbol = queue.shift();
        if (!symbol) break;

        try {
          const res = await getStockSignalAction({
            symbol,
            exchange: "NSE",
            timeframe: "1d",
          });

          if (isStale()) break;

          if (res?.success && res?.data?.signal) {
            const sig = res.data.signal;
            const inst = res.data.instrument;
            const perf = res.data.signalPerformance;

            const isBuy = sig.signal === "BUY";
            const isExit = sig.signal === "EXIT";

            const item = {
              symbol,
              name: inst?.name || symbol,
              price: sig.price != null ? sig.price : null,
              regime: sig.marketRegime || "UNKNOWN",
              signal: sig.signal || "NO_TRADE",
              action: sig.action || "WAIT",
              bullishScore: sig.bullishScore ?? null,
              bearishScore: sig.bearishScore ?? null,
              adx: sig.indicators?.adx != null ? Number(sig.indicators.adx) : null,
              rsi: sig.indicators?.rsi != null ? Number(sig.indicators.rsi) : null,
              status: sig.status || "OK",
              reason: isBuy
                ? "HIGH CONFLUENCE BUY SETUP"
                : isExit
                  ? "EXIT / TAKE PROFIT / CUT LOSS"
                  : sig.freshEntryBlocked
                    ? `Wait (${
                        sig.maturedSignalStatus === "TARGET_2_HIT"
                          ? "Target 2 Reached"
                          : sig.maturedSignalStatus === "TARGET_1_HIT"
                            ? "Target 1 Reached"
                            : "Rally Extended"
                      })`
                    : sig.action === "AVOID"
                      ? "Downtrend / Below 200 EMA"
                      : sig.status === "INSUFFICIENT_DATA"
                        ? "Insufficient Data"
                        : "Consolidation / Low Trend Momentum",
              performance: perf,
              timestamp: sig.timestamp,
            };

            if (!isStale()) {
              setResults((prev) => [...prev, item]);
            }
          } else {
            // Placeholder for failed stock fetch
            if (!isStale()) {
              setResults((prev) => [
                ...prev,
                {
                  symbol,
                  name: symbol,
                  price: null,
                  regime: "UNKNOWN",
                  signal: "NO_TRADE",
                  action: "WAIT",
                  bullishScore: null,
                  bearishScore: null,
                  adx: null,
                  rsi: null,
                  status: "ERROR",
                  reason: res?.error || "Data unavailable",
                },
              ]);
            }
          }
        } catch (err) {
          if (!isStale()) {
            setResults((prev) => [
              ...prev,
              {
                symbol,
                name: symbol,
                price: null,
                regime: "UNKNOWN",
                signal: "NO_TRADE",
                action: "WAIT",
                bullishScore: null,
                bearishScore: null,
                adx: null,
                rsi: null,
                status: "ERROR",
                reason: err.message || "Failed to scan",
              },
            ]);
          }
        } finally {
          if (!isStale()) {
            completed++;
            setScanProgress({ current: completed, total });
          }
        }
      }
    });

    await Promise.all(workers);
    if (!isStale()) {
      setIsScanning(false);
    }
  }, [targetSymbols, isScanning]);

  /**
   * Cancels the active scan run and prevents stale worker writes.
   */
  const handleStopScan = useCallback(() => {
    scanRunIdRef.current++;
    setIsScanning(false);
  }, []);

  // Summary Metrics Counts
  const metrics = useMemo(() => {
    let buy = 0;
    let exit = 0;
    let wait = 0;
    let avoid = 0;

    for (const r of results) {
      if (r.signal === "BUY") buy++;
      else if (r.signal === "EXIT") exit++;
      else if (r.action === "AVOID") avoid++;
      else wait++;
    }

    return {
      total: results.length,
      buy,
      exit,
      wait,
      avoid,
    };
  }, [results]);

  // Filtered Results
  const filteredResults = useMemo(() => {
    return results.filter((item) => {
      // 1. Filter Tab
      if (activeFilter === "BUY" && item.signal !== "BUY") return false;
      if (activeFilter === "EXIT" && item.signal !== "EXIT") return false;
      if (activeFilter === "WAIT" && (item.signal === "BUY" || item.signal === "EXIT" || item.action === "AVOID")) return false;
      if (activeFilter === "AVOID" && item.action !== "AVOID") return false;

      // 2. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toUpperCase();
        const matchesSymbol = item.symbol.toUpperCase().includes(q);
        const matchesName = (item.name || "").toUpperCase().includes(q);
        if (!matchesSymbol && !matchesName) return false;
      }

      return true;
    });
  }, [results, activeFilter, searchQuery]);

  const progressPercent = scanProgress.total > 0
    ? Math.round((scanProgress.current / scanProgress.total) * 100)
    : 0;

  return (
    <div className="screener-page">
      {/* ── Top Navigation Bar ── */}
      <nav className="screener-nav" aria-label="Main Navigation">
        <Link href="/" className="screener-brand">
          <h1>⚡ Panarwala Market Screener</h1>
        </Link>
        <div className="screener-nav-links">
          <Link href="/" className="nav-pill-link">
            📈 Interactive Chart
          </Link>
          <Link href="/screener" className="nav-pill-link active">
            🔍 Signals Screener
          </Link>
          <Link href="/optionchain" className="nav-pill-link">
            📊 Option Chain
          </Link>
          <Link href="/TradingView" className="nav-pill-link">
            ⚡ TradingView
          </Link>
          {isAuthenticated && (
            <button
              type="button"
              onClick={handleLock}
              className="nav-lock-btn"
              title="Lock Screener Session"
            >
              <FiLock size={12} /> Lock
            </button>
          )}
        </div>
      </nav>

      {/* ── Main Container ── */}
      <div className="screener-container">
        {isCheckingAuth ? (
          <div className="screener-auth-loading">
            <div className="signal-spinner" />
            <p>Verifying screener access permissions...</p>
          </div>
        ) : !isAuthenticated ? (
          <div className="screener-lock-wrapper">
            <div className="lock-card">
              <div className="lock-icon-circle">
                <FiShield size={34} />
              </div>
              <h2>Restricted Access: Market Screener</h2>
              <p className="lock-subtitle">
                Real-time algorithmic NSE stock scanning is reserved for authorized traders.
                Please enter your passcode to unlock.
              </p>

              <form onSubmit={handleUnlock} className="lock-form">
                <div className="lock-input-group">
                  <span className="lock-input-icon"><FiKey size={16} /></span>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter access passcode..."
                    value={passcode}
                    onChange={(e) => {
                      setPasscode(e.target.value);
                      if (authError) setAuthError("");
                    }}
                    autoFocus
                    disabled={isSubmittingAuth}
                  />
                  <button
                    type="button"
                    className="btn-toggle-eye"
                    onClick={() => setShowPassword((prev) => !prev)}
                    title={showPassword ? "Hide passcode" : "Show passcode"}
                    tabIndex={-1}
                  >
                    {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                  </button>
                </div>

                {authError && (
                  <div className="auth-error-banner" role="alert">
                    <FiAlertTriangle size={14} />
                    <span>{authError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="btn-unlock"
                  disabled={isSubmittingAuth || !passcode.trim()}
                >
                  {isSubmittingAuth ? "Verifying..." : "🔓 Unlock Screener"}
                </button>
              </form>

              <div className="lock-footer-hint">
                🔒 Protected by secure 30-day session authentication.
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* ── Control Hero ── */}
            <section className="screener-hero" aria-labelledby="screener-heading">
          <div className="screener-hero-header">
            <div className="screener-title-block">
              <h2 id="screener-heading">NSE Real-Time Algorithmic Signal Screener</h2>
              <p>
                Scan watchlist stocks across 200 EMA trend gates, 52-week high momentum, ADX strength, and RSI confluence.
              </p>
            </div>
            <div className="screener-actions-block">
              {isScanning ? (
                <button
                  type="button"
                  onClick={handleStopScan}
                  className="btn-scan-stop"
                  aria-label="Stop current scan"
                >
                  <FiSquare size={16} /> Stop Scan
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStartScan}
                  disabled={targetSymbols.length === 0}
                  className="btn-scan-primary"
                  aria-label="Start market scan"
                >
                  <FiPlay size={16} /> Run Screener ({targetSymbols.length} Stocks)
                </button>
              )}
            </div>
          </div>

          {/* Watchlist Category Tabs */}
          <div className="preset-categories-tabs" role="tablist" aria-label="Watchlist universe categories">
            {WATCHLIST_CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={`category-tab-btn ${isActive ? "active" : ""}`}
                  onClick={() => handleSelectCategory(cat.id)}
                  disabled={isScanning}
                >
                  <span className="cat-icon">{cat.icon}</span>
                  <span className="cat-name">{cat.label}</span>
                  {cat.id !== "CUSTOM" && (
                    <span className="cat-count">{cat.presetIds.length}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Preset Buttons for Active Category */}
          <div className="presets-row" role="group" aria-label="Watchlist presets in selected category">
            {currentCategoryPresets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className={`preset-btn ${activePreset === preset.id ? "active" : ""}`}
                onClick={() => setActivePreset(preset.id)}
                disabled={isScanning}
              >
                <span>{preset.name}</span>
                {preset.id !== "CUSTOM" && (
                  <span className="preset-pill-count">
                    {preset.symbols.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Active Preset Description & Stats */}
          {PRESETS[activePreset]?.description && (
            <div className="preset-meta-info">
              <span className="preset-desc">{PRESETS[activePreset].description}</span>
              {activePreset !== "CUSTOM" && (
                <span className="preset-count-badge">
                  {targetSymbols.length} {targetSymbols.length === 1 ? "Stock" : "Stocks"}
                </span>
              )}
            </div>
          )}

          {/* Custom Input when active */}
          {activePreset === "CUSTOM" && (
            <div className="custom-input-box">
              <input
                type="text"
                placeholder="Enter stock symbols separated by commas (e.g. BEL, TCS, HAL, RELIANCE, INFY)"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                disabled={isScanning}
                aria-label="Custom stock symbols"
              />
              <div className="custom-hint">
                Enter any valid NSE tickers or ETFs. Comma or space separated.
              </div>
            </div>
          )}

          {/* Progress Bar when scanning */}
          {(isScanning || scanProgress.current > 0) && (
            <div className="scan-progress-bar-container" role="progressbar" aria-valuenow={progressPercent} aria-valuemin={0} aria-valuemax={100}>
              <div className="scan-progress-header">
                <span>
                  {isScanning
                    ? `Scanning ${scanProgress.current} of ${scanProgress.total} stocks...`
                    : `Completed scan: ${scanProgress.current} stocks analyzed`}
                </span>
                <span>{progressPercent}%</span>
              </div>
              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}
        </section>

        {/* ── Summary Metric Cards ── */}
        <section className="screener-metrics-grid" aria-label="Signal Summary Metrics">
          <div className="metric-card card-scanned">
            <span className="metric-label">Scanned</span>
            <span className="metric-value">{metrics.total}</span>
            <span className="metric-sub">of {targetSymbols.length} total</span>
          </div>

          <div className="metric-card card-buy">
            <span className="metric-label">🟢 BUY Signals</span>
            <span className="metric-value">{metrics.buy}</span>
            <span className="metric-sub">High Confluence Entry</span>
          </div>

          <div className="metric-card card-exit">
            <span className="metric-label">🛑 EXIT Signals</span>
            <span className="metric-value">{metrics.exit}</span>
            <span className="metric-sub">Take Profit / Stop Loss</span>
          </div>

          <div className="metric-card card-wait">
            <span className="metric-label">🟡 WAIT / Neutral</span>
            <span className="metric-value">{metrics.wait}</span>
            <span className="metric-sub">Choppy / Low ADX</span>
          </div>

          <div className="metric-card card-avoid">
            <span className="metric-label">🔴 AVOID (Traps)</span>
            <span className="metric-value">{metrics.avoid}</span>
            <span className="metric-sub">Downtrend / Below 200 EMA</span>
          </div>
        </section>

        {/* ── Filter & Search Toolbar ── */}
        <section className="screener-filter-bar" aria-label="Table filters">
          <div className="filter-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeFilter === "ALL"}
              className={`filter-tab-btn ${activeFilter === "ALL" ? "active" : ""}`}
              onClick={() => setActiveFilter("ALL")}
            >
              All ({results.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeFilter === "BUY"}
              className={`filter-tab-btn ${activeFilter === "BUY" ? "active" : ""}`}
              onClick={() => setActiveFilter("BUY")}
            >
              🟢 BUY ({metrics.buy})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeFilter === "EXIT"}
              className={`filter-tab-btn ${activeFilter === "EXIT" ? "active" : ""}`}
              onClick={() => setActiveFilter("EXIT")}
            >
              🛑 EXIT ({metrics.exit})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeFilter === "WAIT"}
              className={`filter-tab-btn ${activeFilter === "WAIT" ? "active" : ""}`}
              onClick={() => setActiveFilter("WAIT")}
            >
              🟡 WAIT ({metrics.wait})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeFilter === "AVOID"}
              className={`filter-tab-btn ${activeFilter === "AVOID" ? "active" : ""}`}
              onClick={() => setActiveFilter("AVOID")}
            >
              🔴 AVOID ({metrics.avoid})
            </button>
          </div>

          <div className="search-box">
            <FiSearch size={14} color="#8b949e" />
            <input
              type="search"
              placeholder="Search symbol or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Filter scanned results"
            />
          </div>
        </section>

        {/* ── Interactive Results Table ── */}
        <div className="table-wrapper">
          {filteredResults.length === 0 ? (
            <div className="table-empty-state">
              <div className="empty-icon">📊</div>
              {results.length === 0 ? (
                <>
                  <p>No stocks scanned yet.</p>
                  <button
                    type="button"
                    onClick={handleStartScan}
                    className="btn-scan-primary"
                  >
                    <FiPlay size={14} /> Start Screener Now
                  </button>
                </>
              ) : (
                <p>No stocks match your filter criteria.</p>
              )}
            </div>
          ) : (
            <table className="screener-table" aria-label="Stock signals table">
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Price</th>
                  <th>Regime</th>
                  <th>Signal</th>
                  <th>Action</th>
                  <th>Bull/Bear</th>
                  <th>ADX (Trend)</th>
                  <th>RSI (14)</th>
                  <th>Status &amp; Reason</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredResults.map((row) => {
                  const isBuy = row.signal === "BUY";
                  const isExit = row.signal === "EXIT";
                  const isHold = row.signal === "HOLD";
                  const isAvoid = row.action === "AVOID";

                  const signalClass = isBuy
                    ? "signal-buy"
                    : isExit
                      ? "signal-exit"
                      : isHold
                        ? "signal-hold"
                        : "signal-no-trade";

                  const actionClass = isBuy
                    ? "action-enter"
                    : isExit
                      ? "action-exit"
                      : isAvoid
                        ? "action-avoid"
                        : "action-wait";

                  const regimeClass =
                    row.regime?.includes("BULL")
                      ? "regime-bull"
                      : row.regime?.includes("BEAR")
                        ? "regime-bear"
                        : "regime-side";

                  return (
                    <tr key={row.symbol}>
                      <td>
                        <div className="stock-symbol-cell">
                          <span className="symbol-name">{row.symbol}</span>
                          <span className="company-name" title={row.name}>
                            {row.name}
                          </span>
                        </div>
                      </td>

                      <td className="price-cell">
                        {row.price != null ? `₹${row.price.toFixed(2)}` : "N/A"}
                      </td>

                      <td>
                        <span className={`badge-regime ${regimeClass}`}>
                          {row.regime}
                        </span>
                      </td>

                      <td>
                        <span className={`badge-signal ${signalClass}`}>
                          {isBuy && <FiTrendingUp size={12} />}
                          {isExit && <FiAlertTriangle size={12} />}
                          {isHold && <FiClock size={12} />}
                          {row.signal}
                        </span>
                      </td>

                      <td>
                        <span className={`badge-action ${actionClass}`}>
                          {row.action}
                        </span>
                      </td>

                      <td className="score-cell">
                        <span className="bull-score">
                          {row.bullishScore != null ? row.bullishScore : "-"}
                        </span>
                        <span className="score-slash">/</span>
                        <span className="bear-score">
                          {row.bearishScore != null ? row.bearishScore : "-"}
                        </span>
                      </td>

                      <td>
                        <div className="adx-cell">
                          <span className={row.adx && row.adx >= 25 ? "adx-strong" : "adx-weak"}>
                            {row.adx != null ? row.adx.toFixed(1) : "N/A"}
                          </span>
                        </div>
                      </td>

                      <td>
                        <span className="rsi-val">
                          {row.rsi != null ? row.rsi.toFixed(1) : "N/A"}
                        </span>
                      </td>

                      <td>
                        <div
                          className={`reason-cell ${
                            isBuy
                              ? "reason-buy"
                              : isExit
                                ? "reason-exit"
                                : isAvoid
                                  ? "reason-avoid"
                                  : ""
                          }`}
                        >
                          {row.reason}
                        </div>
                      </td>

                      <td>
                        <div className="table-actions-cell">
                          <Link
                            href={`/?symbol=${encodeURIComponent(row.symbol)}`}
                            className="btn-table-action btn-chart"
                            title={`Open ${row.symbol} in Interactive Candlestick Chart`}
                          >
                            <FiExternalLink size={12} /> Chart
                          </Link>
                          <button
                            type="button"
                            className="btn-table-action btn-details"
                            onClick={() =>
                              setSelectedModalStock({
                                symbol: row.symbol,
                                label: row.name || row.symbol,
                                name: row.name || row.symbol,
                                value: row.symbol,
                                nse: true,
                              })
                            }
                            title={`Inspect algorithmic signal evidence for ${row.symbol}`}
                          >
                            <FiZap size={12} /> Details
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
          </>
        )}
      </div>

      {/* ── Modal Dialog for Deep Signal Evidence Inspection ── */}
      {selectedModalStock && (
        <StockSignalModal
          companyObj={selectedModalStock}
          indexName="NSE_EQ"
          isOpen={Boolean(selectedModalStock)}
          onClose={() => setSelectedModalStock(null)}
        />
      )}
    </div>
  );
}
