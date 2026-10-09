import React, { useEffect, useState } from "react";
import { C } from "../constants.js";
import { buildPositionPlan, evaluatePosition, liquidQuote } from "../utils/tradeRules.js";

export function PositionPanel({ sig, exitSignal = sig, storageKey, rows, spot, timestamp, now, marketOpen, expiry }) {
  const [fill, setFill] = useState("");
  const [cost, setCost] = useState("0");
  const [position, setPosition] = useState(null);
  const [message, setMessage] = useState("");
  useEffect(() => {
    try {
      const stored = JSON.parse(sessionStorage.getItem(`option-position:${storageKey}`) || "null");
      if (stored && stored.expiry === expiry && [stored.entryPrice, stored.stopLoss, stored.target1, stored.target2, stored.strike].every(Number.isFinite) && ["CE", "PE"].includes(stored.side)) setPosition(stored);
    } catch { /* A corrupt stored position must not generate exit guidance. */ }
  }, [storageKey, expiry]);
  const savePosition = (next) => {
    setPosition(next);
    try {
      if (next) sessionStorage.setItem(`option-position:${storageKey}`, JSON.stringify(next));
      else sessionStorage.removeItem(`option-position:${storageKey}`);
    } catch { setMessage("Browser storage unavailable; keep this tab open to retain the position."); }
  };
  const leg = position ? rows.find((r) => r.strikePrice === position.strike)?.[position.side] : null;
  const status = evaluatePosition(position, { bid: liquidQuote(leg).bid, spot, timestamp, now, marketOpen,
    rawSignal: exitSignal?.reversalSignal ?? exitSignal?.rawSignal, confirmed: exitSignal?.confirmed });
  const recordFill = () => {
    const source = sig?.tradePlan;
    if (!source || !sig?.contract) return;
    const plan = buildPositionPlan({ ...source, entryPrice: Number(fill), spot, roundTripCost: Number(cost) });
    if (!plan) { setMessage("Enter a positive actual fill compatible with the underlying stop."); return; }
    savePosition({ ...plan, strike: sig.contract.strike, expiry, openedAt: now });
    setMessage(plan.eligible ? "Fill recorded for this session." : "Fill recorded; available reward is below 1:1.5. Review the position.");
  };
  return <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 12 }}>
    <b>Position & exit tracker</b>
    <div style={{ color: C.muted, marginTop: 6 }}>Record your broker fill to monitor a long option. Entries and exits here are guidance; place orders with your broker.</div>
    {position ? <>
      <div style={{ marginTop: 8 }}>{position.strike} {position.side} · {position.expiry} · Fill ₹{position.entryPrice} · SL ₹{position.stopLoss} · T1 ₹{position.target1} · T2 ₹{position.target2}</div>
      <div style={{ color: status.action === "EXIT" ? C.red : C.yellow, marginTop: 8 }}><b>{status.action}</b> — {status.reason}</div>
      <button onClick={() => { savePosition(null); setFill(""); setMessage("Position marked closed."); }}>Mark closed</button>
    </> : sig?.tradePlan ? <div style={{ marginTop: 8 }}>
      <span>{sig.contract.strike} {sig.contract.side} · Estimated R:R 1:{sig.tradePlan.riskRewardRatio} · </span>
      <input aria-label="Actual option fill price" type="number" min="0.01" step="0.01" value={fill} onChange={(e) => setFill(e.target.value)} placeholder="Actual fill ₹" />
      <label style={{ marginLeft: 8 }}>Estimated round-trip fees per option unit ₹ <input aria-label="Estimated round-trip fees per option unit" type="number" min="0" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} style={{ width: 80 }} /></label>
      <button onClick={recordFill}>Record fill</button>
    </div> : <div style={{ marginTop: 8 }}>Waiting for a confirmed entry with sufficient room to the next level.</div>}
    {message && <div style={{ marginTop: 6 }}>{message}</div>}
    <div style={{ color: C.muted, marginTop: 6 }}>Preview risk/reward excludes fees. Recorded-fill risk/reward uses the fees you enter. Premium levels use an approximate delta; underlying invalidation also triggers an exit. Exit at the first target, stop, confirmed reversal, or 15:20 IST. Recorded fills are saved in this browser tab’s session.</div>
  </div>;
}
