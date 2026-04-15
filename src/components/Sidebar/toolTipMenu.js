import React, { useState, useRef, useEffect } from "react";

const TooltipSubMenu = ({ styles, tooltipObj, onClick }) => {
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const { name, icon, subMenu } = tooltipObj;
  const hideTimer = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const ref = useRef();

  const showTooltip = () => {
    clearTimeout(hideTimer.current);
    const rect = ref.current.getBoundingClientRect();

    if (rect.top + rect.height / 2 < 220) {
      setPos({
        top: rect.top + rect.height / 2 + 40, // Position tooltip above the button
        left: rect.right + 5,
      });
    } else {
      setPos({
        top: rect.top + rect.height / 2, // Center tooltip vertically on button
        left: rect.right + 5,
      });
    }

    setTooltipOpen(true);
  };

  const hideTooltip = () => {
    /* small delay so mouse can move into the tooltip itself */
    hideTimer.current = setTimeout(() => setTooltipOpen(false), 120);
  };

  useEffect(() => {
    return () => clearTimeout(hideTimer.current);
  }, []);

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
