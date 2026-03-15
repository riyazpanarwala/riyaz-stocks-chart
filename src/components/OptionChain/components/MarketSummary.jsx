import React from "react";

const MarketSummary = ({ signal, smartMoney, probability }) => {
  // 1. Safe Data Extraction
  const signalText = signal?.signal || "Wait";
  const smartMoneyText = smartMoney || "Neutral";
  const upsideProb = probability?.upsideProbability ?? 50;
  const downsideProb = probability?.downsideProbability ?? 50;

  // 2. Dynamic Color Logic
  const getSentimentColor = (text) => {
    const t = String(text).toLowerCase();
    if (t.includes("buy call")) return "#22c55e";
    if (t.includes("buy put")) return "#ef4444";
    return "#facc15"; // Yellow for Neutral/Wait
  };

  const signalColor = getSentimentColor(signalText);
  const moneyColor = getSentimentColor(smartMoneyText);

  return (
    <div style={styles.wrapper}>
      {/* Top Grid: Signal & Smart Money */}
      <div style={styles.topRow}>
        {/* Trade Signal Card */}
        <div style={styles.card}>
          <span style={styles.label}>Trade Signal</span>
          <span style={{ ...styles.value, color: signalColor }}>
            {signalText.toUpperCase()}
          </span>
        </div>

        {/* Smart Money Card */}
        <div style={styles.card}>
          <span style={styles.label}>Smart Money</span>
          <span style={{ ...styles.value, color: moneyColor }}>
            {smartMoneyText}
          </span>
        </div>
      </div>

      {/* Bottom Section: Probability Bar */}
      <div style={styles.probSection}>
        <div style={styles.probHeader}>
          <span style={{ ...styles.probText, color: "#22c55e" }}>
            Upside {upsideProb.toFixed(0)}%
          </span>
          <span style={styles.label}>Win Probability</span>
          <span style={{ ...styles.probText, color: "#ef4444" }}>
            Down {downsideProb.toFixed(0)}%
          </span>
        </div>

        <div style={styles.barContainer}>
          <div
            style={{
              ...styles.barFill,
              width: `${upsideProb}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
};

// Styles matching your OI Chart theme
const styles = {
  wrapper: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    marginBottom: "20px",
    padding: "15px",
    background: "rgba(10, 10, 10, 0.5)",
    borderRadius: "8px",
    border: "1px solid #1a1a1a",
  },
  topRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "15px",
  },
  card: {
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    border: "1px solid #222",
    borderRadius: "6px",
    padding: "12px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "60px",
  },
  label: {
    fontSize: "10px",
    color: "#666",
    textTransform: "uppercase",
    letterSpacing: "1px",
    marginBottom: "4px",
  },
  value: {
    fontSize: "16px",
    fontWeight: "bold",
    letterSpacing: "0.5px",
  },
  probSection: {
    marginTop: "5px",
  },
  probHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "6px",
  },
  probText: {
    fontSize: "11px",
    fontWeight: "bold",
  },
  barContainer: {
    width: "100%",
    height: "6px",
    background: "#ef4444", // Default red (Downside)
    borderRadius: "3px",
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    background: "#22c55e", // Default green (Upside)
    transition: "width 0.5s ease-in-out",
    borderRadius: "3px",
  },
};

export default MarketSummary;
