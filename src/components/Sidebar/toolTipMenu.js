import React, { useState, useRef, useEffect } from "react";

const TooltipSubMenu = ({ styles, tooltipObj, onClick }) => {
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { name, icon, subMenu } = tooltipObj;
  const hideTimer = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const ref = useRef();

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Desktop: hover behaviour
  const showTooltip = () => {
    if (isMobile) return;
    clearTimeout(hideTimer.current);
    const rect = ref.current.getBoundingClientRect();
    setPos({
      top:
        rect.top + rect.height / 2 < 220
          ? rect.top + rect.height / 2 + 40
          : rect.top + rect.height / 2,
      left: rect.right + 5,
    });
    setTooltipOpen(true);
  };

  const hideTooltip = () => {
    if (isMobile) return;
    hideTimer.current = setTimeout(() => setTooltipOpen(false), 120);
  };

  // Mobile: click toggle
  const handleClick = () => {
    if (!isMobile) return;
    setTooltipOpen((prev) => !prev);
  };

  useEffect(() => {
    return () => clearTimeout(hideTimer.current);
  }, []);

  return (
    <div
      ref={ref}
      className={styles.button}
      style={{ position: "relative", flexDirection: "column", alignItems: "flex-start" }}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onClick={handleClick}
    >
      {/* Button row */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, width: "100%" }}>
        {icon}
        <span>{name}</span>
        {isMobile && (
          <span style={{ marginLeft: "auto", fontSize: 10, opacity: 0.6 }}>
            {tooltipOpen ? "▲" : "▼"}
          </span>
        )}
      </div>

      {/* Mobile: inline accordion */}
      {isMobile && tooltipOpen && (
        <div
          style={{
            width: "100%",
            marginTop: 4,
            borderTop: "1px solid rgba(255,255,255,0.08)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {subMenu.map((v) => (
            <div
              className={`${styles.tooltipItem} ${v.isActive ? styles.active : ""}`}
              onClick={(e) => {
                setTooltipOpen(false);
                onClick(e, v.id ?? v);
              }}
              key={v.id ?? v.value ?? v.label ?? v.name}
            >
              {v.name || v.label}
            </div>
          ))}
        </div>
      )}

      {/* Desktop: fixed-position flyout */}
      {!isMobile && tooltipOpen && (
        <div
          className={styles.tooltip}
          style={{
            position: "fixed",
            top: pos.top,
            left: pos.left,
            zIndex: 9999,
            minWidth: "210px",
          }}
          onMouseEnter={() => clearTimeout(hideTimer.current)}
          onMouseLeave={hideTooltip}
        >
          {subMenu.map((v) => (
            <div
              className={`${styles.tooltipItem} ${v.isActive ? styles.active : ""}`}
              onClick={(e) => {
                setTooltipOpen(false);
                onClick(e, v.id ?? v);
              }}
              key={v.id ?? v.value ?? v.label ?? v.name}
            >
              {v.name || v.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TooltipSubMenu;
