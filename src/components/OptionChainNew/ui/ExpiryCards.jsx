// ═══════════════════════════════════════════════════════════════
// EXPIRY CARDS — "All Expiries" tab (stock symbols only)
// ═══════════════════════════════════════════════════════════════
import React, { useMemo } from "react";
import { C } from "../constants.js";
import { parseStockChain, calcPCR } from "../utils/parsers.js";
import { pcrLabel } from "../utils/formatters.js";

export const ExpiryCards = React.memo(function ExpiryCards({
  rawData, expiries, activeExpiry, instrument, onSelectExpiry,
}) {
  // Memoize per-expiry computations — parseStockChain is not cheap for symbols
  // with many contracts, and calling it on every render for every expiry adds up.
  // Keep pcr as a number throughout; only format for display at the leaf node.
  const expiryData = useMemo(() => expiries.map((ex) => {
    const p = parseStockChain(rawData, ex);
    const pcrNum = calcPCR(p.rows);
    const totCE = p.rows.reduce((s, r) => s + r.CE.openInterest, 0);
    const totPE = p.rows.reduce((s, r) => s + r.PE.openInterest, 0);
    return { ex, pcrNum, totCE, totPE };
  }), [rawData, expiries]);

  return (
    <div style={{ background: C.surface, borderRadius: 10, padding: 12, marginBottom: 10 }}>
      <div style={{ fontSize: 10, color: C.muted, marginBottom: 10 }}>
        Sentiment & open positions across all expiry dates · {instrument.symbol}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {expiryData.map(({ ex, pcrNum, totCE, totPE }) => {
          const pc = pcrNum > 1.2 ? C.green : pcrNum < 0.8 ? C.red : C.yellow;
          const isActive = ex === activeExpiry;

          return (
            <div
              key={ex}
              role="button"
              tabIndex={0}
              aria-pressed={isActive}
              onClick={() => onSelectExpiry(ex)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectExpiry(ex);
                }
              }}
              style={{
                background: isActive ? "#0d1e2e" : C.bg,
                border: `1px solid ${isActive ? C.blue : C.border}`,
                borderRadius: 8, padding: "10px 14px",
                cursor: "pointer", flex: "1 1 140px", transition: "border-color .15s",
              }}
            >
              <div style={{ color: C.blue, fontWeight: 700, fontSize: 11, marginBottom: 6 }}>{ex}</div>
              <div style={{ display: "flex", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 9, color: C.muted }}>Call OI</div>
                  <div style={{ color: C.red, fontSize: 12, fontWeight: 700 }}>{(totCE / 1000).toFixed(1)}K</div>
                </div>
                <div>
                  <div style={{ fontSize: 9, color: C.muted }}>Put OI</div>
                  <div style={{ color: C.green, fontSize: 12, fontWeight: 700 }}>{(totPE / 1000).toFixed(1)}K</div>
                </div>
                <div>
                  <div style={{ fontSize: 9, color: C.muted }}>Mood</div>
                  <div style={{ color: pc, fontSize: 12, fontWeight: 700 }}>{pcrLabel(pcrNum)}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 8, fontSize: 10, color: C.muted }}>
        Click any expiry card to load its full analysis
      </div>
    </div>
  );
});
