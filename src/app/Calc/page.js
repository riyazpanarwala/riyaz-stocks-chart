"use client";

import { useEffect, useState, useMemo } from "react";
import styles from "./calculator.module.css";
import "./theme.css";

const FIELD_LABELS = {
  entryPrice: "Entry Price",
  slPrice: "SL Price",
  slPercent: "SL %",
  riskAmount: "Risk Amount",
  positionAmount: "Position Amount",
  quantity: "Quantity",
  targetPercent: "Target %",
  targetPrice: "Target Price",
  riskReward: "Risk : Reward",
  profitAmount: "Profit Amount",
};

const SUGGESTIONS = {
  entryPrice: [100, 250, 500, 1000],
  slPercent: [0.5, 1, 2, 5],
  targetPercent: [0.5, 1, 2, 5],
};

const EPS = 1e-9;

export default function CalcPage() {
  const [theme, setTheme] = useState("light");
  const [vals, setVals] = useState(
    Object.keys(FIELD_LABELS).reduce((acc, k) => ({ ...acc, [k]: "" }), {})
  );
  const [userProvided, setUserProvided] = useState({});
  const [lastEdited, setLastEdited] = useState(null);

  const toNum = (s) => {
    if (!s) return null;
    const n = Number(String(s).replace(/,/g, ""));
    return Number.isFinite(n) ? n : null;
  };

  /** Track user input and last edited field */
  function setInput(field, rawValue) {
    setVals((prev) => ({ ...prev, [field]: rawValue }));
    setUserProvided((prev) => ({ ...prev, [field]: true }));
    setLastEdited(field);
  }

  /** Iterative calculation */
  function deriveIterative(initial) {
    const v = { ...initial };
    let changed = true;
    let iter = 0;

    while (changed && iter++ < 40) {
      changed = false;

      // SL Price ↔ SL %
      if (lastEdited === "slPrice" && v.entryPrice != null && v.slPrice != null) {
        const slPercent = ((v.entryPrice - v.slPrice) / v.entryPrice) * 100;
        if (Math.abs(slPercent - (v.slPercent || 0)) > EPS) {
          v.slPercent = slPercent;
          changed = true;
        }
      } else if (lastEdited === "slPercent" && v.entryPrice != null && v.slPercent != null) {
        const slPrice = v.entryPrice * (1 - v.slPercent / 100);
        console.log(slPrice);
        if (Math.abs(slPrice - (v.slPrice || 0)) > EPS) {
          v.slPrice = slPrice;
          changed = true;
        }
      }

      // Target Price ↔ Target %
      if (lastEdited === "targetPrice" && v.entryPrice != null && v.targetPrice != null) {
        const targetPercent = ((v.targetPrice - v.entryPrice) / v.entryPrice) * 100;
        if (Math.abs(targetPercent - (v.targetPercent || 0)) > EPS) {
          v.targetPercent = targetPercent;
          changed = true;
        }
      } else if (lastEdited === "targetPercent" && v.entryPrice != null && v.targetPercent != null) {
        const targetPrice = v.entryPrice * (1 + v.targetPercent / 100);
        if (Math.abs(targetPrice - (v.targetPrice || 0)) > EPS) {
          v.targetPrice = targetPrice;
          changed = true;
        }
      }

      // Quantity / Position Amount
      if (v.positionAmount != null && v.entryPrice != null) {
        if (Math.abs(v.entryPrice) > EPS) {
          const quantity = v.positionAmount / v.entryPrice;
          if (Math.abs(quantity - (v.quantity || 0)) > EPS) {
            v.quantity = quantity;
            changed = true;
          }
        }
      }
      if (v.quantity != null && v.entryPrice != null) {
        const posAmt = v.quantity * v.entryPrice;
        if (Math.abs(posAmt - (v.positionAmount || 0)) > EPS) {
          v.positionAmount = posAmt;
          changed = true;
        }
      }

      // Risk Amount / Quantity
      if (v.quantity != null && v.entryPrice != null && v.slPrice != null) {
        const riskAmt = Math.abs(v.entryPrice - v.slPrice) * v.quantity;
        if (Math.abs(riskAmt - (v.riskAmount || 0)) > EPS) {
          v.riskAmount = riskAmt;
          changed = true;
        }
      }
      if (v.riskAmount != null && v.entryPrice != null && v.slPrice != null) {
        const denom = Math.abs(v.entryPrice - v.slPrice);
        if (denom > EPS) {
          const qty = v.riskAmount / denom;
          if (Math.abs(qty - (v.quantity || 0)) > EPS) {
            v.quantity = qty;
            changed = true;
          }
        }
      }

      // Risk : Reward
      if (v.entryPrice != null && v.slPrice != null && v.targetPrice != null) {
        const rr = (v.targetPrice - v.entryPrice) / Math.abs(v.entryPrice - v.slPrice);
        if (Math.abs(rr - (v.riskReward || 0)) > EPS) {
          v.riskReward = rr;
          changed = true;
        }
      }

      // Profit Amount
      if (v.quantity != null && v.entryPrice != null && v.targetPrice != null) {
        const profit = (v.targetPrice - v.entryPrice) * v.quantity;
        if (Math.abs(profit - (v.profitAmount || 0)) > EPS) {
          v.profitAmount = profit;
          changed = true;
        }
      }
    }

    Object.keys(FIELD_LABELS).forEach((k) => {
      if (!(k in v)) v[k] = null;
    });

    return v;
  }

  useEffect(() => {
  const numericVals = {};
  for (const k in vals) numericVals[k] = toNum(vals[k]);

  const derived = deriveIterative(numericVals);

  setVals((prev) => {
    const next = { ...prev };
    let changed = false;

    Object.keys(derived).forEach((k) => {
      // skip only the field the user just typed
      if (k === lastEdited) return;

      const newVal = derived[k];
      const formatted =
        newVal == null
          ? ""
          : Math.abs(newVal - Math.round(newVal)) < 1e-6
          ? String(Math.round(newVal))
          : String(Number(newVal.toFixed(6)));

      if (next[k] !== formatted) {
        next[k] = formatted;
        changed = true;
      }
    });

    return changed ? next : prev;
  });
}, [vals, userProvided, lastEdited]);

  const userFilledCount = useMemo(
    () => Object.keys(vals).filter((k) => vals[k] !== "").length,
    [vals]
  );

  const inputClass = (key) => [styles.input].join(" ");

  return (
    <div className={`${styles.container} ${theme}`}>
      <div className={styles.header}>
        <h1 className={styles.title}>Universal Trading Calculator</h1>
        <button
          className={styles.themeToggle}
          onClick={() => setTheme((t) => (t === "light" ? "dark" : "light"))}
        >
          {theme === "light" ? "🌙 Dark" : "☀️ Light"}
        </button>
      </div>

      <div className={styles.grid}>
        {Object.keys(FIELD_LABELS).map((key) => {
          const id = `calc-${key}`;
          return (
            <div key={key} className={styles.row}>
              <label htmlFor={id} className={styles.rowLabel}>
                {FIELD_LABELS[key]}
              </label>
              <input
                id={id}
                className={inputClass(key)}
                value={vals[key]}
                onChange={(e) => setInput(key, e.target.value)}
                placeholder={FIELD_LABELS[key]}
                inputMode="decimal"
              />
              {SUGGESTIONS[key] && (
                <div className={styles.suggestionRow}>
                  {SUGGESTIONS[key].map((s) => (
                    <button
                      key={s}
                      className={styles.suggestion}
                      onClick={() => setInput(key, String(s))}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className={styles.summary}>
        <div className={styles.summaryRow}>
          <div>Provided</div>
          <div>{userFilledCount} / 10</div>
        </div>
      </div>

      <div className={styles.results}>
        <h3>Computed Values</h3>
        <div className={styles.resultsGrid}>
          {Object.keys(FIELD_LABELS).map((k) => (
            <div key={k} className={styles.resultItem}>
              <div className={styles.rLabel}>{FIELD_LABELS[k]}</div>
              <div className={styles.rValue}>{vals[k] !== "" ? vals[k] : "-"}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ height: 40 }} />
    </div>
  );
}
