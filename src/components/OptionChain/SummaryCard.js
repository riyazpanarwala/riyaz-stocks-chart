import React from "react";

const SummaryCard = ({ ceData = {}, peData = {} }) => (
  <div className="summary-card">
    <h2 className="summary-title">Summary</h2>
    <div className="summary-content">
      <div className="summary-section">
        <h3>Call Options</h3>
        <p>Total Open Interest: {ceData.totOI ?? "-"}</p>
        <p>Total Volume: {ceData.totVol ?? "-"}</p>
      </div>
      <div className="summary-section">
        <h3>Put Options</h3>
        <p>Total Open Interest: {peData.totOI ?? "-"}</p>
        <p>Total Volume: {peData.totVol ?? "-"}</p>
      </div>
    </div>
  </div>
);

export default SummaryCard;
