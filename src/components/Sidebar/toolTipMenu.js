import React, { useState } from "react";

const TooltipSubMenu = ({ styles, tooltipObj, onClick }) => {
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const { name, icon, subMenu } = tooltipObj;

  return (
    <div
      className={styles.button}
      style={{ position: "relative" }}
      onMouseEnter={() => setTooltipOpen(true)}
      onMouseLeave={() => setTooltipOpen(false)}
    >
      {icon}
      <span>{name}</span>

      {/* Tooltip Submenu */}
      {tooltipOpen && (
        <div className={styles.tooltip}>
          {subMenu.map((v) => {
            return (
              <div
                className={`${styles.tooltipItem} ${
                  v.isActive ? styles.active : ""
                }`}
                onClick={(e) => {
                  setTooltipOpen(false);
                  onClick(e, v.id ? v.id : v);
                }}
                key={v.id || v.value}
              >
                {v.name || v.label}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TooltipSubMenu;
