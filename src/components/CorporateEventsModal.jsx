"use client";
import React, { useMemo, useEffect, useRef } from "react";
import "./TechnicalInfo/Modal.scss";
import "./CorporateEventsModal.scss";
import { corporateActionDate } from "./utils/corporateActionDate.js";

/**
 * CorporateEventsModal renders a comprehensive modal dialog displaying
 * historical dividends and stock splits for the selected stock.
 *
 * It provides:
 * - Focus trapping and focus restoration for accessibility (WCAG dialog pattern)
 * - Exact ex-date extraction from each corporate action event
 * - Multi-event mapping support per candle
 * - Badge toggle control for the chart
 *
 * @param {object} props - Component props
 * @param {object} props.companyObj - Active company metadata object
 * @param {Array<object>} [props.candleData] - Loaded candles array
 * @param {object|null} [props.selectedEvent] - Event selected by clicking a badge on chart
 * @param {Function} props.onClose - Modal close callback
 * @param {boolean} [props.showBadges] - Whether badges are currently displayed on chart
 * @param {Function} [props.onToggleBadges] - Toggle badges callback
 * @returns {React.ReactElement} Corporate events modal dialog
 */
export default function CorporateEventsModal({
  companyObj,
  candleData = [],
  selectedEvent = null,
  onClose,
  showBadges = true,
  onToggleBadges,
}) {
  const modalRef = useRef(null);
  const closeBtnRef = useRef(null);
  const previousActiveElementRef = useRef(null);

  // Manage accessibility focus: capture trigger, focus inside dialog, trap tab, restore focus on unmount
  useEffect(() => {
    previousActiveElementRef.current =
      typeof document !== "undefined" ? document.activeElement : null;

    const timer = setTimeout(() => {
      if (closeBtnRef.current) {
        closeBtnRef.current.focus();
      }
    }, 50);

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === "Tab" && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", handleKeyDown);
      if (
        previousActiveElementRef.current &&
        typeof previousActiveElementRef.current.focus === "function"
      ) {
        previousActiveElementRef.current.focus();
      }
    };
  }, [onClose]);

  // Extract all dividend and split events across the loaded candles,
  // deriving the event's true ex-date rather than the candle date.
  const allEvents = useMemo(() => {
    const events = [];
    for (const c of candleData) {
      if (!c) continue;
      const candleDateStr = corporateActionDate(c.date);

      const candleDividends = c.dividends || (c.dividend ? [c.dividend] : []);
      for (const div of candleDividends) {
        const eventDateStr = corporateActionDate(div.date, candleDateStr);

        events.push({
          type: "dividend",
          date: eventDateStr,
          amount: Number(div.amount),
          close: c.close,
          candleDate: candleDateStr,
          rawDate: div.date || c.date,
        });
      }

      const candleSplits = c.splits || (c.split ? [c.split] : []);
      for (const sp of candleSplits) {
        const eventDateStr = corporateActionDate(sp.date, candleDateStr);

        events.push({
          type: "split",
          date: eventDateStr,
          ratio: sp.splitRatio || `${sp.numerator}:${sp.denominator}`,
          close: c.close,
          candleDate: candleDateStr,
          rawDate: sp.date || c.date,
        });
      }
    }

    // Sort newest first by ex-date
    return events.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  }, [candleData]);

  const dividendEvents = useMemo(
    () => allEvents.filter((e) => e.type === "dividend"),
    [allEvents]
  );
  const splitEvents = useMemo(
    () => allEvents.filter((e) => e.type === "split"),
    [allEvents]
  );

  const companyName =
    companyObj?.name || companyObj?.symbol || companyObj?.value || "Stock";
  const ticker = companyObj?.symbol || companyObj?.value || "";

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="corporate-actions-title"
    >
      <div
        ref={modalRef}
        className="modal-content corporate-events-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: "680px",
          background: "var(--surface-1, #12151f)",
          borderRadius: "14px",
          border: "1px solid var(--bd-dim, rgba(255,255,255,0.1))",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "18px 24px",
            borderBottom: "1px solid var(--bd-dim, rgba(255,255,255,0.08))",
            background: "var(--surface-2, #181c28)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "20px" }}>🏷️</span>
              <h2
                id="corporate-actions-title"
                style={{
                  margin: 0,
                  fontSize: "18px",
                  fontWeight: "700",
                  color: "var(--tx-primary, #ffffff)",
                }}
              >
                Corporate Actions
              </h2>
              <span
                style={{
                  fontSize: "12px",
                  padding: "2px 8px",
                  borderRadius: "4px",
                  background: "rgba(0, 207, 247, 0.12)",
                  color: "var(--accent, #00cff7)",
                  fontWeight: "600",
                }}
              >
                {ticker}
              </span>
            </div>
            <div
              style={{
                fontSize: "13px",
                color: "var(--tx-second, #8b949e)",
                marginTop: "4px",
              }}
            >
              {companyName} • Historical Dividends & Stock Splits
            </div>
          </div>

          <button
            ref={closeBtnRef}
            onClick={onClose}
            className="close-btn"
            style={{ position: "static" }}
            aria-label="Close corporate actions dialog"
          >
            ✕
          </button>
        </div>

        {/* Controls & Quick Stats */}
        <div
          style={{
            padding: "16px 24px",
            display: "flex",
            flexWrap: "wrap",
            gap: "12px",
            justifyContent: "space-between",
            alignItems: "center",
            background: "rgba(255, 255, 255, 0.02)",
            borderBottom: "1px solid var(--bd-dim, rgba(255,255,255,0.06))",
          }}
        >
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <div
              style={{
                padding: "6px 12px",
                borderRadius: "8px",
                background: "rgba(16, 185, 129, 0.12)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <span
                style={{
                  width: "18px",
                  height: "18px",
                  borderRadius: "50%",
                  background: "var(--event-dividend-text)",
                  color: "var(--surface-1)",
                  fontSize: "11px",
                  fontWeight: "800",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                D
              </span>
              <span style={{ fontSize: "12px", color: "var(--event-dividend-text)", fontWeight: "600" }}>
                {dividendEvents.length} Dividends
              </span>
            </div>

            <div
              style={{
                padding: "6px 12px",
                borderRadius: "8px",
                background: "rgba(139, 92, 246, 0.12)",
                border: "1px solid rgba(139, 92, 246, 0.3)",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <span
                style={{
                  width: "18px",
                  height: "18px",
                  borderRadius: "50%",
                  background: "var(--event-split-text)",
                  color: "var(--surface-1)",
                  fontSize: "11px",
                  fontWeight: "800",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                S
              </span>
              <span style={{ fontSize: "12px", color: "var(--event-split-text)", fontWeight: "600" }}>
                {splitEvents.length} Splits / Bonuses
              </span>
            </div>
          </div>

          {onToggleBadges && (
            <button
              onClick={onToggleBadges}
              style={{
                background: showBadges
                  ? "rgba(16, 185, 129, 0.15)"
                  : "rgba(255, 255, 255, 0.05)",
                border: `1px solid ${
                  showBadges ? "#10b981" : "rgba(255, 255, 255, 0.15)"
                }`,
                color: showBadges ? "var(--event-dividend-text)" : "var(--tx-second, #8b949e)",
                borderRadius: "6px",
                padding: "6px 12px",
                fontSize: "12px",
                fontWeight: "600",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                transition: "all 0.15s ease",
              }}
            >
              <span>{showBadges ? "✓ Chart Badges Visible" : "○ Badges Hidden"}</span>
            </button>
          )}
        </div>

        {/* Selected Event Focus Banner (if user clicked on a specific badge) */}
        {selectedEvent && (
          <div
            style={{
              margin: "16px 24px 0",
              padding: "12px 16px",
              borderRadius: "8px",
              background:
                selectedEvent.type === "dividend"
                  ? "rgba(16, 185, 129, 0.15)"
                  : "rgba(139, 92, 246, 0.15)",
              border: `1px solid ${
                selectedEvent.type === "dividend"
                  ? "rgba(16, 185, 129, 0.4)"
                  : "rgba(139, 92, 246, 0.4)"
              }`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: "700",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  color:
                    selectedEvent.type === "dividend" ? "var(--event-dividend-text)" : "var(--event-split-text)",
                }}
              >
                Selected Badge on Chart
              </div>
              <div
                style={{
                  fontSize: "14px",
                  fontWeight: "700",
                  color: "var(--tx-primary, #ffffff)",
                  marginTop: "2px",
                }}
              >
                {selectedEvent.type === "dividend"
                  ? `Dividend: ₹${Number(selectedEvent.amount).toFixed(2)} per share`
                  : `Stock Split: ${selectedEvent.ratio}`}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "12px", color: "var(--tx-second, #8b949e)" }}>
                Ex-Date
              </div>
              <div style={{ fontSize: "13px", fontWeight: "600", color: "var(--tx-primary, #ffffff)" }}>
                {corporateActionDate(selectedEvent.date, "—")}
              </div>
            </div>
          </div>
        )}

        {/* Table Content */}
        <div style={{ padding: "16px 24px", maxHeight: "55vh", overflow: "auto", minHeight: 0 }}>
          {allEvents.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "48px 16px",
                color: "var(--tx-second, #8b949e)",
              }}
            >
              <div style={{ fontSize: "32px", marginBottom: "8px" }}>ℹ️</div>
              <div style={{ fontSize: "15px", fontWeight: "600", color: "var(--tx-primary, #ffffff)" }}>
                No Corporate Actions Recorded
              </div>
              <div style={{ fontSize: "13px", marginTop: "4px" }}>
                No dividends or splits found for {ticker} in the selected period.
                Try selecting a longer period (e.g. 1 Year, 5 Years, or Max).
              </div>
            </div>
          ) : (
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "13px",
                fontFamily: "var(--font-ui, system-ui, sans-serif)",
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom: "1px solid var(--bd-dim, rgba(255,255,255,0.12))",
                    textAlign: "left",
                    color: "var(--tx-second, #8b949e)",
                    fontSize: "12px",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  <th style={{ padding: "10px 12px" }}>Ex-Date</th>
                  <th style={{ padding: "10px 12px" }}>Action</th>
                  <th style={{ padding: "10px 12px" }}>Detail / Value</th>
                  <th style={{ padding: "10px 12px", textAlign: "right" }}>
                    Stock Close
                  </th>
                </tr>
              </thead>
              <tbody>
                {allEvents.map((event, idx) => {
                  const isSelected =
                    selectedEvent &&
                    corporateActionDate(selectedEvent.date) === event.date &&
                    selectedEvent.type === event.type;

                  return (
                    <tr
                      key={`evt-${event.type}-${event.date}-${idx}`}
                      style={{
                        borderBottom: "1px solid var(--bd-faint)",
                        background: isSelected
                          ? "rgba(0, 207, 247, 0.08)"
                          : idx % 2 === 0
                          ? "transparent"
                          : "rgba(255, 255, 255, 0.02)",
                      }}
                    >
                      <td
                        style={{
                          padding: "10px 12px",
                          fontFamily: "DM Mono, monospace",
                          color: "var(--tx-primary, #ffffff)",
                          fontWeight: isSelected ? "700" : "500",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {event.date || "—"}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        {event.type === "dividend" ? (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "5px",
                              padding: "2px 8px",
                              borderRadius: "4px",
                              background: "rgba(16, 185, 129, 0.15)",
                              color: "var(--event-dividend-text)",
                              fontSize: "12px",
                              fontWeight: "700",
                            }}
                          >
                            <span
                              style={{
                                width: "14px",
                                height: "14px",
                                borderRadius: "50%",
                                background: "var(--event-dividend-text)",
                                color: "var(--surface-1)",
                                fontSize: "9px",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              D
                            </span>
                            Dividend
                          </span>
                        ) : (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "5px",
                              padding: "2px 8px",
                              borderRadius: "4px",
                              background: "rgba(139, 92, 246, 0.15)",
                              color: "var(--event-split-text)",
                              fontSize: "12px",
                              fontWeight: "700",
                            }}
                          >
                            <span
                              style={{
                                width: "14px",
                                height: "14px",
                                borderRadius: "50%",
                                background: "var(--event-split-text)",
                                color: "var(--surface-1)",
                                fontSize: "9px",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              S
                            </span>
                            Stock Split
                          </span>
                        )}
                      </td>
                      <td
                        style={{
                          padding: "10px 12px",
                          fontWeight: "700",
                          color:
                            event.type === "dividend" ? "var(--event-dividend-text)" : "var(--event-split-text)",
                          fontSize: "13px",
                        }}
                      >
                        {event.type === "dividend"
                          ? `₹${Number(event.amount).toFixed(2)} / share`
                          : `${event.ratio} Ratio`}
                      </td>
                      <td
                        style={{
                          padding: "10px 12px",
                          textAlign: "right",
                          fontFamily: "DM Mono, monospace",
                          color: "var(--tx-second, #8b949e)",
                        }}
                      >
                        {Number.isFinite(event.close)
                          ? `₹${Number(event.close).toFixed(2)}`
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer Note */}
        <div
          style={{
            padding: "12px 24px",
            background: "var(--surface-2, #181c28)",
            borderTop: "1px solid var(--bd-dim, rgba(255,255,255,0.08))",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "11px",
            color: "var(--tx-second, #8b949e)",
          }}
        >
          <span>Data source: Yahoo Finance Corporate Actions API</span>
          <button
            onClick={onClose}
            style={{
              padding: "6px 14px",
              borderRadius: "6px",
              background: "var(--accent, #00cff7)",
              color: "#000000",
              fontWeight: "700",
              border: "none",
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
