import React, { useState, useCallback, useMemo } from "react";
import { askGemini } from "../../lib/ai/geminiClient.js";
import {
  buildSignalAiPrompt,
  getVerdictTheme,
} from "./stockSignalAiPrompt.js";

const StockSignalAiCard = ({
  companyObj,
  instrument,
  signal,
  performance,
}) => {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Cache key to remember analysis for this specific symbol and price/signal
  const cacheKey = useMemo(() => {
    const sym = companyObj?.symbol || companyObj?.value || "";
    return `${sym}_${signal?.price}_${signal?.signal}_${signal?.action}`;
  }, [companyObj, signal]);

  const [cachedKey, setCachedKey] = useState(null);

  // Clear analysis if the stock symbol/signal changed
  useEffect(() => {
    if (cachedKey !== cacheKey) {
      setAnalysis(null);
      setError(null);
      setCachedKey(cacheKey);
    }
  }, [cacheKey, cachedKey]);

  const handleRequestAi = useCallback(async () => {
    if (!signal) return;
    setLoading(true);
    setError(null);

    try {
      const prompt = buildSignalAiPrompt({
        companyObj,
        instrument,
        signal,
        performance,
      });

      const res = await askGemini(prompt, {
        systemInstruction:
          "You are a professional SEBI-aligned technical equity analyst specializing in Indian markets. Be objective, risk-conscious, and concise.",
        responseFormat: "json",
        temperature: 0.3,
      });

      if (res?.success && res?.response) {
        const payload = res.response;
        if (
          !payload ||
          typeof payload !== "object" ||
          Array.isArray(payload) ||
          !payload.verdict ||
          !payload.thesis
        ) {
          setError("AI response was incomplete or malformed. Please retry.");
          return;
        }
        setAnalysis(payload);
        setCachedKey(cacheKey);
      } else {
        setError(res?.error || "Unable to generate AI analysis.");
      }
    } catch (err) {
      setError(err?.message || "Failed to communicate with Gemini API.");
    } finally {
      setLoading(false);
    }
  }, [companyObj, instrument, signal, performance, cacheKey]);

  return (
    <div className="signal-ai-card">
      <div className="ai-card-header">
        <div className="ai-title-group">
          <span className="ai-sparkle-icon">✨</span>
          <div>
            <h4 className="ai-title">Gemini AI Second Opinion</h4>
            <span className="ai-subtitle">
              Generative AI validation & tactical risk assessment
            </span>
          </div>
        </div>

        {!analysis && !loading && (
          <button
            className="btn-ai-trigger"
            onClick={handleRequestAi}
            disabled={loading}
          >
            ✨ Get AI Second Opinion
          </button>
        )}

        {analysis && !loading && (
          <button
            className="btn-ai-reanalyze"
            onClick={handleRequestAi}
            title="Re-run AI analysis with Gemini"
          >
            ↻ Re-Analyze
          </button>
        )}
      </div>

      {loading && (
        <div className="ai-loading-container">
          <div className="ai-shimmer-pulse" />
          <div className="ai-loading-text">
            <span className="ai-loading-spinner" />
            <span>Consulting Gemini AI on market structure & momentum...</span>
          </div>
        </div>
      )}

      {!loading && error && (
        <div className="ai-error-box">
          <p className="ai-error-message">⚠️ {error}</p>
          {error.includes("GEMINI_API_KEY") && (
            <p className="ai-error-tip">
              Tip: Configure <code>GEMINI_API_KEY</code> in your root <code>.env</code> file.
            </p>
          )}
          <button className="btn-ai-retry" onClick={handleRequestAi}>
            Try Again
          </button>
        </div>
      )}

      {!loading && !error && analysis && (
        <div className={`ai-content-body ${getVerdictTheme(analysis.verdict)}`}>
          <div className="ai-verdict-row">
            <div className={`ai-verdict-badge ${getVerdictTheme(analysis.verdict)}`}>
              <span className="verdict-dot" />
              <span>{analysis.verdictBadge || analysis.verdict}</span>
            </div>
          </div>

          {analysis.thesis && (
            <p className="ai-thesis">{analysis.thesis}</p>
          )}

          <div className="ai-points-grid">
            {analysis.keyStrengths?.length > 0 && (
              <div className="ai-point-col strengths">
                <h5 className="point-col-title">✓ Key Catalysts & Strengths</h5>
                <ul className="ai-point-list">
                  {analysis.keyStrengths.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {analysis.keyRisks?.length > 0 && (
              <div className="ai-point-col risks">
                <h5 className="point-col-title">⚠ Watchouts & Risk Factors</h5>
                <ul className="ai-point-list">
                  {analysis.keyRisks.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {analysis.tacticalAdvice && (
            <div className="ai-advice-box">
              <span className="advice-icon">🎯</span>
              <div className="advice-text-wrap">
                <strong>Tactical Takeaway:</strong>
                <span>{analysis.tacticalAdvice}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StockSignalAiCard;
