import React from "react";

const ExpirySelector = ({ expiries = [], value, onChange }) => {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <select
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: "8px 12px",
          borderRadius: 8,
          background: "#1e293b",
          color: "white",
          border: "none",
          minWidth: 140,
        }}
      >
        {expiries.map((exp) => (
          <option key={exp} value={exp}>
            {exp}
          </option>
        ))}
      </select>
    </div>
  );
};

export default ExpirySelector;
