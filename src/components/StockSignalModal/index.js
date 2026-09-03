import React, { useState, useEffect, useCallback } from "react";
import Modal from "../TechnicalInfo/Modal";
import { getStockSignalAction } from "../../app/actions/stockSignal";
import "./StockSignalModal.scss";

const StockSignalModal = ({ companyObj, indexName, isOpen = true, onClose }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isHolding, setIsHolding] = useState(false);

  const fetchSignal = useCallback(async (holdingState) => {
    if (!companyObj) return;
    setLoading(true);
    setError(null);

    try {
      const symbol = companyObj.symbol || companyObj.value;
      const isBse = indexName === "BSE_EQ" || companyObj.bse;
      const exchange = isBse ? "BSE" : "NSE";

      const res = await getStockSignalAction({
        symbol,
        exchange,
        holding: Boolean(holdingState),
        timeframe: "1d",
      });

      if (res?.success) {
        setData(res.data);
      } else {
        setError(res?.error || "Failed to retrieve signal");
      }
    } catch (err) {
      const msg = err.message || "An error occurred while fetching signal";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [companyObj, indexName]);


  useEffect(() => {
    if (isOpen && companyObj) {
      fetchSignal(isHolding);
    }
  }, [isOpen, companyObj, isHolding, fetchSignal]);

  const handleToggleHolding = (e) => {
    const nextState = e.target.checked;
    setIsHolding(nextState);
  };

  const signal = data?.signal;
  const instrument = data?.instrument;
  const indicators = signal?.indicators || {};
  const risk = signal?.risk;
  const evidence = signal?.evidence || {};

  const getSignalClass = (sig) => {
    switch (sig) {
      case "BUY":
        return "signal-buy";
      case "EXIT":
        return "signal-exit";
      case "HOLD":
        return "signal-hold";
      default:
        return "signal-no-trade";
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="signal-modal-container">
        {/* Header */}
        <div className="signal-modal-header">
          <div className="signal-title-area">
            <h2>
              {companyObj?.label || companyObj?.name || companyObj?.symbol}
              <span className="badge-exchange">
                {instrument?.exchange || (indexName === "BSE_EQ" ? "BSE" : "NSE")}
              </span>
            </h2>
            <p className="signal-subtitle">
              Ticker: {companyObj?.symbol} | ISIN: {companyObj?.value || instrument?.isin || "N/A"}
            </p>
          </div>

          <div className="signal-top-controls">
            <label className="toggle-holding-label" title="Toggle holding state to evaluate EXIT conditions">
              <input
                type="checkbox"
                checked={isHolding}
                onChange={handleToggleHolding}
                disabled={loading}
              />
              <span>Currently Holding?</span>
            </label>

            <button
              className="btn-refresh"
              onClick={() => fetchSignal(isHolding)}
              disabled={loading}
              title="Refresh analysis"
            >
              {loading ? "Refreshing..." : "↻ Refresh"}
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="signal-loading">
            <div className="signal-spinner" />
            <p>Analyzing OHLCV, market regime & indicators...</p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="signal-error">
            <p className="signal-error-text">✖ {error}</p>
            <button className="btn-refresh" onClick={() => fetchSignal(isHolding)}>
              Try Again
            </button>
          </div>
        )}

        {/* Main Content */}
        {!loading && !error && signal && (
          <>
            {/* Hero Signal Card */}
            <div className="signal-hero-card">
              <div className="signal-badge-wrap">
                <div className={`signal-badge ${getSignalClass(signal.signal)}`}>
                  <span>{signal.signal}</span>
                  <span className="signal-action">/ {signal.action}</span>
                </div>
                <div className="hero-regime-tag">
                  Regime: <strong>{signal.marketRegime}</strong>
                </div>
              </div>

              <div className="hero-meta">
                <div className="hero-price-line">
                  ₹{Number(signal.price).toFixed(2)}
                </div>
                <div className="hero-data-status live">
                  {data.candleStatus === "LIVE_PARTIAL"
                    ? `● LIVE / PRELIMINARY (${data.liveCandle?.sourceCandleCount || 0} 1m candles)`
                    : data.candleStatus === "INTRADAY_SESSION_COMPLETE"
                    ? `● TODAY'S INTRADAY SESSION (${data.liveCandle?.sourceCandleCount || 0} 1m candles)`
                    : `● Completed Historical Daily Candle`}
                </div>
                <div className="hero-data-status">
                  Updated: {data.formattedTimestamp || "N/A"}
                </div>
              </div>
            </div>

            {/* Score Meters */}
            <div className="scores-section">
              <div className="score-card">
                <div className="score-header">
                  <span>Bullish Score</span>
                  <span className="score-num">{signal.bullishScore ?? 0}/100</span>
                </div>
                <div className="score-bar-bg">
                  <div
                    className="score-bar-fill bullish"
                    style={{ width: `${Math.min(signal.bullishScore ?? 0, 100)}%` }}
                  />
                </div>
              </div>

              <div className="score-card">
                <div className="score-header">
                  <span>Bearish Score</span>
                  <span className="score-num">{signal.bearishScore ?? 0}/100</span>
                </div>
                <div className="score-bar-bg">
                  <div
                    className="score-bar-fill bearish"
                    style={{ width: `${Math.min(signal.bearishScore ?? 0, 100)}%` }}
                  />
                </div>
              </div>

              <div className="score-card">
                <div className="score-header">
                  <span>Signal Strength</span>
                  <span className="score-num">{signal.signalStrength ?? 0}</span>
                </div>
                <div className="score-bar-bg">
                  <div
                    className="score-bar-fill strength"
                    style={{ width: `${Math.min(signal.signalStrength ?? 0, 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Risk & Targets Card (only shown for BUY or when risk values exist) */}
            {risk?.entry != null && (
              <div className="risk-card">
                <div className="risk-title">
                  <span>🎯 Trade Risk & Target Levels (ATR-Based)</span>
                </div>
                <div className="risk-grid">
                  <div className="risk-item">
                    <div className="risk-label">Entry Price</div>
                    <div className="risk-val">₹{Number(risk.entry).toFixed(2)}</div>
                  </div>
                  <div className="risk-item">
                    <div className="risk-label">Stop Loss</div>
                    <div className="risk-val" style={{ color: "var(--bear, #dc2626)" }}>
                      ₹{Number(risk.stopLoss).toFixed(2)}
                    </div>
                  </div>
                  <div className="risk-item">
                    <div className="risk-label">Target 1 (1.5R)</div>
                    <div className="risk-val" style={{ color: "var(--bull, #059669)" }}>
                      ₹{Number(risk.target1).toFixed(2)}
                    </div>
                  </div>
                  <div className="risk-item">
                    <div className="risk-label">Target 2 (3.0R)</div>
                    <div className="risk-val" style={{ color: "var(--bull, #059669)" }}>
                      ₹{Number(risk.target2).toFixed(2)}
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* Technical Indicators */}
            <div className="indicators-row">
              <div className="indicator-mini-card">
                <div className="ind-label">RSI (14)</div>
                <div className="ind-val">
                  {indicators.rsi != null ? Number(indicators.rsi).toFixed(2) : "N/A"}
                </div>
              </div>
              <div className="indicator-mini-card">
                <div className="ind-label">ADX (14)</div>
                <div className="ind-val">
                  {indicators.adx != null ? Number(indicators.adx).toFixed(2) : "N/A"}
                </div>
              </div>
              <div className="indicator-mini-card">
                <div className="ind-label">Volume Spike</div>
                <div className="ind-val">
                  {indicators.volumeRatio != null
                    ? `${Number(indicators.volumeRatio).toFixed(2)}x`
                    : "N/A"}
                </div>
              </div>
              <div className="indicator-mini-card">
                <div className="ind-label">ATR</div>
                <div className="ind-val">
                  {indicators.atr != null ? `₹${Number(indicators.atr).toFixed(2)}` : "N/A"}
                </div>
              </div>
            </div>

            {/* Evidence Breakdown */}
            <div className="evidence-section">
              <div className="evidence-box bullish">
                <h4>✓ Bullish Factors</h4>
                {evidence.bullish && evidence.bullish.length > 0 ? (
                  <ul className="evidence-list">
                    {evidence.bullish.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <div className="evidence-none">No qualifying bullish factors</div>
                )}
              </div>

              <div className="evidence-box bearish">
                <h4>⚠ Bearish Factors & Risks</h4>
                {evidence.bearish && evidence.bearish.length > 0 ? (
                  <ul className="evidence-list">
                    {evidence.bearish.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <div className="evidence-none">No active bearish risks</div>
                )}
              </div>
            </div>

            {/* Decision Checks */}
            {evidence.decisionChecks && evidence.decisionChecks.length > 0 && (
              <div className="decision-checks-box">
                <h4>Decision Criteria & Thresholds</h4>
                <ul className="decision-checks-list">
                  {evidence.decisionChecks.map((check, idx) => (
                    <li key={idx}>{check}</li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
};

export default StockSignalModal;
