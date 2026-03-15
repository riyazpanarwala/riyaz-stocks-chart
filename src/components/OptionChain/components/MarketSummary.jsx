const MarketSummary = ({ signal, smartMoney, probability }) => {
  return (
    <div className="summary-grid">
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

export default MarketSummary;
