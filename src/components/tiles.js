import React from "react";
import { motion } from "framer-motion";
import styles from "./Tiles.module.css";

const Tiles = ({ periods, selectedPeriod, setSelectedPeriod }) => {
  return (
    <div className={styles.tilesContainer}>
      {periods.map((period) => (
        <motion.button
          type="button"
          key={period}
          className={`${styles.tile} ${selectedPeriod === period ? styles.active : ""}`}
          aria-pressed={selectedPeriod === period}
          onClick={() => setSelectedPeriod(period)}
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.94 }}
          animate={{ scale: selectedPeriod === period ? 1.04 : 1 }}
          transition={{ duration: 0.16 }}
        >
          {period}
        </motion.button>
      ))}
    </div>
  );
};

export default Tiles;
