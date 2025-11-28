"use client";

import { useEffect, useMemo, useState } from "react";
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

const EPS = 1e-9;

export default function CalcPage() {
  const [theme, setTheme] = useState("light");

  const [vals, setVals] = useState({
    entryPrice: "",
    slPrice: "",
    slPercent: "",
    riskAmount: "",
    positionAmount: "",
    quantity: "",
    targetPercent: "",
    targetPrice: "",
    riskReward: "",
    profitAmount: "",
  });

  const [userProvided, setUserProvided] = useState({});
  const [computed, setComputed] = useState({});
  const [warnings, setWarnings] = useState([]);
  const [missingFields, setMissingFields] = useState([]);
  const [locked, setLocked] = useState({});

  const [extraPick, setExtraPick] = useState("");
  const [extraTyped, setExtraTyped] = useState("");

  const SUGGESTIONS = {
    entryPrice: [100, 250, 500, 1000],
    slPercent: [0.5, 1, 2, 5],
    targetPercent: [0.5, 1, 2, 5],
  };

  const toNum = (s) => {
    if (!s) return null;
    const n = Number(String(s).replace(/,/g, ""));
    return Number.isFinite(n) ? n : null;
  };

  /** Set input & mark user edits */
  function setInput(field, rawValue) {
    setVals((p) => ({ ...p, [field]: rawValue }));
    setUserProvided((p) => ({ ...p, [field]: true }));
  }

  /** Main solver */
  function deriveIterative(initial) {
    const v = { ...initial };
    let changed = true;
    let iter = 0;

    while (changed && iter++ < 40) {
      changed = false;

      if (v.entryPrice != null && v.slPrice != null && v.slPercent == null) {
        v.slPercent = ((v.entryPrice - v.slPrice) / v.entryPrice) * 100;
        changed = true;
      }
      if (v.entryPrice != null && v.slPercent != null && v.slPrice == null) {
        v.slPrice = v.entryPrice * (1 - v.slPercent / 100);
        changed = true;
      }

      if (v.positionAmount != null && v.entryPrice != null && v.quantity == null) {
        if (Math.abs(v.entryPrice) > EPS) {
          v.quantity = v.positionAmount / v.entryPrice;
          changed = true;
        }
      }

      if (v.quantity != null && v.entryPrice != null && v.positionAmount == null) {
        v.positionAmount = v.quantity * v.entryPrice;
        changed = true;
      }

      if (v.entryPrice != null && v.targetPercent != null && v.targetPrice == null) {
        v.targetPrice = v.entryPrice * (1 + v.targetPercent / 100);
        changed = true;
      }

      if (v.entryPrice != null && v.targetPrice != null && v.targetPercent == null) {
        v.targetPercent = ((v.targetPrice - v.entryPrice) / v.entryPrice) * 100;
        changed = true;
      }

      if (v.quantity != null && v.entryPrice != null && v.slPrice != null && v.riskAmount == null) {
        v.riskAmount = Math.abs(v.entryPrice - v.slPrice) * v.quantity;
        changed = true;
      }

      if (v.riskAmount != null && v.entryPrice != null && v.slPrice != null && v.quantity == null) {
        const denom = Math.abs(v.entryPrice - v.slPrice);
        if (denom > EPS) {
          v.quantity = v.riskAmount / denom;
          changed = true;
        }
      }

      if (v.entryPrice != null && v.slPrice != null && v.targetPrice != null && v.riskReward == null) {
        const denom = Math.abs(v.entryPrice - v.slPrice);
        if (denom > EPS) {
          v.riskReward = (v.targetPrice - v.entryPrice) / denom;
          changed = true;
        }
      }

      if (v.quantity != null && v.entryPrice != null && v.targetPrice != null && v.profitAmount == null) {
        v.profitAmount = (v.targetPrice - v.entryPrice) * v.quantity;
        changed = true;
      }
    }

    Object.keys(FIELD_LABELS).forEach((k) => {
      if (!(k in v)) v[k] = null;
    });

    return v;
  }

  function solve(allInputs) {
    const v = {};
    for (const k in allInputs) v[k] = toNum(allInputs[k]);

    const derived = deriveIterative(v);
    const missing = Object.keys(derived).filter((k) => derived[k] == null);

    return { values: derived, missing };
  }

  /** Main effect → compute values */
  useEffect(() => {
    const { values, missing } = solve(vals);
    setComputed(values);

    setMissingFields(missing);
    setWarnings(missing.length > 0 ? ["Please provide one more field from missing list."] : []);
  }, [vals]);

  /** Write computed values BACK to inputs — only if changed */
  useEffect(() => {
    if (!computed) return;

    setVals((prev) => {
      let changed = false;
      const next = { ...prev };

      for (const k of Object.keys(computed)) {
        if (userProvided[k]) continue;

        const newVal = computed[k];
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
      }

      return changed ? next : prev;
    });
  }, [computed, userProvided]);

  /** missing field manual submit */
  function handleExtraSubmit() {
    if (!extraPick) return;
    setInput(extraPick, extraTyped || "");
    setExtraTyped("");
    setExtraPick("");
  }

  const userFilledCount = useMemo(
    () => Object.keys(vals).filter((k) => vals[k] !== "").length,
    [vals]
  );

  const inputClass = (key) => {
    const arr = [styles.input];
    if (missingFields.includes(key)) arr.push(styles.missing);
    return arr.join(" ");
  };

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

      {warnings.length > 0 && (
        <div className={styles.warningBox}>
          {warnings.map((w, i) => (
            <div key={i}>{w}</div>
          ))}
        </div>
      )}

      <div className={styles.grid}>
        {Object.keys(FIELD_LABELS).map((key) => (
          <div key={key} className={styles.row}>
            <label className={styles.rowLabel}>{FIELD_LABELS[key]}</label>

            <input
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
        ))}
      </div>

      {missingFields.length > 0 && (
        <div className={styles.extraPanel}>
          <strong>Missing fields:</strong>{" "}
          {missingFields.map((m) => (
            <span key={m} className={styles.missTag}>
              {FIELD_LABELS[m]}
            </span>
          ))}

          <div className={styles.extraRow}>
            <select
              className={styles.select}
              value={extraPick}
              onChange={(e) => setExtraPick(e.target.value)}
            >
              <option value="">Pick field</option>
              {missingFields.map((m) => (
                <option key={m} value={m}>
                  {FIELD_LABELS[m]}
                </option>
              ))}
            </select>

            <input
              className={styles.extraInput}
              value={extraTyped}
              onChange={(e) => setExtraTyped(e.target.value)}
              placeholder="Enter value"
            />

            <button className={styles.extraBtn} onClick={handleExtraSubmit}>
              Submit
            </button>
          </div>
        </div>
      )}

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
              <div className={styles.rValue}>
                {computed[k] != null
                  ? Number(computed[k]).toFixed(6).replace(/\.?0+$/, "")
                  : "-"}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ height: 40 }} />
    </div>
  );
}
