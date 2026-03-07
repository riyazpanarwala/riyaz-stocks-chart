const MarketSummary = ({ meta }) => {
  const sentiment =
    meta.PCR > 1 ? "Bullish" : meta.PCR < 0.9 ? "Bearish" : "Neutral";

  return (
    <div>
      <div className="summary-title">NIFTY {meta.spot}</div>

      <div className="summary-grid">
        <div>PCR : {meta.PCR?.toFixed(2)}</div>
        <div>Sentiment : {sentiment}</div>

        <div>Support : {meta.support?.join(", ")}</div>
        <div>Resistance : {meta.resistance?.join(", ")}</div>
      </div>
    </div>
  );
};

const box = {
  padding: 20,
  background: "#111827",
  borderRadius: 10,
};

export default MarketSummary;
