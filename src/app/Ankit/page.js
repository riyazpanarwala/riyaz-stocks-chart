"use client";
import React, { useState } from "react";
import "./position.css";

export default function PositionSizeCalculatorPage() {
  const [riskAmount1, setRiskAmount1] = useState(5000);
  const [entry1, setEntry1] = useState(1050);
  const [stop1, setStop1] = useState(980);

  const [fund, setFund] = useState(32840);
  const [price, setPrice] = useState(240);

  const [riskAmount2, setRiskAmount2] = useState(10000);
  const [entry2, setEntry2] = useState(1150);
  const [percent2, setPercent2] = useState(5);

  // --- Calculations ---
  const diff1 = Math.max(entry1 - stop1, 0.01);
  const shares1 = Math.floor(riskAmount1 / diff1);
  const position1 = Math.round(shares1 * entry1);

  const qty = fund / price;

  const stopLoss2 = entry2 - (entry2 * percent2) / 100;
  const diff2 = entry2 - stopLoss2;
  const shares2 = Math.floor(riskAmount2 / diff2);
  const position2 = Math.round(shares2 * entry2);

  return (
    <div className="wrapper">
      {/* Using Stop Price */}
      <div className="card">
        <h2 className="title">Position Size Calculator<br/>Using Stop Price</h2>

        <div className="row input-row">
          <span>Amount you want to risk:</span>
          <input type="number" value={riskAmount1} onChange={e=>setRiskAmount1(+e.target.value)} />
        </div>

        <div className="row input-row">
          <span>Entry price:</span>
          <input type="number" value={entry1} onChange={e=>setEntry1(+e.target.value)} />
        </div>

        <div className="row input-row">
          <span>Stop price:</span>
          <input type="number" value={stop1} onChange={e=>setStop1(+e.target.value)} />
        </div>

        <div className="result-box">
          <div className="row"><span>Amount of position:</span><span>{position1}</span></div>
          <div className="row"><span>Number of shares:</span><span>{shares1}</span></div>
        </div>
      </div>

      {/* Qty Calculator */}
      <div className="card">
        <h2 className="sub-title">Qty Calculator</h2>

        <div className="row input-row">
          <span>Fund:</span>
          <input type="number" value={fund} onChange={e=>setFund(+e.target.value)} />
        </div>

        <div className="row input-row">
          <span>Price:</span>
          <input type="number" value={price} onChange={e=>setPrice(+e.target.value)} />
        </div>

        <div className="qty-box">Qty: <span>{qty.toFixed(4)}</span></div>
      </div>

      {/* Using Stop Percent */}
      <div className="card">
        <h2 className="title">Position Size Calculator<br/>Using Stop Percent</h2>

        <div className="row input-row">
          <span>Amount you want to risk:</span>
          <input type="number" value={riskAmount2} onChange={e=>setRiskAmount2(+e.target.value)} />
        </div>

        <div className="row input-row">
          <span>Entry price:</span>
          <input type="number" value={entry2} onChange={e=>setEntry2(+e.target.value)} />
        </div>

        <div className="row input-row">
          <span>Stop percent:</span>
          <input type="number" value={percent2} onChange={e=>setPercent2(+e.target.value)} />
        </div>

        <div className="row"><span>Stoploss Price:</span><span>{stopLoss2.toFixed(2)}</span></div>

        <div className="result-box">
          <div className="row"><span>Amount of position:</span><span>{position2}</span></div>
          <div className="row"><span>Number of shares:</span><span>{shares2}</span></div>
        </div>
      </div>
    </div>
  );
}
