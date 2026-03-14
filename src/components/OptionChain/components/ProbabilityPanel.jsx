import React from "react";

const ProbabilityPanel = ({ probability }) => {
  if (!probability) return null;

  return (
    <div className="probability-panel" style={{ marginTop: "20px" }}>
      <div className="summary-grid">
        <div>
          Upside Probability: {probability.upsideProbability.toFixed(0)}%
        </div>
        <div>
          Downside Probability: {probability.downsideProbability.toFixed(0)}%
        </div>
      </div>
    </div>
  );
};

export default ProbabilityPanel;
