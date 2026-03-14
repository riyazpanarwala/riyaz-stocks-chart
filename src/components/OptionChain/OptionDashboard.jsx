import React, { useState, useEffect, useMemo } from "react";

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
  const [selectedExpiry, setSelectedExpiry] = useState(null);
  const [showChange, setShowChange] = useState(false);
  const [strikeRange, setStrikeRange] = useState(5);

  const meta = useMemo(
    () => processOptionData(optionChainData),
    [optionChainData],
  );
  const data = meta.data || [];
  const strikeStep = meta.step || 50;

  useEffect(() => {
    if (meta.expiries?.length) {
      setSelectedExpiry(meta.expiries[0]);
    }
  }, [meta.expiries, selectedExpiry]);

  const analytics = useMemo(() => {
    if (!data.length || !meta.atmStrike || !selectedExpiry) return null;

    const analysisData = data.filter((d) => d.expiry === selectedExpiry);
    const sig = calculateSignal(analysisData, meta);
    const tgt = findTargets(analysisData, meta.atmStrike, strikeStep);
    const sm = detectSmartMoney(analysisData);
    const prob = calculateProbability(analysisData, meta, tgt);

    return { sig, tgt, sm, prob };
  }, [data, selectedExpiry, meta, strikeStep]);

  const filtered = useMemo(() => {
    if (!data.length || !selectedExpiry) return [];
    return data.filter(
      (d) =>
        d.expiry === selectedExpiry &&
        Math.abs(d.strike - meta.atmStrike) <= strikeRange * strikeStep,
    );
  }, [data, selectedExpiry, strikeRange, strikeStep, meta.atmStrike]);

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
            signal={analytics?.sig}
            targets={analytics?.tgt}
            smartMoney={analytics?.sm}
          />
          <ProbabilityPanel probability={analytics?.prob} />
        </div>

        <div className="card chart-card">
          <OIChart data={filtered} meta={meta} showChange={showChange} />
        </div>
      </div>
    </div>
  );
};

export default OptionDashboard;
