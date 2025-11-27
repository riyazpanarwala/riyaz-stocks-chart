"use client";
import React, { useState } from "react";
import "./position.css";

export default function PositionSizeCalculatorPage() {
  const [theme, setTheme] = useState("dark");

  const [riskAmount1, setRiskAmount1] = useState(5000);
  const [entry1, setEntry1] = useState(1050);
  const [stop1, setStop1] = useState(980);

  const [fund, setFund] = useState(32840);
  const [price, setPrice] = useState(240);

  const [riskAmount2, setRiskAmount2] = useState(10000);
  const [entry2, setEntry2] = useState(1150);
  const [percent2, setPercent2] = useState(5);

  const parse = (v) => {
    if (v === "") return "";
    const num = parseFloat(v);
    return isNaN(num) ? "" : num;
  };

  const diff1 = entry1 && stop1 && entry1 > stop1 ? entry1 - stop1 : 0;
  const shares1 = diff1 ? Math.floor(riskAmount1 / diff1) : 0;
  const position1 = shares1 * (entry1 || 0);

  const qty = fund && price ? fund / price : 0;

  const stopLoss2 = entry2 ? entry2 - (entry2 * percent2) / 100 : 0;
  const diff2 = entry2 ? entry2 - stopLoss2 : 0;
  const shares2 = diff2 ? Math.floor(riskAmount2 / diff2) : 0;
  const position2 = shares2 * (entry2 || 0);

  return (
    <div className={`wrapper ${theme}`}>
      <button className="theme-toggle" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>Toggle {theme === "dark" ? "Light" : "Dark"} Mode</button>

      {/* Using Stop Price */}
      <div className="card">
        <h2>Position Size Calculator (Stop Price)</h2>

        <div className="input-row"><label>Risk Amount:</label>
          <input type="number" value={riskAmount1} onChange={e=>setRiskAmount1(parse(e.target.value))} /></div>

        <div className="input-row"><label>Entry Price:</label>
          <input type="number" value={entry1} onChange={e=>setEntry1(parse(e.target.value))} /></div>

        <div className="input-row"><label>Stop Price:</label>
          <input type="number" value={stop1} onChange={e=>setStop1(parse(e.target.value))} /></div>

        <div className="result-box">
          <div className="row"><span>Amount of Position:</span><span>{position1 || ""}</span></div>
          <div className="row"><span>Shares:</span><span>{shares1 || ""}</span></div>
        </div>
      </div>

      {/* Qty Calculator */}
      <div className="card">
        <h2>Quantity Calculator</h2>

        <div className="input-row"><label>Fund:</label>
          <input type="number" value={fund} onChange={e=>setFund(parse(e.target.value))} /></div>

        <div className="input-row"><label>Price:</label>
          <input type="number" value={price} onChange={e=>setPrice(parse(e.target.value))} /></div>

        <div className="qty-box">Qty: <span>{qty ? qty.toFixed(4) : ""}</span></div>
      </div>

      {/* Stop % Calculator */}
      <div className="card">
        <h2>Position Size Calculator (Stop %)</h2>

        <div className="input-row"><label>Risk Amount:</label>
          <input type="number" value={riskAmount2} onChange={e=>setRiskAmount2(parse(e.target.value))} /></div>

        <div className="input-row"><label>Entry Price:</label>
          <input type="number" value={entry2} onChange={e=>setEntry2(parse(e.target.value))} /></div>

        <div className="input-row"><label>Stop %:</label>
          <input type="number" value={percent2} onChange={e=>setPercent2(parse(e.target.value))} /></div>

        <div className="row"><span>Stoploss Price:</span><span>{stopLoss2 ? stopLoss2.toFixed(2) : ""}</span></div>

        <div className="result-box">
          <div className="row"><span>Amount of Position:</span><span>{position2 || ""}</span></div>
          <div className="row"><span>Shares:</span><span>{shares2 || ""}</span></div>
        </div>
      </div>
    </div>
  );
}

