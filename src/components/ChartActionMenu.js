"use client";

import { useEffect, useId, useRef, useState } from "react";

export default function ChartActionMenu({ label, accessibleLabel, children }) {
  const [open, setOpen] = useState(false);
  const root = useRef(null);
  const trigger = useRef(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const dismiss = (event) => {
      if (!root.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("focusin", dismiss);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("focusin", dismiss);
    };
  }, [open]);

  return (
    <div className="chart-action-menu" ref={root} onKeyDown={(event) => {
      if (event.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    }}>
      <button type="button" className="custom-button" ref={trigger}
        aria-label={accessibleLabel} aria-expanded={open} aria-controls={id}
        onClick={() => setOpen((value) => !value)}>
        {label}
      </button>
      {open && (
        <div id={id} className="chart-action-popover" onClick={(event) => {
          if (event.target.closest("button, a")) {
            setOpen(false);
            trigger.current?.focus();
          }
        }}>
          {children}
        </div>
      )}
    </div>
  );
}
