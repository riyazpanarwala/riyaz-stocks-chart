import React, { useState, useEffect } from "react";

import OIChart from "./components/OIChart";
import ExpirySelector from "./components/ExpirySelector";
import StrikeSlider from "./components/StrikeSlider";
import MarketSummary from "./components/MarketSummary";
import SignalPanel from "./components/SignalPanel";
import ProbabilityPanel from "./components/ProbabilityPanel";

import { processOptionData } from "./utils/optionAnalytics";
import { calculateSignal } from "./utils/intradaySignal";
import { findTargets } from "./utils/targetFinder";
import { detectSmartMoney } from "./utils/smartMoney";
import { calculateProbability } from "./utils/probabilityEngine";

import "./OptionDashboard.css";

const OptionDashboard = ({ optionChainData }) => {
  const [meta, setMeta] = useState({});
  const [data, setData] = useState([]);
  const [selectedExpiry, setSelectedExpiry] = useState(null);
  const [showChange, setShowChange] = useState(false);
  const [strikeRange, setStrikeRange] = useState(5);
  const [signal, setSignal] = useState(null);
  const [targets, setTargets] = useState(null);
  const [smartMoney, setSmartMoney] = useState(null);
  const [probability, setProbability] = useState(null);
  const [strikeStep, setStrikeStep] = useState(50);

  let filtered = [];

  useEffect(() => {
    const res = processOptionData(optionChainData);

    setMeta(res);
    setData(res.data);
    setStrikeStep(res.step);

    if (res.expiries?.length) {
      setSelectedExpiry(res.expiries[0]);
    }
  }, [optionChainData]);

  useEffect(() => {
    if (!data.length || !meta?.atmStrike) return;

    const sig = calculateSignal(data, meta);
    const tgt = findTargets(data, meta.atmStrike, strikeStep);
    const sm = detectSmartMoney(data);

    setSignal(sig);
    setTargets(tgt);
    setSmartMoney(sm);

    const prob = calculateProbability(data, meta, tgt);
    setProbability(prob);
  }, [data, selectedExpiry, strikeRange, strikeStep, meta]);

  filtered = data
    .filter((d) => d.expiry === selectedExpiry)
    .filter(
      (d) => Math.abs(d.strike - meta.atmStrike) <= strikeRange * strikeStep,
    );

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
          <SignalPanel
            signal={signal}
            targets={targets}
            smartMoney={smartMoney}
          />
          <ProbabilityPanel probability={probability} />
        </div>

        <div className="card chart-card">
          <OIChart data={filtered} meta={meta} showChange={showChange} />
        </div>
      </div>
    </div>
  );
};

export default OptionDashboard;
