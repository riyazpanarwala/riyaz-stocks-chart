import React, { useState } from "react";

const TooltipSubMenu = ({ styles, tooltipObj, onClick }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { name, icon, subMenu } = tooltipObj;

  return (
    <div
      className={styles.button}
      style={{ position: "relative", flexDirection: "column", alignItems: "flex-start" }}
      onClick={() => setIsOpen((prev) => !prev)}
    >
      {/* Button row */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, width: "100%" }}>
        {icon}
        <span>{name}</span>
        <span style={{ marginLeft: "auto", fontSize: 10, opacity: 0.6 }}>
          {isOpen ? "▲" : "▼"}
        </span>
      </div>

      {/* Inline accordion */}
      {isOpen && (
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
                setIsOpen(false);
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
