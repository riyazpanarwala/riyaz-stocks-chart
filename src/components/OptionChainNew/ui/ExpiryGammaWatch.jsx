import React, { useMemo } from "react";
import { C } from "../constants.js";
import { calcRowGreeks } from "../utils/greeksEngine.js";

const fmt = (value) => Number(value).toLocaleString("en-IN", { maximumFractionDigits: 2 });

export const ExpiryGammaWatch = React.memo(function ExpiryGammaWatch({ rows = [], spot, tYears, candles = [], expiry }) {
  const levels = useMemo(() => rows
    .filter((row) => Number.isFinite(row.strikePrice))
    .map((row) => {
      const greeks = calcRowGreeks(row, spot, tYears);
      const ceOi = Math.max(0, Number(row.CE?.openInterest) || 0);
      const peOi = Math.max(0, Number(row.PE?.openInterest) || 0);
      // Descriptive concentration proxy only: OI has both long and short counterparties.
      const weight = greeks.CE.gamma * ceOi + greeks.PE.gamma * peOi;
      return { strike: row.strikePrice, weight };
    })
    .filter((item) => Number.isFinite(item.weight) && item.weight > 0), [rows, spot, tYears]);

  if (!(spot > 0) || !levels.length) return null;

  const below = levels.filter((item) => item.strike <= spot).sort((a, b) => b.weight - a.weight)[0];
  const above = levels.filter((item) => item.strike > spot).sort((a, b) => b.weight - a.weight)[0];
  const completed = candles.filter((c) => [c.open, c.close].every((v) => Number.isFinite(Number(v))));
  const [previous, latest] = completed.slice(-2);
  let status = "Watching nearby strikes";
  let statusColor = C.yellow;
  let confirmation = "No confirmed close through a nearby gamma-concentration strike.";
  const crossed = (level) => level && previous && latest &&
    ((previous.close <= level.strike && latest.close > level.strike && spot > level.strike) ||
     (previous.close >= level.strike && latest.close < level.strike && spot < level.strike));
  const crossedLevel = [above, below].find(crossed);
  if (crossedLevel) {
    const direction = latest.close > previous.close ? "up" : "down";
    status = `Price crossed ${fmt(crossedLevel.strike)} ${direction}`;
    statusColor = C.blue;
    confirmation = "Two recent candle closes and current spot confirm the level cross; this is price confirmation, not a trade recommendation.";
  }

  const cell = (title, item) => (
    <div style={{ minWidth: 140, flex: "1 1 140px" }}>
      <div style={{ fontSize: 9, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>{title}</div>
      {item ? <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginTop: 3 }}>{fmt(item.strike)} <span style={{ fontSize: 10, color: C.muted }}>({item.strike > spot ? "+" : "−"}{fmt(Math.abs(item.strike - spot))} pts)</span></div>
        : <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>Unavailable</div>}
    </div>
  );

  return (
    <section aria-label="Expiry Gamma Watch" style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "11px 14px", marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 9 }}>
        <strong style={{ fontSize: 12, color: C.text }}>Expiry Gamma Watch</strong>
        <span style={{ fontSize: 9, color: C.muted }}>{expiry ? `Selected expiry: ${expiry}` : "Selected chain expiry"}</span>
        <span style={{ marginLeft: "auto", fontSize: 10, fontWeight: 700, color: statusColor, background: `${statusColor}18`, padding: "3px 7px", borderRadius: 4 }}>{status}</span>
      </div>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {cell("Highest concentration below spot", below)}
        {cell("Highest concentration above spot", above)}
        <div style={{ minWidth: 160, flex: "2 1 220px" }}>
          <div style={{ fontSize: 9, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>Price confirmation</div>
          <div style={{ fontSize: 10, color: C.text, marginTop: 4, lineHeight: 1.5 }}>{confirmation}</div>
        </div>
      </div>
      <div style={{ fontSize: 9, color: C.muted, marginTop: 9, lineHeight: 1.5 }}>
        Concentration proxy = model gamma × open interest, summed across calls and puts. OI does not reveal position direction, so this is not dealer gamma or a squeeze prediction.
      </div>
    </section>
  );
});
