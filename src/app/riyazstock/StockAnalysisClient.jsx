"use client";

import React, { useState } from "react";
import stocksAnalysis from "../../components/StockAnalysis";

export default function StockAnalysisClient() {
  const [isRunning, setIsRunning] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  const handleRunAnalysis = async () => {
    setIsRunning(true);
    setStatusMsg("Running technical analysis across watchlist stocks...");
    try {
      const summary = await stocksAnalysis();
      if (summary.successful > 0) {
        setStatusMsg(
          `Analysis completed! ${summary.successful}/${summary.total} stocks processed successfully (${summary.failed} failed). Report downloaded.`
        );
      } else {
        setStatusMsg("Analysis failed: 0 stocks could be processed.");
      }
    } catch (err) {
      console.error(err);
      setStatusMsg("Analysis failed. Please try again.");
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: "60px auto", padding: "32px", background: "#0e131f", borderRadius: 12, border: "1px solid #1e293b", color: "#e2e8f0", fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12, color: "#38bdf8" }}>
        Automated Batch Technical Analysis
      </h1>
      <p style={{ color: "#94a3b8", fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
        Generate comprehensive technical analysis indicators (RSI, MACD, MFI, Supertrend, Bollinger Bands, Moving Averages) for top Indian equities and export the results to JSON.
      </p>

      <button
        onClick={handleRunAnalysis}
        disabled={isRunning}
        style={{
          padding: "12px 24px",
          borderRadius: 8,
          border: "none",
          background: isRunning ? "#334155" : "#0284c7",
          color: "#ffffff",
          fontWeight: 600,
          fontSize: 15,
          cursor: isRunning ? "not-allowed" : "pointer",
          transition: "background 0.2s ease",
        }}
      >
        {isRunning ? "Running Analysis..." : "🚀 Export Technical Analysis JSON"}
      </button>

      {statusMsg && (
        <div
          role="status"
          aria-atomic="true"
          style={{ marginTop: 20, padding: 12, borderRadius: 6, background: "#1e293b", fontSize: 14, color: "#38bdf8" }}
        >
          {statusMsg}
        </div>
      )}
    </div>
  );
}
