import React from "react";

const Tiles = ({ periods, selectedPeriod, setSelectedPeriod }) => {
  return (
    <div style={styles.header}>
      <div style={styles.tilesContainer}>
        {periods.map((period) => (
          <div
            key={period}
            style={{
              ...styles.tile,
              backgroundColor: selectedPeriod === period ? "#00cff7"            : "#1f2436",
              color:           selectedPeriod === period ? "#0c0e14"             : "#7a82a0",
              borderColor:     selectedPeriod === period ? "#00cff7"             : "rgba(255,255,255,0.09)",
              boxShadow:       selectedPeriod === period ? "0 0 8px rgba(0,207,247,0.28)" : "none",
              fontWeight:      selectedPeriod === period ? "600"                 : "400",
            }}
            onClick={() => setSelectedPeriod(period)}
          >
            {period}
          </div>
        ))}
      </div>
    </div>
  );
};

const styles = {
  header: {
    textAlign: "left",
  },
  tilesContainer: {
    display:        "flex",
    justifyContent: "flex-start",
    alignItems:     "center",
    gap:            "5px",
  },
  tile: {
    padding:       "4px 13px",
    borderRadius:  "5px",
    cursor:        "pointer",
    fontSize:      "12px",
    fontFamily:    "'DM Mono', monospace",
    letterSpacing: "0.04em",
    border:        "1px solid rgba(255,255,255,0.09)",
    transition:    "background-color 0.14s, color 0.14s, border-color 0.14s, box-shadow 0.14s",
    userSelect:    "none",
    lineHeight:    "1.6",
  },
};

export default Tiles;
