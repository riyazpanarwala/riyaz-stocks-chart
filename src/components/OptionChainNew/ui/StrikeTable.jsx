import React from "react";
import { C } from "../constants.js";
import { buildupType }  from "../utils/parsers.js";

/**
 * Determine the side-aware buildup classification for a strike row.
 * - Strikes above ATM: analyze CE (calls/resistance/breakout)
 * - Strikes below ATM: analyze PE (puts/support/breakdown)
 * - At ATM: pick the leg with dominant change in open interest
 */
function getStrikeBuildup(row, atm) {
  const { strikePrice: sp, CE, PE } = row;
  const isATM = sp === atm;

  const side = isATM
    ? Math.abs(PE.changeinOpenInterest || 0) > Math.abs(CE.changeinOpenInterest || 0)
      ? "PE"
      : "CE"
    : sp > atm
      ? "CE"
      : "PE";

  const buType = buildupType(row, side);

  if (buType === "No Change") {
    return { label: "No activity", color: C.muted };
  }

  if (side === "CE") {
    switch (buType) {
      case "Long Build-up":
        return { label: "CE Long Build-up (Bullish)", color: C.green };
      case "Short Build-up":
        return { label: "CE Call Writing (Resistance)", color: C.red };
      case "Short Covering":
        return { label: "CE Short Covering (Squeeze)", color: C.blue };
      case "Long Unwinding":
        return { label: "CE Long Unwinding", color: C.muted };
      default:
        return { label: buType, color: C.muted };
    }
  } else {
    // PE side
    switch (buType) {
      case "Long Build-up":
        return { label: "PE Put Buying (Bearish)", color: C.red };
      case "Short Build-up":
        return { label: "PE Put Writing (Support)", color: C.green };
      case "Short Covering":
        return { label: "PE Short Covering", color: C.blue };
      case "Long Unwinding":
        return { label: "PE Put Unwinding (Exit)", color: C.muted };
      default:
        return { label: buType, color: C.muted };
    }
  }
}

const HEADER_CELLS = ["Call OI", "Call ΔOI", "Call Price", "STRIKE", "Put OI", "Put ΔOI", "Put Price", "What's Happening"];

const StrikeRow = React.memo(function StrikeRow({ row, atm, sig }) {
  const { strikePrice: sp, CE, PE } = row;
  const isATM = sp === atm;
  const isSup = sig?.topSupport?.includes(sp)    ?? false;
  const isRes = sig?.topResistance?.includes(sp) ?? false;
  const { label: buLabel, color: buColor } = getStrikeBuildup(row, atm);

  return (
    <tr style={{
      borderBottom: `1px solid ${C.surface2}`,
      background: isATM ? "#161e2e" : isRes ? C.redBg : isSup ? C.greenBg : "transparent",
    }}>
      <td style={{ padding: "3px 6px", textAlign: "right", color: C.red   }}>{CE.openInterest.toLocaleString()}</td>
      <td style={{ padding: "3px 6px", textAlign: "right", color: CE.changeinOpenInterest >= 0 ? C.red   : C.green }}>
        {CE.changeinOpenInterest > 0 ? "+" : ""}{CE.changeinOpenInterest.toLocaleString()}
      </td>
      <td style={{ padding: "3px 6px", textAlign: "right", color: C.text  }}>₹{CE.lastPrice}</td>
      <td style={{ padding: "3px 8px", textAlign: "center", fontWeight: 700,
        color:      isATM ? C.blue : isRes ? C.red : isSup ? C.green : C.text,
        background: isATM ? "#1c2a3a" : undefined,
      }}>
        {sp}{isATM ? " ◆" : ""}
      </td>
      <td style={{ padding: "3px 6px", textAlign: "right", color: C.green }}>{PE.openInterest.toLocaleString()}</td>
      <td style={{ padding: "3px 6px", textAlign: "right", color: PE.changeinOpenInterest >= 0 ? C.green : C.red  }}>
        {PE.changeinOpenInterest > 0 ? "+" : ""}{PE.changeinOpenInterest.toLocaleString()}
      </td>
      <td style={{ padding: "3px 6px", textAlign: "right", color: C.text  }}>₹{PE.lastPrice}</td>
      <td style={{ padding: "3px 6px", textAlign: "right", color: buColor, whiteSpace: "nowrap", fontSize: 10 }}>
        {buLabel}
      </td>
    </tr>
  );
});

export const StrikeTable = React.memo(function StrikeTable({ displayRows, atm, sig }) {
  return (
    <div style={{ background: C.surface, borderRadius: 10, padding: 10, marginBottom: 10, overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, minWidth: 600 }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${C.border}` }}>
            {HEADER_CELLS.map((h) => (
              <th key={h} style={{ padding: "5px 6px", color: C.muted, textAlign: "right", whiteSpace: "nowrap", fontWeight: 600 }}>
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
