import React, { useState, useEffect } from "react";

// import dataJson from "./FO.json";

import OIChart from "./components/OIChart";
import ExpirySelector from "./components/ExpirySelector";
import StrikeSlider from "./components/StrikeSlider";
import MarketSummary from "./components/MarketSummary";

import { processOptionData } from "./utils/optionAnalytics";

import "./OptionDashboard.css";

const OptionDashboard = ({ optionChainData }) => {
  const [meta, setMeta] = useState({});
  const [data, setData] = useState([]);
  const [selectedExpiry, setSelectedExpiry] = useState(null);
  const [showChange, setShowChange] = useState(false);
  const [strikeRange, setStrikeRange] = useState(5);

  let filtered = [];

  useEffect(() => {
    const res = processOptionData(optionChainData);

    setMeta(res);
    setData(res.data);

    if (res.expiries?.length) {
      setSelectedExpiry(res.expiries[0]);
    }
  }, []);

  filtered = data
    .filter((d) => d.expiry === selectedExpiry)
    .filter((d) => Math.abs(d.strike - meta.atmStrike) <= strikeRange * 50);

  return (
    <div className="dashboard">
      <div className="container">
        <div className="controls">
          <button className="btn" onClick={() => setShowChange(!showChange)}>
            Toggle OI Change
          </button>

          <ExpirySelector
            expiries={optionChainData.records?.expiryDates}
            value={selectedExpiry}
            onChange={setSelectedExpiry}
          />

          <StrikeSlider value={strikeRange} setValue={setStrikeRange} />
        </div>

        <div className="card">
          <MarketSummary meta={meta} />
        </div>

        <div className="card chart-card">
          <OIChart data={filtered} meta={meta} showChange={showChange} />
        </div>
      </div>
    </div>
  );
};

export default OptionDashboard;
