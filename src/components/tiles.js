import React from "react";
import styles from "./Tiles.module.css";

const Tiles = ({ periods, selectedPeriod, setSelectedPeriod }) => {
  return (
    <div className={styles.tilesContainer}>
      {periods.map((period) => (
        <button
          type="button"
          key={period}
          className={`${styles.tile} ${selectedPeriod === period ? styles.active : ""}`}
          aria-pressed={selectedPeriod === period}
          onClick={() => setSelectedPeriod(period)}
        >
          {period}
        </button>
      ))}
    </div>
  );
};

export default Tiles;
