"use client";

import React, { useState, useEffect, useCallback, useTransition } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiLock,
  FiKey,
  FiEye,
  FiEyeOff,
  FiShield,
  FiRefreshCw,
  FiExternalLink,
  FiCheck,
  FiCopy,
  FiDownload,
  FiAlertTriangle,
  FiTrendingUp,
  FiTrendingDown,
  FiCompass,
  FiCpu,
} from "react-icons/fi";
import { getDailyMarketBriefingAction } from "../actions/marketBriefing.js";
import {
  checkScreenerAccessAction,
  verifyScreenerAccessAction,
  lockScreenerAccessAction,
} from "../actions/screenerAuth.js";
import "./Briefing.scss";

export default function BriefingClient() {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [passcode, setPasscode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState("");
  const [isVerifying, startVerifyTransition] = useTransition();

  // Briefing state
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [showEquitiesTable, setShowEquitiesTable] = useState(false);

  // ── 1. Check Auth Status on Mount ───────────────────────────────────
  const checkAuth = useCallback(async () => {
    setIsCheckingAuth(true);
    try {
      const res = await checkScreenerAccessAction();
      setIsAuthenticated(res.authenticated);
    } catch (err) {
      setIsAuthenticated(false);
    } finally {
      setIsCheckingAuth(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // ── 2. Fetch Briefing Data once Authenticated ───────────────────────
  const loadBriefing = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError("");
    try {
      const res = await getDailyMarketBriefingAction({ forceRefresh });
      if (!res.authenticated) {
        setIsAuthenticated(false);
        return;
      }
      if (res.success) {
        setData(res);
      } else {
        setError(res.error || "Failed to load market briefing.");
      }
    } catch (err) {
      setError(err?.message || "An unexpected error occurred while fetching briefing.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadBriefing(false);
    }
  }, [isAuthenticated, loadBriefing]);

  // ── 3. Handle Passcode Submission ──────────────────────────────────
  const handlePasscodeSubmit = (e) => {
    e.preventDefault();
    setAuthError("");

    startVerifyTransition(async () => {
      const res = await verifyScreenerAccessAction(passcode);
      if (res.success) {
        setIsAuthenticated(true);
        setPasscode("");
      } else {
        setAuthError(res.error || "Invalid access passcode.");
      }
    });
  };

  // ── 4. Handle Lock Session ─────────────────────────────────────────
  const handleLock = async () => {
    await lockScreenerAccessAction();
    setIsAuthenticated(false);
    setData(null);
  };

  // ── 5. Copy Markdown Report ────────────────────────────────────────
  const handleCopyMarkdown = () => {
    if (!data?.markdown) return;
    navigator.clipboard.writeText(data.markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── 6. Download Markdown Report ───────────────────────────────────
  const handleDownloadMarkdown = () => {
    if (!data?.markdown) return;
    const blob = new Blob([data.markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `daily-briefing-${data.dateStr || "report"}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // ── Render Lock Screen if Unauthenticated ─────────────────────────
  if (!isAuthenticated && !isCheckingAuth) {
    return (
      <div className="briefing-page">
        <nav className="briefing-nav" aria-label="Main Navigation">
          <Link href="/" className="briefing-brand">
            <h1>🤖 AI Pre-Market & Daily Briefing</h1>
          </Link>
          <div className="briefing-nav-links">
            <Link href="/" className="nav-pill-link">
              📈 Interactive Chart
            </Link>
            <Link href="/screener" className="nav-pill-link">
              🔍 Signals Screener
            </Link>
            <Link href="/heatmap" className="nav-pill-link">
              🗺️ Sector Heatmap
            </Link>
            <Link href="/optionchain" className="nav-pill-link">
              📊 Option Chain
            </Link>
            <Link href="/TradingView" className="nav-pill-link">
              ⚡ TradingView
            </Link>
          </div>
        </nav>

        <div className="briefing-lock-screen">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="lock-card"
          >
            <div className="lock-icon-badge">
              <FiShield size={28} />
            </div>
            <h2 className="lock-title">Protected AI Briefing</h2>
            <p className="lock-subtitle">
              Enter your access passcode to view AI-synthesized pre-market intelligence, swing setups, and institutional breadth.
            </p>

            <form onSubmit={handlePasscodeSubmit}>
              <div className="lock-input-wrap">
                <FiKey className="lock-field-icon" size={16} />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter access passcode…"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  autoFocus
                  required
                />
                <button
                  type="button"
                  className="lock-eye-btn"
                  onClick={() => setShowPassword((p) => !p)}
                  title={showPassword ? "Hide passcode" : "Show passcode"}
                >
                  {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                </button>
              </div>

              {authError && <div className="lock-error-msg">{authError}</div>}

              <button
                type="submit"
                className="lock-submit-btn"
                disabled={isVerifying || !passcode.trim()}
              >
                {isVerifying ? "Verifying…" : "Unlock AI Briefing"}
              </button>
            </form>
          </motion.div>
        </div>
      </div>
    );
  }

  const briefing = data?.briefing;
  const aggregated = data?.aggregated;
  const breadth = aggregated?.breadth || { bullishPct: 0, neutralPct: 0, bearishPct: 0 };
  const source = data?.source || "gemini";

  const sentimentClass = briefing?.marketSentiment
    ? briefing.marketSentiment.toLowerCase()
    : "rangebound_consolidation";

  return (
    <div className="briefing-page">
      {/* ── Top Navigation Bar ── */}
      <nav className="briefing-nav" aria-label="Main Navigation">
        <Link href="/" className="briefing-brand">
          <h1>🤖 AI Pre-Market & Daily Briefing</h1>
        </Link>
        <div className="briefing-nav-links">
          <Link href="/" className="nav-pill-link">
            📈 Interactive Chart
          </Link>
          <Link href="/screener" className="nav-pill-link">
            🔍 Signals Screener
          </Link>
          <Link href="/heatmap" className="nav-pill-link">
            🗺️ Sector Heatmap
          </Link>
          <Link href="/briefing" className="nav-pill-link active">
            🤖 AI Briefing
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
              title="Lock Session"
            >
              <FiLock size={12} /> Lock
            </button>
          )}
        </div>
      </nav>

      {/* ── Main Container ── */}
      <div className="briefing-container">
        {/* ── Toolbar / Controls ── */}
        <div className="briefing-toolbar">
          <div className="toolbar-left">
            <button
              type="button"
              onClick={() => loadBriefing(true)}
              disabled={loading}
              className="refresh-btn"
            >
              <FiRefreshCw
                size={14}
                style={{
                  animation: loading ? "spin 1s linear infinite" : "none",
                }}
              />
              {loading ? "Scanning & Synthesizing…" : "⚡ Refresh Briefing"}
            </button>

            <span className={`source-badge ${source}`}>
              <FiCpu size={12} />
              {source === "gemini" ? "Google Gemini AI" : "Quantitative Rule Engine"}
            </span>

            {data?.cached && (
              <span style={{ fontSize: "0.78rem", color: "var(--tx-second, #8b949e)" }}>
                ● Serving cached report for today
              </span>
            )}
          </div>

          <div className="toolbar-right">
            {data?.generatedAt && (
              <span style={{ fontSize: "0.78rem", color: "var(--tx-second, #8b949e)" }}>
                Updated: {new Date(data.generatedAt).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" })} IST
              </span>
            )}

            <button
              type="button"
              onClick={handleCopyMarkdown}
              className="nav-pill-link"
              title="Copy markdown report to clipboard"
            >
              {copied ? <FiCheck size={14} color="#3fb950" /> : <FiCopy size={14} />}
              {copied ? "Copied!" : "Copy Report"}
            </button>

            <button
              type="button"
              onClick={handleDownloadMarkdown}
              className="nav-pill-link"
              title="Download report markdown file"
            >
              <FiDownload size={14} /> Download .md
            </button>
          </div>
        </div>

        {/* ── Error Banner ── */}
        {error && (
          <div className="lock-error-msg" style={{ margin: 0 }}>
            {error}
          </div>
        )}

        {/* ── Loading Skeleton ── */}
        {loading && !data && (
          <div
            style={{
              padding: "48px 24px",
              textAlign: "center",
              color: "var(--tx-second, #8b949e)",
              background: "var(--surface-1, #111824)",
              borderRadius: 12,
              border: "1px solid var(--bd-dim, rgba(255, 255, 255, 0.08))",
            }}
          >
            <FiRefreshCw
              size={28}
              style={{ animation: "spin 1s linear infinite", marginBottom: 12 }}
            />
            <div style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--tx-primary, #f0f6fc)" }}>
              Scanning 16 Liquid Indian Market Leaders…
            </div>
            <div style={{ fontSize: "0.85rem", marginTop: 4 }}>
              Executing multi-factor technical analysis & synthesizing institutional AI trade thesis.
            </div>
          </div>
        )}

        {/* ── Main Briefing Content ── */}
        {briefing && (
          <>
            {/* Hero Sentiment Card */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="sentiment-hero"
            >
              <div className="sentiment-header">
                <span className={`sentiment-pill ${sentimentClass}`}>
                  <FiCompass size={14} />
                  {briefing.marketSentiment?.replace(/_/g, " ") || "MARKET SENTIMENT"}
                </span>

                <span style={{ fontSize: "0.85rem", color: "var(--tx-second, #8b949e)" }}>
                  Universe: <b>{aggregated?.total || 16} Market Leaders & Index ETFs</b>
                </span>
              </div>

              <h2 className="sentiment-headline">{briefing.sentimentHeadline}</h2>
              <p className="sentiment-summary">{briefing.executiveSummary}</p>

              {/* Market Breadth Snapshot */}
              <div className="breadth-section">
                <div className="breadth-labels">
                  <span>
                    Bullish: <b style={{ color: "#3fb950" }}>{breadth.bullishPct}%</b>
                  </span>
                  <span>
                    Neutral / Choppy: <b style={{ color: "#e3b341" }}>{breadth.neutralPct}%</b>
                  </span>
                  <span>
                    Bearish: <b style={{ color: "#f85149" }}>{breadth.bearishPct}%</b>
                  </span>
                </div>

                <div className="breadth-track">
                  <div
                    className="breadth-segment bullish"
                    style={{ width: `${breadth.bullishPct}%` }}
                    title={`Bullish: ${breadth.bullishPct}%`}
                  />
                  <div
                    className="breadth-segment neutral"
                    style={{ width: `${breadth.neutralPct}%` }}
                    title={`Neutral: ${breadth.neutralPct}%`}
                  />
                  <div
                    className="breadth-segment bearish"
                    style={{ width: `${breadth.bearishPct}%` }}
                    title={`Bearish: ${breadth.bearishPct}%`}
                  />
                </div>

                {aggregated?.regimes && (
                  <div className="regimes-pills">
                    {Object.entries(aggregated.regimes).map(([reg, count]) => (
                      <span key={reg} className="regime-badge">
                        {reg}: <b>{count}</b>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>

            {/* Top Swing Setups */}
            <div className="section-title">
              <h2>
                <FiTrendingUp color="#38bdf8" /> Tomorrow's High-Conviction Swing Setups
              </h2>
            </div>

            {briefing.topSwingSetups?.length > 0 ? (
              <div className="setups-grid">
                {briefing.topSwingSetups.map((setup, idx) => (
                  <motion.div
                    key={setup.symbol || idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.08 }}
                    className="setup-card"
                  >
                    <div>
                      <div className="setup-header">
                        <Link
                          href={`/riyazstock?symbol=${setup.symbol}`}
                          className="setup-symbol-link"
                          title={`Open ${setup.symbol} interactive candlestick chart`}
                        >
                          {setup.symbol} <FiExternalLink size={14} />
                        </Link>
                        <span className="setup-type-tag">{setup.setupType}</span>
                      </div>

                      <div className="setup-levels">
                        <div className="level-col entry">
                          <span>Entry Zone</span>
                          <span>{setup.entryZone}</span>
                        </div>
                        <div className="level-col sl">
                          <span>Stop Loss</span>
                          <span>{setup.stopLoss}</span>
                        </div>
                        <div className="level-col tp">
                          <span>Target</span>
                          <span>{setup.target}</span>
                        </div>
                      </div>

                      <div className="setup-rationale">{setup.rationale}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : briefing.marketSentiment === "BEARISH_CORRECTION" ? (
              <div className="defensive-stance-card">
                <div className="defensive-header">
                  <div className="defensive-badge">
                    <FiShield size={18} /> Capital Preservation Mode (Downtrend Defense)
                  </div>
                  <span className="defensive-tag">Strict Risk Filters Active</span>
                </div>
                <p className="defensive-body">
                  Zero fresh swing breakout setups passed institutional criteria today. With {breadth.bearishPct}% of liquid leaders under bearish or exit conditions, risk of false breakouts and bull traps on morning bounces is elevated.
                </p>
                <div className="defensive-rules">
                  <div>
                    <b>🛡️ Tactical Stance:</b> Hold elevated cash reserves and refrain from aggressive dip-buying into distribution.
                  </div>
                  <div>
                    <b>🎯 Reversal Trigger:</b> Wait for index leaders to establish a confirmed higher-low pivot structure and reclaim the 20-day EMA with volume expansion before deploying swing capital.
                  </div>
                </div>
              </div>
            ) : (
              <div className="gameplan-card">
                <p style={{ margin: 0, color: "var(--tx-second, #8b949e)" }}>
                  ⚪ No fresh high-conviction breakout setups met strict risk filters today. Focus on protecting existing positions or await clear structural confirmations.
                </p>
              </div>
            )}

            {/* Active Risk & Distribution Watchlist */}
            {briefing.riskWatchlist?.length > 0 && (
              <>
                <div className="section-title">
                  <h2>
                    <FiAlertTriangle color="#ff7a8a" /> Active Risk & Distribution Alerts
                  </h2>
                </div>
                <div className="risk-grid">
                  {briefing.riskWatchlist.map((risk, idx) => (
                    <div key={risk.symbol || idx} className="risk-card">
                      <FiTrendingDown color="#ff7a8a" size={18} style={{ flexShrink: 0, marginTop: 2 }} />
                      <div>
                        <div className="risk-symbol">{risk.symbol}</div>
                        <div className="risk-warning">{risk.warning}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Tactical Trading Gameplan */}
            {briefing.tacticalGameplan?.length > 0 && (
              <>
                <div className="section-title">
                  <h2>
                    <FiShield color="#c084fc" /> Tactical Trading Gameplan
                  </h2>
                </div>
                <div className="gameplan-card">
                  <ul className="gameplan-list">
                    {briefing.tacticalGameplan.map((rule, idx) => (
                      <li key={idx}>
                        <span className="rule-num">{idx + 1}</span>
                        <span>{rule}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}

            {/* Expandable Scanned Equities Snapshot Table */}
            <div className="section-title">
              <h2>📊 Quantitative Equities Snapshot</h2>
              <button
                type="button"
                className="nav-pill-link"
                onClick={() => setShowEquitiesTable((s) => !s)}
              >
                {showEquitiesTable ? "Hide Raw Data" : "Show All Scanned Equities"}
              </button>
            </div>

            {showEquitiesTable && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="table-card"
              >
                <div className="table-wrap">
                  <table className="snapshot-table">
                    <thead>
                      <tr>
                        <th>Symbol</th>
                        <th>Price</th>
                        <th>Signal</th>
                        <th>Regime</th>
                        <th>Strength</th>
                        <th>RSI</th>
                        <th>ADX</th>
                        <th>Volume Ratio</th>
                      </tr>
                    </thead>
                    <tbody>
                      {aggregated?.buyCandidates?.map((c) => (
                        <tr key={c.symbol}>
                          <td>
                            <Link href={`/riyazstock?symbol=${c.symbol}`} style={{ color: "#38bdf8", fontWeight: 700, textDecoration: "none" }}>
                              {c.symbol}
                            </Link>
                          </td>
                          <td>₹{Number(c.price).toFixed(2)}</td>
                          <td><span style={{ color: "#3fb950", fontWeight: 700 }}>BUY</span></td>
                          <td>{c.regime}</td>
                          <td>{c.strength}/100</td>
                          <td>{c.rsi ? Number(c.rsi).toFixed(1) : "—"}</td>
                          <td>{c.adx ? Number(c.adx).toFixed(1) : "—"}</td>
                          <td>{c.volRatio ? `${Number(c.volRatio).toFixed(1)}x` : "—"}</td>
                        </tr>
                      ))}
                      {aggregated?.exitCandidates?.map((e) => (
                        <tr key={e.symbol}>
                          <td>
                            <Link href={`/riyazstock?symbol=${e.symbol}`} style={{ color: "#ff7a8a", fontWeight: 700, textDecoration: "none" }}>
                              {e.symbol}
                            </Link>
                          </td>
                          <td>₹{Number(e.price).toFixed(2)}</td>
                          <td><span style={{ color: "#f85149", fontWeight: 700 }}>EXIT</span></td>
                          <td>—</td>
                          <td>Bearish Score {e.bearishScore}</td>
                          <td>—</td>
                          <td>—</td>
                          <td>—</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
