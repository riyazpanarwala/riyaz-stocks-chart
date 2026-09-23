// src/app/heatmap/HeatmapClient.jsx
"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { FiRefreshCw, FiSearch, FiLayers, FiTrendingUp } from "react-icons/fi";
import MarketBreadthBar from "@/components/Heatmap/MarketBreadthBar";
import SectorHeatmapGrid from "@/components/Heatmap/SectorHeatmapGrid";
import SectorDetailDrawer from "@/components/Heatmap/SectorDetailDrawer";
import "./Heatmap.scss";

/**
 * HeatmapClient - Interactive client controller for NSE Sector Heatmap and Breadth Dashboard.
 * Manages search filtering, sorting, drawer selection, and automatic or manual data refreshes.
 *
 * @param {object} props
 * @param {object|null} [props.initialData=null] - Server-side pre-fetched initial dataset.
 * @returns {JSX.Element}
 */
export default function HeatmapClient({ initialData = null }) {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(!initialData);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("performance-desc");
  const [selectedSector, setSelectedSector] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchData = useCallback(async (forceRefresh = false) => {
    try {
      if (forceRefresh) setRefreshing(true);
      setError(null);

      const url = forceRefresh ? "/api/heatmap?refresh=true" : "/api/heatmap";
      const res = await fetch(url);

      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }

      const json = await res.json();
      if (json.error) {
        throw new Error(json.error);
      }

      setData(json);

      // Reconcile open drawer selection without creating a dependency cycle
      setSelectedSector((current) => {
        if (!current) return null;
        return json.sectors?.find((s) => s.id === current.id) ?? current;
      });
    } catch (err) {
      console.error("Error fetching heatmap data:", err);
      setError(err.message || "Failed to load sector heatmap");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!initialData) {
      fetchData(false);
    }
  }, [initialData, fetchData]);

  // Auto-refresh timer every 60 seconds if enabled
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchData(true);
    }, 60000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

  // Filter and sort sectors
  const processedSectors = useMemo(() => {
    if (!data?.sectors) return [];

    let filtered = [...data.sectors];

    // Search filter (matches sector name or constituent stock symbol)
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.category.toLowerCase().includes(q) ||
          s.constituents?.some(
            (c) =>
              c.symbol.toLowerCase().includes(q) ||
              c.name.toLowerCase().includes(q)
          )
      );
    }

    // Sorting
    filtered.sort((a, b) => {
      if (sortBy === "performance-desc") {
        return (b.changePercent ?? 0) - (a.changePercent ?? 0);
      }
      if (sortBy === "performance-asc") {
        return (a.changePercent ?? 0) - (b.changePercent ?? 0);
      }
      if (sortBy === "weight-desc") {
        return (b.weight ?? 0) - (a.weight ?? 0);
      }
      if (sortBy === "name-asc") {
        return a.name.localeCompare(b.name);
      }
      return 0;
    });

    return filtered;
  }, [data?.sectors, searchQuery, sortBy]);

  const formattedTime = data?.timestamp
    ? new Date(data.timestamp).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : null;

  return (
    <div className="heatmap-page">
      {/* ── Top Navigation Bar ── */}
      <nav className="heatmap-nav" aria-label="Main Navigation">
        <Link href="/" className="heatmap-brand">
          <h1>
            <FiLayers /> Panarwala Market Heatmap
          </h1>
        </Link>
        <div className="heatmap-nav-links">
          <Link href="/" className="nav-pill-link">
            📈 Interactive Chart
          </Link>
          <Link href="/screener" className="nav-pill-link">
            🔍 Signals Screener
          </Link>
          <Link href="/heatmap" className="nav-pill-link active">
            🗺️ Sector Heatmap
          </Link>
          <Link href="/sentiment" className="nav-pill-link">
            🌐 Market Sentiment
          </Link>
          <Link href="/briefing" className="nav-pill-link">
            🤖 AI Briefing
          </Link>
          <Link href="/optionchain" className="nav-pill-link">
            📊 Option Chain
          </Link>
          <Link href="/TradingView" className="nav-pill-link">
            ⚡ TradingView
          </Link>
        </div>
      </nav>

      {/* ── Main Container ── */}
      <main className="heatmap-container">
        {/* Error Banner */}
        {error && (
          <div className="error-banner" style={{ padding: "12px 16px", background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: "8px", color: "#fca5a5", fontSize: "0.85rem" }}>
            <span>⚠️ {error}</span>
          </div>
        )}

        {/* ── Market Breadth Component ── */}
        {data?.breadth && (
          <MarketBreadthBar
            breadth={data.breadth}
            benchmark={data.benchmark}
          />
        )}

        {/* ── Heatmap Toolbar Controls ── */}
        <section className="heatmap-toolbar" aria-label="Heatmap Controls">
          <div className="toolbar-left">
            {/* Search Input */}
            <div className="search-input-box">
              <FiSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search sector or stock..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Filter sectors or constituents"
              />
            </div>

            {/* Sort Selector */}
            <div className="sort-select-box">
              <span>Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                aria-label="Sort sectors"
              >
                <option value="performance-desc">Performance: High to Low</option>
                <option value="performance-asc">Performance: Low to High</option>
                <option value="weight-desc">Index Weight: Largest First</option>
                <option value="name-asc">Alphabetical (A - Z)</option>
              </select>
            </div>
          </div>

          <div className="toolbar-right">
            {/* Auto-Refresh Toggle */}
            <label style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "0.82rem", color: "var(--tx-second, #8b949e)", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
              Auto-refresh (60s)
            </label>

            {/* Manual Refresh Button */}
            <button
              type="button"
              className="refresh-btn"
              onClick={() => fetchData(true)}
              disabled={refreshing || loading}
              title="Refresh Sector & Breadth Quotes"
            >
              <FiRefreshCw className={refreshing ? "spin" : ""} />
              <span>{refreshing ? "Updating..." : "Refresh"}</span>
            </button>

            {/* Snapshot Time */}
            {formattedTime && (
              <span className="cache-indicator">
                Updated: {formattedTime} {data?.isCached ? `(${data.cacheAgeSeconds}s ago)` : ""}
              </span>
            )}
          </div>
        </section>

        {/* ── Loading Skeleton / Sector Grid ── */}
        {loading && !data ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--tx-second, #8b949e)" }}>
            <FiRefreshCw className="spin" size={32} style={{ color: "#10b981", marginBottom: "12px" }} />
            <p>Fetching real-time NSE Sectoral Indices & Breadth data...</p>
          </div>
        ) : (
          <SectorHeatmapGrid
            sectors={processedSectors}
            selectedSectorId={selectedSector?.id}
            onSelectSector={(s) => setSelectedSector(s)}
          />
        )}

        {/* ── Slide-over Detail Drawer ── */}
        {selectedSector && (
          <SectorDetailDrawer
            sector={selectedSector}
            onClose={() => setSelectedSector(null)}
          />
        )}
      </main>
    </div>
  );
}
