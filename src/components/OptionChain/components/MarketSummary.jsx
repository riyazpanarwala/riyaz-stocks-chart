const MarketSummary = ({ meta, signal, smartMoney, probability }) => {
  const sentiment =
    meta.PCR > 1 ? "Bullish" : meta.PCR < 0.8 ? "Bearish" : "Neutral";

  return (
    <div className="summary-grid">
      <div>PCR : {meta.PCR?.toFixed(2)}</div>
      <div>Sentiment : {sentiment}</div>

      <div>Support : {meta.support?.join(", ")}</div>
      <div>Resistance : {meta.resistance?.join(", ")}</div>

      <div>Trade Signal : {signal?.signal}</div>

      <div>Smart Money : {smartMoney}</div>

      <div>
        Upside Probability : {probability?.upsideProbability.toFixed(0)}%
      </div>
      <div>
        Downside Probability : {probability?.downsideProbability.toFixed(0)}%
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
