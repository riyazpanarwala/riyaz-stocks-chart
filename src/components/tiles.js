import React from "react";

const Tiles = ({ selectedPeriod, setSelectedPeriod }) => {
  // Array of time period tiles
  const periods = ["1m", "3m", "6m", "1y"];

  return (
    <div style={styles.header}>
      <div style={styles.tilesContainer}>
        {periods.map((period) => (
          <div
            key={period}
            style={{
              ...styles.tile,
              backgroundColor:
                selectedPeriod === period ? "#007bff" : "#f0f0f0",
              color: selectedPeriod === period ? "#fff" : "#333",
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
    textAlign: "center",
    marginBottom: "20px",
  },
  tilesContainer: {
    display: "flex",
    justifyContent: "left",
    gap: "10px",
  },
  tile: {
    padding: "10px 20px",
    borderRadius: "5px",
    cursor: "pointer",
    fontSize: "16px",
    fontWeight: "bold",
    transition: "background-color 0.3s, color 0.3s",
  },
};

export default Tiles;
