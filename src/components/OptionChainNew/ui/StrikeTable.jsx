// ═══════════════════════════════════════════════════════════════
// STRIKE TABLE
// ═══════════════════════════════════════════════════════════════
import React from "react";
import { C } from "../constants.js";
import { buildupLabel } from "../utils/formatters.js";
import { buildupType } from "../utils/parsers.js";

const BUILDUP_COLOR = {
  "Long Build-up": C.green,
  "Short Build-up": C.red,
  "Short Covering": C.blue,
  "Long Unwinding": C.muted,
};

const HEADER_CELLS = [
  "Call OI",
  "Call ΔOI",
  "Call Price",
  "STRIKE",
  "Put OI",
  "Put ΔOI",
  "Put Price",
  "What's Happening",
];

const StrikeRow = React.memo(function StrikeRow({ row, atm, sig }) {
  const { strikePrice: sp, CE, PE } = row;
  const isATM = sp === atm;
  const isSup = sig.topSupport.includes(sp);
  const isRes = sig.topResistance.includes(sp);
  const buType = buildupType(row, "CE");
  const buLabel = buildupLabel(buType);
  const buColor = BUILDUP_COLOR[buType] ?? C.muted;

  return (
    <tr
      style={{
        borderBottom: `1px solid ${C.surface2}`,
        background: isATM
          ? "#161e2e"
          : isRes
            ? C.redBg
            : isSup
              ? C.greenBg
              : "transparent",
      }}
    >
      <td style={{ padding: "3px 6px", textAlign: "right", color: C.red }}>
        {CE.openInterest.toLocaleString()}
      </td>
      <td
        style={{
          padding: "3px 6px",
          textAlign: "right",
          color: CE.changeinOpenInterest >= 0 ? C.red : C.green,
        }}
      >
        {CE.changeinOpenInterest > 0 ? "+" : ""}
        {CE.changeinOpenInterest.toLocaleString()}
      </td>
      <td style={{ padding: "3px 6px", textAlign: "right", color: C.text }}>
        ₹{CE.lastPrice}
      </td>
      <td
        style={{
          padding: "3px 8px",
          textAlign: "center",
          fontWeight: 700,
          color: isATM ? C.blue : isRes ? C.red : isSup ? C.green : C.text,
          background: isATM ? "#1c2a3a" : undefined,
        }}
      >
        {sp}
        {isATM ? " ◆" : ""}
      </td>
      <td style={{ padding: "3px 6px", textAlign: "right", color: C.green }}>
        {PE.openInterest.toLocaleString()}
      </td>
      <td
        style={{
          padding: "3px 6px",
          textAlign: "right",
          color: PE.changeinOpenInterest >= 0 ? C.green : C.red,
        }}
      >
        {PE.changeinOpenInterest > 0 ? "+" : ""}
        {PE.changeinOpenInterest.toLocaleString()}
      </td>
      <td style={{ padding: "3px 6px", textAlign: "right", color: C.text }}>
        ₹{PE.lastPrice}
      </td>
      <td
        style={{
          padding: "3px 6px",
          textAlign: "right",
          color: buColor,
          whiteSpace: "nowrap",
          fontSize: 10,
        }}
      >
        {buLabel}
      </td>
    </tr>
  );
});

export const StrikeTable = React.memo(function StrikeTable({
  displayRows,
  atm,
  sig,
}) {
  return (
    <div
      style={{
        background: C.surface,
        borderRadius: 10,
        padding: 10,
        marginBottom: 10,
        overflowX: "auto",
      }}
    >
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: 11,
          minWidth: 600,
        }}
      >
        <thead>
          <tr style={{ borderBottom: `1px solid ${C.border}` }}>
            {HEADER_CELLS.map((h) => (
              <th
                key={h}
                style={{
                  padding: "5px 6px",
                  color: C.muted,
                  textAlign: "right",
                  whiteSpace: "nowrap",
                  fontWeight: 600,
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {displayRows.map((r) => (
            <StrikeRow key={r.strikePrice} row={r} atm={atm} sig={sig} />
          ))}
        </tbody>
      </table>
    </div>
  );
});
