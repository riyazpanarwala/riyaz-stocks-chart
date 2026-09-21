// src/components/Heatmap/SectorHeatmapGrid.jsx
"use client";

import React from "react";
import { motion } from "framer-motion";
import { FiChevronRight, FiTrendingUp, FiTrendingDown } from "react-icons/fi";

function getPerformanceColorClass(changePercent) {
  if (changePercent >= 2.0) return "heat-super-green";
  if (changePercent >= 0.8) return "heat-green";
  if (changePercent > 0) return "heat-mild-green";
  if (changePercent === 0) return "heat-neutral";
  if (changePercent > -0.8) return "heat-mild-red";
  if (changePercent > -2.0) return "heat-red";
  return "heat-super-red";
}

export default function SectorHeatmapGrid({
  sectors = [],
  selectedSectorId,
  onSelectSector,
}) {
  if (!sectors || sectors.length === 0) {
    return (
      <div className="empty-heatmap-state">
        <p>No sector data available.</p>
      </div>
    );
  }

  return (
    <div className="sector-heatmap-grid" role="region" aria-label="NSE Sector Heatmap Grid">
      {sectors.map((sector) => {
        const isUp = (sector.changePercent ?? 0) >= 0;
        const colorClass = getPerformanceColorClass(sector.changePercent);
        const isSelected = selectedSectorId === sector.id;

        // Weight classification for grid spanning
        const isHeavyweight = sector.weight >= 12;

        return (
          <motion.div
            key={sector.id}
            layout
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            className={`sector-tile ${colorClass} ${isHeavyweight ? "heavyweight" : ""} ${
              isSelected ? "selected" : ""
            }`}
            onClick={() => onSelectSector(sector)}
            tabIndex={0}
            role="button"
            aria-pressed={isSelected}
            aria-label={`${sector.name} ${isUp ? "up" : "down"} ${sector.changePercent}%`}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelectSector(sector);
              }
            }}
          >
            {/* ── Tile Header ── */}
            <div className="tile-top">
              <div className="tile-identity">
                <span className="tile-icon">{sector.icon}</span>
                <div className="tile-names">
                  <h3 className="sector-title">{sector.name}</h3>
                  <span className="sector-category">{sector.category}</span>
                </div>
              </div>
              <div className={`tile-change-pill ${isUp ? "up" : "down"}`}>
                {isUp ? "+" : ""}{sector.changePercent?.toFixed(2)}%
              </div>
            </div>

            {/* ── Price and Weight ── */}
            <div className="tile-price-row">
              <span className="index-price">
                {sector.price ? sector.price.toLocaleString("en-IN") : "—"}
              </span>
              <span className="sector-weight">
                Weight: ~{sector.weight}%
              </span>
            </div>

            {/* ── Top Gainer / Loser Snippet ── */}
            <div className="tile-constituents-preview">
              {sector.topGainer && (
                <div className="preview-item gainer">
                  <span className="label"><FiTrendingUp /> Top:</span>
                  <span className="sym">{sector.topGainer.symbol}</span>
                  <span className="pct">+{sector.topGainer.changePercent?.toFixed(1)}%</span>
                </div>
              )}
              {sector.topLoser && (
                <div className="preview-item loser">
                  <span className="label"><FiTrendingDown /> Lag:</span>
                  <span className="sym">{sector.topLoser.symbol}</span>
                  <span className="pct">{sector.topLoser.changePercent?.toFixed(1)}%</span>
                </div>
              )}
            </div>

            {/* ── Mini Breadth Tracker within Sector ── */}
            <div className="tile-footer">
              <div className="sector-constituents-count">
                <span>{sector.advances} Adv / {sector.declines} Dec</span>
              </div>
              <span className="drilldown-link">
                View Stocks <FiChevronRight />
              </span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
