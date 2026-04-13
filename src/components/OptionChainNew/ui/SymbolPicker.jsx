// ═══════════════════════════════════════════════════════════════
// SYMBOL PICKER — Searchable dropdown for F&O instruments
// ═══════════════════════════════════════════════════════════════
import React, { useState, useMemo, useRef, useEffect } from "react";
import { C } from "../constants.js";
import FO_LIST from "../FOlist.js";

const TypeBadge = React.memo(function TypeBadge({ type }) {
  const isIndex = type === "index";
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, padding: "2px 5px", borderRadius: 3, flexShrink: 0,
      background: isIndex ? "#0d1e2e" : "#1a0a1a",
      color:      isIndex ? C.blue    : C.purple,
      letterSpacing: 0.5,
    }}>
      {isIndex ? "IDX" : "STK"}
    </span>
  );
});

const PickerItem = React.memo(function PickerItem({ item, isSelected, onSelect }) {
  return (
    <div
      role="option"
      aria-selected={isSelected}
      onClick={() => onSelect(item)}
      style={{
        padding: "8px 12px", cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
        borderRadius: 5,
        background: isSelected ? C.surface2 : "transparent",
        transition: "background .1s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = C.surface2)}
      onMouseLeave={(e) => (e.currentTarget.style.background = isSelected ? C.surface2 : "transparent")}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        <TypeBadge type={item.type} />
        <div style={{ minWidth: 0 }}>
          <div style={{ color: C.text, fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {item.symbol}
          </div>
          <div style={{ color: C.muted, fontSize: 10, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {item.name}
          </div>
        </div>
      </div>
      <span style={{ color: C.muted, fontSize: 10, flexShrink: 0 }}>Lot: {item.lot}</span>
    </div>
  );
});

export const SymbolPicker = React.memo(function SymbolPicker({ selected, onChange }) {
  const [open,  setOpen]  = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef(null);
  const inputRef     = useRef(null);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return FO_LIST;
    return FO_LIST.filter(
      (i) => i.name.toLowerCase().includes(q) || i.symbol.toLowerCase().includes(q),
    );
  }, [query]);

  const indices = useMemo(() => filtered.filter((i) => i.type === "index"), [filtered]);
  const stocks  = useMemo(() => filtered.filter((i) => i.type === "stock"),  [filtered]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Auto-focus search input — requestAnimationFrame is more semantically correct
  // than an arbitrary setTimeout(, 50): it schedules focus for the very next
  // paint frame after the dropdown has been inserted into the DOM.
  useEffect(() => {
    if (!open) return;
    const raf = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(raf);
  }, [open]);

  const handleSelect = (item) => {
    onChange(item);
    setOpen(false);
    setQuery("");
  };

  return (
    <div ref={containerRef} style={{ position: "relative", minWidth: 0, flex: 1, maxWidth: 320 }}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{
          width: "100%", padding: "8px 12px", borderRadius: 8, cursor: "pointer",
          border: `1px solid ${open ? C.blue : C.border}`,
          background: C.surface, color: C.text,
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
          fontFamily: "'IBM Plex Mono',monospace", transition: "border-color .2s",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          {selected && <TypeBadge type={selected.type} />}
          <span style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {selected ? selected.symbol : "Select Symbol"}
          </span>
        </div>
        <span style={{ color: C.muted, fontSize: 10, flexShrink: 0 }}>▾</span>
      </button>

      {open && (
        <div role="listbox" style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, minWidth: 280,
          background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10,
          zIndex: 1000, boxShadow: "0 8px 32px #00000088", overflow: "hidden",
        }}>
          {/* Search */}
          <div style={{ padding: "8px 10px", borderBottom: `1px solid ${C.border}` }}>
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search symbol or name…"
              style={{
                width: "100%", padding: "7px 10px", borderRadius: 6, outline: "none",
                border: `1px solid ${C.border}`, background: C.bg, color: C.text,
                fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, boxSizing: "border-box",
              }}
            />
          </div>

          {/* List */}
          <div style={{ maxHeight: 300, overflowY: "auto", padding: "4px 6px 6px" }}>
            {indices.length > 0 && (
              <>
                <div style={{ fontSize: 9, color: C.muted, padding: "6px 6px 3px", letterSpacing: 1 }}>── INDICES</div>
                {indices.map((i) => (
                  <PickerItem key={i.symbol} item={i} isSelected={selected?.symbol === i.symbol} onSelect={handleSelect} />
                ))}
              </>
            )}
            {stocks.length > 0 && (
              <>
                <div style={{ fontSize: 9, color: C.muted, padding: "6px 6px 3px", letterSpacing: 1 }}>── STOCKS ({stocks.length})</div>
                {stocks.map((i) => (
                  <PickerItem key={i.symbol} item={i} isSelected={selected?.symbol === i.symbol} onSelect={handleSelect} />
                ))}
              </>
            )}
            {filtered.length === 0 && (
              <div style={{ padding: 20, textAlign: "center", color: C.muted, fontSize: 12 }}>
                No results for "{query}"
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});
