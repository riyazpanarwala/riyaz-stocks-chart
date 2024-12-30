import React, { useState } from "react";
import { FaBars } from "react-icons/fa";
import { MdTrendingFlat } from "react-icons/md";
import { LiaRulerHorizontalSolid } from "react-icons/lia";
import { GrIndicator } from "react-icons/gr";
import { CiText } from "react-icons/ci";
import styles from "./Sidebar.module.scss";

const Sidebar = ({
  handleTrendLineClick,
  trendLineEnable,
  measurementEnable,
  handleMeasurementClick,
  textEnable,
  handleTextClick,
  indicatorName,
  handleEMAClick,
  handleRSIClick,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tooltipOpen, setTooltipOpen] = useState(false);

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  const closeSidebar = () => {
    setIsOpen(false); // Close sidebar on navigation for mobile
  };

  return (
    <>
      {/* Hamburger Menu */}
      <div className={styles.hamburger} onClick={toggleSidebar}>
        <FaBars />
      </div>

      {/* Sidebar */}
      <div className={`${styles.sidebar} ${isOpen ? styles.open : ""}`}>
        <div
          className={`${styles.button} ${trendLineEnable ? styles.active : ""}`}
          onClick={(e) => {
            closeSidebar();
            handleTrendLineClick(e);
          }}
        >
          <MdTrendingFlat className={styles.icon} />
          <span>Trendline</span>
        </div>
        <div
          className={`${styles.button} ${textEnable ? styles.active : ""}`}
          onClick={(e) => {
            closeSidebar();
            handleTextClick(e);
          }}
        >
          <CiText className={styles.icon} />
          <span>Text</span>
        </div>
        <div
          className={`${styles.button} ${
            measurementEnable ? styles.active : ""
          }`}
          onClick={(e) => {
            closeSidebar();
            handleMeasurementClick(e);
          }}
        >
          <LiaRulerHorizontalSolid className={styles.icon} />
          <span>Measurement</span>
        </div>
        <div
          className={styles.button}
          style={{ position: "relative" }}
          onMouseEnter={() => setTooltipOpen(true)}
          onMouseLeave={() => setTooltipOpen(false)}
        >
          <GrIndicator className={styles.icon} />
          <span>Indicator</span>

          {/* Tooltip Submenu */}
          {tooltipOpen && (
            <div className={styles.tooltip}>
              <div
                className={`${styles.tooltipItem} ${
                  indicatorName === "ema" ? styles.active : ""
                }`}
                onClick={(e) => {
                  setTooltipOpen(false);
                  closeSidebar();
                  handleEMAClick(e);
                }}
              >
                EMA
              </div>
              <div
                className={`${styles.tooltipItem} ${
                  indicatorName === "rsi" ? styles.active : ""
                }`}
                onClick={(e) => {
                  setTooltipOpen(false);
                  closeSidebar();
                  handleRSIClick(e);
                }}
              >
                RSI
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Sidebar;
