import React from "react";

const SignalPanel = ({ signal, targets, smartMoney }) => {
  if (!signal) return null;

  return (
    <div className="signal-panel" style={{ marginTop: "20px" }}>
      <div className="summary-grid">
        <div>
          <strong>Market Bias:</strong> {signal.bias}
        </div>

        <div>
          <strong>Trade Signal:</strong> {signal.signal}
        </div>

        <div>
          <strong>Smart Money:</strong> {smartMoney}
        </div>

        <div>
          <strong>Support:</strong> {targets?.support}
        </div>

        <div>
          <strong>Resistance:</strong> {targets?.resistance}
        </div>
      </div>
    </div>
  );
};

export default SignalPanel;
