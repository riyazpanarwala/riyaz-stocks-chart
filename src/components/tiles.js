import React from "react";
import styles from "./Tiles.module.css";

const Tiles = ({ periods, selectedPeriod, setSelectedPeriod }) => {
  return (
    <div className={styles.tilesContainer}>
      {periods.map((period) => (
        <div
          key={period}
          className={`${styles.tile} ${selectedPeriod === period ? styles.active : ""}`}
          onClick={() => setSelectedPeriod(period)}
        >
          {period}
        </div>
      ))}
    </div>
  );
};

export default Tiles;
