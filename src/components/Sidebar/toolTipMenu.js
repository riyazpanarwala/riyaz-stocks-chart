import React, { useState, useRef } from "react";

const TooltipSubMenu = ({ styles, tooltipObj, onClick }) => {
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const { name, icon, subMenu } = tooltipObj;
  const hideTimer = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const ref = useRef();

  const showTooltip = () => {
    clearTimeout(hideTimer.current);
    const rect = ref.current.getBoundingClientRect();
    setPos({
      top: rect.top,
      left: rect.right + 5,
    });
    setTooltipOpen(true);
  };

  const hideTooltip = () => {
    /* small delay so mouse can move into the tooltip itself */
    hideTimer.current = setTimeout(() => setTooltipOpen(false), 120);
  };

  return (
    <div
      ref={ref}
      className={styles.button}
      style={{ position: "relative" }}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
    >
      {icon}
      <span>{name}</span>

      {tooltipOpen && (
        <div
          className={styles.tooltip}
          onMouseEnter={showTooltip}
          onMouseLeave={hideTooltip}
          style={{
            position: "fixed",
            top: pos.top,
            left: pos.left,
            zIndex: 9999,
            minWidth: "210px",
          }}
        >
          {subMenu.map((v) => (
            <div
              className={`${styles.tooltipItem} ${v.isActive ? styles.active : ""
                }`}
              onClick={(e) => {
                setTooltipOpen(false);
                onClick(e, v.id ? v.id : v);
              }}
              key={v.id || v.value || v.label || v.name}
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
