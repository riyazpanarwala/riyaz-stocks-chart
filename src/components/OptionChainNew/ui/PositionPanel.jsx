import React, { useEffect, useReducer, useState } from "react";
import { C } from "../constants.js";
import { evaluatePosition, liquidQuote } from "../utils/tradeRules.js";
import { pendingFillReducer, recordPendingFill } from "../utils/positionTracking.js";

const MAX_HOLD_MINS = 40;

export function PositionPanel({ sig, exitSignal = sig, storageKey, rows, spot, timestamp, now = Date.now(), marketOpen, expiry }) {
  const [fill, setFill] = useState("");
  const [cost, setCost] = useState("0");
  const [position, setPosition] = useState(null);
  const [message, setMessage] = useState("");
  const [pendingFill, updatePendingFill] = useReducer(pendingFillReducer, null);

  useEffect(() => {
    if (position) updatePendingFill({ type: "clear" });
    else updatePendingFill({ type: "offer", signal: sig, expiry, now });
  }, [sig, expiry, now, position]);

  useEffect(() => {
    try {
      const stored = JSON.parse(sessionStorage.getItem(`option-position:${storageKey}`) || "null");
      if (stored && stored.expiry === expiry && [stored.entryPrice, stored.stopLoss, stored.target1, stored.target2, stored.strike].every(Number.isFinite) && ["CE", "PE"].includes(stored.side)) {
        setPosition(stored);
      }
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
  const quote = liquidQuote(leg);
  const status = evaluatePosition(position, {
    bid: quote.bid, spot, timestamp, now, marketOpen,
    rawSignal: exitSignal?.reversalSignal ?? exitSignal?.rawSignal, confirmed: exitSignal?.confirmed,
  });

  const recordFill = () => {
    const recorded = recordPendingFill(pendingFill, { entryPrice: Number(fill), roundTripCost: Number(cost), openedAt: now });
    if (!recorded) { setMessage("Enter a positive actual fill compatible with the retained underlying stop."); return; }
    savePosition(recorded);
    updatePendingFill({ type: "clear" });
    setMessage(recorded.eligible ? "Fill recorded for this session." : "Fill recorded; available reward is below 1:1.5. Review the position.");
  };

  // Holding duration calculation for Point 5
  const openedAt = position?.openedAt ?? now;
  const elapsedMins = position ? Math.max(0, Math.floor((now - openedAt) / 60000)) : 0;
  const remainingMins = Math.max(0, MAX_HOLD_MINS - elapsedMins);
  const progressPct = Math.min(100, Math.round((elapsedMins / MAX_HOLD_MINS) * 100));

  const timerColor = elapsedMins >= 35 ? C.red : elapsedMins >= 25 ? C.yellow : C.green;

  // Live PnL in points
  const livePrice = quote.bid > 0 ? quote.bid : (leg?.lastPrice ?? null);
  const pnlPts = livePrice != null && position ? livePrice - position.entryPrice : null;
  const pnlColor = pnlPts == null ? C.muted : pnlPts > 0 ? C.green : pnlPts < 0 ? C.red : C.muted;

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <b>Position & Exit Tracker (Max 40-Min Intraday Hold)</b>
        {position && (
          <span style={{ fontSize: 11, color: timerColor, fontWeight: 700 }}>
            ⏱️ Held: {elapsedMins}m / {MAX_HOLD_MINS}m ({remainingMins}m left)
          </span>
        )}
      </div>

      <div style={{ color: C.muted, marginTop: 4, fontSize: 11 }}>
        Record your broker fill to monitor a long option. Entries and exits here are guidance; place orders with your broker.
      </div>

      {position ? (
        <div style={{ marginTop: 10, background: C.surface2, padding: "10px 12px", borderRadius: 6, border: `1px solid ${C.border}` }}>
          {/* Progress bar */}
          <div style={{ width: "100%", height: 4, background: C.border, borderRadius: 2, overflow: "hidden", marginBottom: 8 }}>
            <div style={{ width: `${progressPct}%`, height: "100%", background: timerColor, borderRadius: 2, transition: "width 0.5s ease" }} />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <div>
              <b style={{ color: C.text, fontSize: 13 }}>{position.strike} {position.side}</b>
              <span style={{ color: C.muted, fontSize: 11, marginLeft: 8 }}>Expiry: {position.expiry}</span>
            </div>

            {pnlPts != null && (
              <div style={{ fontSize: 12, fontWeight: 700, color: pnlColor }}>
                CMP: ₹{livePrice.toFixed(1)} ({pnlPts >= 0 ? "+" : ""}{pnlPts.toFixed(1)} pts)
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 6, fontSize: 11 }}>
            <span>Fill: <b style={{ color: C.text }}>₹{position.entryPrice}</b></span>
            <span>SL: <b style={{ color: C.red }}>₹{position.stopLoss}</b></span>
            <span>T1: <b style={{ color: C.green }}>₹{position.target1}</b></span>
            <span>T2: <b style={{ color: C.green }}>₹{position.target2}</b></span>
          </div>

          <div style={{ color: status.action === "EXIT" ? C.red : C.yellow, marginTop: 8, fontSize: 12 }}>
            <b>{status.action}</b> — {status.reason}
          </div>

          {/* Stalled Momentum Warning */}
          {elapsedMins >= 35 && status.action !== "EXIT" && (
            <div style={{
              marginTop: 8, padding: "6px 10px", borderRadius: 4,
              background: "#2a1505", border: `1px solid ${C.yellow}55`, color: C.yellow, fontSize: 11,
            }}>
              ⚠️ <b>Momentum Warning:</b> Held for {elapsedMins}m without reaching target. Option theta decay is accelerating; consider exiting at market / breakeven before the 40m cutoff.
            </div>
          )}

          <div style={{ marginTop: 10 }}>
            <button
              onClick={() => { savePosition(null); setFill(""); setMessage("Position marked closed."); }}
              style={{
                padding: "4px 10px", borderRadius: 5, border: `1px solid ${C.border}`,
                background: C.surface, color: C.text, cursor: "pointer", fontSize: 11,
              }}
            >
              Mark Closed
            </button>
          </div>
        </div>
      ) : pendingFill ? (
        <div style={{ marginTop: 8, background: C.surface2, padding: "8px 10px", borderRadius: 6 }}>
          <span>Pending broker fill: <b>{pendingFill.contract.strike} {pendingFill.contract.side}</b> · Estimated R:R 1:{pendingFill.tradePlan.riskRewardRatio} · </span>
          <input
            aria-label="Actual option fill price"
            type="number" min="0.01" step="0.01"
            value={fill} onChange={(e) => setFill(e.target.value)}
            placeholder="Actual fill ₹"
            style={{ padding: "4px 8px", borderRadius: 4, border: `1px solid ${C.border}`, background: C.surface, color: C.text, width: 100 }}
          />
          <label style={{ marginLeft: 8, fontSize: 11 }}>
            Fees ₹ <input
              aria-label="Estimated round-trip fees per option unit"
              type="number" min="0" step="0.01"
              value={cost} onChange={(e) => setCost(e.target.value)}
              style={{ width: 60, padding: "4px 6px", borderRadius: 4, border: `1px solid ${C.border}`, background: C.surface, color: C.text }}
            />
          </label>
          <button
            onClick={recordFill}
            style={{ marginLeft: 8, padding: "4px 10px", borderRadius: 4, border: `1px solid ${C.green}`, background: C.greenBg, color: C.green, cursor: "pointer" }}
          >
            Record Fill
          </button>
          <button
            onClick={() => { updatePendingFill({ type: "clear" }); setFill(""); setMessage("Pending contract cleared."); }}
            style={{ marginLeft: 6, padding: "4px 8px", borderRadius: 4, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, cursor: "pointer" }}
          >
            Clear
          </button>
        </div>
      ) : (
        <div style={{ marginTop: 8, color: C.muted }}>Waiting for a confirmed entry with sufficient room to the next level.</div>
      )}

      {message && <div style={{ marginTop: 6, color: C.blue, fontSize: 11 }}>{message}</div>}

      <div style={{ color: C.muted, marginTop: 6, fontSize: 10 }}>
        Preview risk/reward excludes fees. Recorded-fill risk/reward uses the fees you enter. Premium levels use an approximate delta; underlying invalidation also triggers an exit. Exit at the first target, stop, confirmed reversal, or 15:20 IST. Recorded fills are saved in this browser tab’s session.
      </div>
    </div>
  );
}
