// src/components/Heatmap/SectorDetailDrawer.jsx
"use client";

import React, { useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { FiX, FiExternalLink, FiTrendingUp, FiTrendingDown, FiCheck, FiMinus } from "react-icons/fi";

/**
 * SectorDetailDrawer - Slide-over modal dialog displaying constituents, price action,
 * moving-average status, and chart navigation for a selected sector.
 * Implements accessible focus trapping and focus restoration on close.
 *
 * @param {object} props
 * @param {object|null} props.sector - Selected sector data object.
 * @param {Function} props.onClose - Callback invoked when closing drawer.
 * @returns {JSX.Element|null}
 */
export default function SectorDetailDrawer({ sector, onClose }) {
  const drawerRef = useRef(null);
  const closeButtonRef = useRef(null);
  const previousFocusRef = useRef(null);

  useEffect(() => {
    // Save trigger element to restore focus on exit
    previousFocusRef.current = document.activeElement;

    // Shift initial focus to the close button once mounted
    const focusTimer = requestAnimationFrame(() => {
      closeButtonRef.current?.focus();
    });

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      // Trap Tab focus inside modal dialog
      if (e.key === "Tab" && drawerRef.current) {
        const focusableElements = drawerRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      cancelAnimationFrame(focusTimer);
      window.removeEventListener("keydown", handleKeyDown);
      // Restore focus to trigger element when drawer unmounts
      if (previousFocusRef.current && typeof previousFocusRef.current.focus === "function") {
        previousFocusRef.current.focus();
      }
    };
  }, [onClose]);

  if (!sector) return null;

  const isUp = (sector.changePercent ?? 0) >= 0;
  const constituents = sector.constituents || [];

  return (
    <AnimatePresence>
      <div className="drawer-backdrop" onClick={onClose}>
        <motion.div
          ref={drawerRef}
          className="sector-detail-drawer"
          initial={{ x: "100%", opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 280 }}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="drawer-sector-title"
        >
          {/* ── Drawer Header ── */}
          <div className="drawer-header">
            <div className="header-info">
              <div className="header-top-line">
                <span className="drawer-icon">{sector.icon}</span>
                <h2 id="drawer-sector-title" className="drawer-title">
                  {sector.name}
                </h2>
                <span className={`drawer-change-badge ${isUp ? "up" : "down"}`}>
                  {isUp ? "+" : ""}{sector.changePercent?.toFixed(2)}%
                </span>
              </div>
              <p className="drawer-subtitle">
                {sector.category} • Index Price: ₹{sector.price?.toLocaleString("en-IN")} • Index Weight: ~{sector.weight}%
              </p>
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              className="drawer-close-btn"
              onClick={onClose}
              aria-label="Close details drawer"
            >
              <FiX size={20} />
            </button>
          </div>

          {/* ── Summary Breadth of this Sector ── */}
          <div className="sector-drawer-stats">
            <div className="stat-box">
              <span className="num advances">{sector.advances}</span>
              <span className="lbl">Advances</span>
            </div>
            <div className="stat-box">
              <span className="num declines">{sector.declines}</span>
              <span className="lbl">Declines</span>
            </div>
            <div className="stat-box">
              <span className="num total">{constituents.length}</span>
              <span className="lbl">Constituents</span>
            </div>
          </div>

          {/* ── Constituents Table / List ── */}
          <div className="drawer-body">
            <div className="constituents-table-wrapper">
              <table className="constituents-table">
                <thead>
                  <tr>
                    <th>Stock</th>
                    <th className="text-right">Price</th>
                    <th className="text-right">Change %</th>
                    <th className="text-center">50 DMA</th>
                    <th className="text-center">200 DMA</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {constituents.map((stock) => {
                    const isStockUp = stock.changePercent >= 0;
                    return (
                      <tr key={stock.symbol} className="constituent-row">
                        <td className="symbol-cell">
                          <span className="stock-sym">{stock.symbol}</span>
                          <span className="stock-name">{stock.name}</span>
                          {stock.isNear52WHigh && (
                            <span className="tag-52w high">Near 52W High</span>
                          )}
                          {stock.isNear52WLow && (
                            <span className="tag-52w low">Near 52W Low</span>
                          )}
                        </td>

                        <td className="text-right price-cell">
                          ₹{stock.price ? stock.price.toLocaleString("en-IN") : "—"}
                        </td>

                        <td className="text-right change-cell">
                          <span className={`change-pill ${isStockUp ? "up" : "down"}`}>
                            {isStockUp ? <FiTrendingUp /> : <FiTrendingDown />}
                            {isStockUp ? "+" : ""}{stock.changePercent?.toFixed(2)}%
                          </span>
                        </td>

                        <td className="text-center ma-cell">
                          {stock.above50 === true ? (
                            <span className="ma-badge above" title={`Price ₹${stock.price} > 50 DMA ₹${stock.fiftyDayAverage}`}>
                              <FiCheck /> Above
                            </span>
                          ) : stock.above50 === false ? (
                            <span className="ma-badge below" title={`Price ₹${stock.price} < 50 DMA ₹${stock.fiftyDayAverage}`}>
                              <FiMinus /> Below
                            </span>
                          ) : (
                            <span className="ma-badge na">—</span>
                          )}
                        </td>

                        <td className="text-center ma-cell">
                          {stock.above200 === true ? (
                            <span className="ma-badge above" title={`Price ₹${stock.price} > 200 DMA ₹${stock.twoHundredDayAverage}`}>
                              <FiCheck /> Above
                            </span>
                          ) : stock.above200 === false ? (
                            <span className="ma-badge below" title={`Price ₹${stock.price} < 200 DMA ₹${stock.twoHundredDayAverage}`}>
                              <FiMinus /> Below
                            </span>
                          ) : (
                            <span className="ma-badge na">—</span>
                          )}
                        </td>

                        <td className="text-right action-cell">
                          <Link
                            href={`/?symbol=${stock.symbol}`}
                            className="chart-link-btn"
                            title={`Open ${stock.symbol} Candlestick Chart`}
                          >
                            Chart <FiExternalLink size={13} />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
