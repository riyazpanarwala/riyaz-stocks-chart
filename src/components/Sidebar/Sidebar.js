import React, { useState, useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { TbLayoutSidebarLeftCollapse, TbLayoutSidebarLeftExpand } from "react-icons/tb";
import {
  MdTrendingFlat,
  MdOutlineRotate90DegreesCw,
  MdPattern,
} from "react-icons/md";
import { LiaRulerHorizontalSolid } from "react-icons/lia";
import { GrIndicator } from "react-icons/gr";
import { CiText, CiViewList } from "react-icons/ci";
import { FcPositiveDynamic, FcBullish } from "react-icons/fc";
import { FaShapes } from "react-icons/fa";
import TooltipSubMenu from "./toolTipMenu";
import styles from "./Sidebar.module.scss";
import getPatternArr from "./patternArr";
import { getStorageData } from "../utils/storage";

const Sidebar = ({
  handleTrendLineClick,
  trendLineEnable,
  measurementEnable,
  handleMeasurementClick,
  textEnable,
  handleTextClick,
  indicatorName,
  handleIndicatorClick,
  positionName,
  handlePositionClick,
  shapeName,
  handleShapeClick,
  isAngleEnabled,
  handleEMAangleClick,
  breakoutName,
  handleBreakoutClick,
  patternName,
  handlePatternClick,
  handleWatchListClick,
  companyObj,
  isOpen,
  onToggle,
}) => {
  const [watchlistData, setWatchlistData] = useState([]);

  useEffect(() => {
    const updateList = () => {
      setWatchlistData(getStorageData());
    };

    updateList();
    window.addEventListener("watchlist-updated", updateList);
    window.addEventListener("storage", updateList);

    return () => {
      window.removeEventListener("watchlist-updated", updateList);
      window.removeEventListener("storage", updateList);
    };
  }, []);

  const formattedWatchlist = useMemo(() => {
    return watchlistData.map((item) => ({
      ...item,
      isActive: companyObj?.value === item.value,
    }));
  }, [watchlistData, companyObj?.value]);

  const toggleSidebar = () => onToggle((prev) => !prev);
  const closeSidebar = () => {
    if (window.innerWidth <= 768) {
      onToggle(false);
    }
  };

  const indicatorArr = [
    { id: "sma", name: "SMA(20,50,200)", isActive: indicatorName === "sma" },
    { id: "ema", name: "EMA", isActive: indicatorName === "ema" },
    { id: "rsi", name: "RSI", isActive: indicatorName === "rsi" },
    { id: "macd", name: "MACD(12,26,9)", isActive: indicatorName === "macd" },
    { id: "bolinger", name: "Bolinger Band(20,2)", isActive: indicatorName === "bolinger" },
    { id: "zerolagmacd", name: "ZERO LAG MACD(12,26,9)", isActive: indicatorName === "zerolagmacd" },
    { id: "dmi", name: "DMI", isActive: indicatorName === "dmi" },
    { id: "mfi", name: "MFI(14)", isActive: indicatorName === "mfi" },
    { id: "cci", name: "CCI(20)", isActive: indicatorName === "cci" },
    { id: "sto", name: "Stochastic(20,3)", isActive: indicatorName === "sto" },
    { id: "supertrend", name: "SUPERTREND", isActive: indicatorName === "supertrend" },
    { id: "obv", name: "OBV", isActive: indicatorName === "obv" },
  ];

  const positionArr = [
    { id: "long", name: "Long Position", isActive: positionName === "long" },
    { id: "short", name: "Short Position", isActive: positionName === "short" },
  ];

  const shapeArr = [
    { id: "circle", name: "Circle", isActive: shapeName === "circle" },
    { id: "rectangle", name: "Rectangle", isActive: shapeName === "rectangle" },
  ];

  const breakoutsArr = [
    { id: "CE", name: "Chandelier Exit", isActive: breakoutName === "CE" },
    { id: "buysell", name: "Buy and Sell(20) (Not ready)", isActive: breakoutName === "buysell" },
    { id: "volume", name: "Volume (MA20)", isActive: breakoutName === "volume" },
    { id: "support", name: "Support & Resistance (MA20)", isActive: breakoutName === "support" },
  ];

  const crossOverArr = [
    { id: "5-20-sma", name: "5 & 20 SMA", isActive: indicatorName === "5-20-sma" },
    { id: "20-50-sma", name: "20 & 50 SMA", isActive: indicatorName === "20-50-sma" },
    { id: "50-200-sma", name: "50 & 200 SMA", isActive: indicatorName === "50-200-sma" },
  ];

  const patternArr = getPatternArr(patternName);

  return (
    <>
      <button
        type="button"
        className={`${styles.sidebarToggle} ${isOpen ? styles.toggleOpen : ""}`}
        onClick={toggleSidebar}
        aria-label={isOpen ? "Close sidebar" : "Open sidebar"}
        title={isOpen ? "Close sidebar" : "Open sidebar"}
      >
        {isOpen ? <TbLayoutSidebarLeftCollapse /> : <TbLayoutSidebarLeftExpand />}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className={styles.overlay}
            onClick={closeSidebar}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
        )}
      </AnimatePresence>

      <motion.div
        className={`${styles.sidebar} ${isOpen ? styles.open : styles.closed}`}
        initial={false}
        animate={{ x: isOpen ? 0 : "calc(var(--sidebar-w) * -1)" }}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      >
        <div
          className={`${styles.button} ${trendLineEnable ? styles.active : ""}`}
          onClick={() => { closeSidebar(); handleTrendLineClick(); }}
        >
          <MdTrendingFlat className={styles.icon} />
          <span>Trendline</span>
        </div>

        <div
          className={`${styles.button} ${textEnable ? styles.active : ""}`}
          onClick={() => { closeSidebar(); handleTextClick(); }}
        >
          <CiText className={styles.icon} />
          <span>Text</span>
        </div>

        <div
          className={`${styles.button} ${measurementEnable ? styles.active : ""}`}
          onClick={() => { closeSidebar(); handleMeasurementClick(); }}
        >
          <LiaRulerHorizontalSolid className={styles.icon} />
          <span>Measurement</span>
        </div>

        <TooltipSubMenu
          styles={styles}
          tooltipObj={{ name: "WatchList", icon: <CiViewList className={styles.icon} />, subMenu: formattedWatchlist }}
          onClick={(e, id) => { closeSidebar(); handleWatchListClick(id); }}
        />

        <TooltipSubMenu
          styles={styles}
          tooltipObj={{ name: "Indicator", icon: <GrIndicator className={styles.icon} />, subMenu: indicatorArr }}
          onClick={(e, id) => { closeSidebar(); handleIndicatorClick(id); }}
        />

        <TooltipSubMenu
          styles={styles}
          tooltipObj={{ name: "MACrossOver", icon: <MdPattern className={styles.icon} />, subMenu: crossOverArr }}
          onClick={(e, id) => { closeSidebar(); handleIndicatorClick(id); }}
        />

        {indicatorName === "ema" && (
          <div
            className={`${styles.button} ${isAngleEnabled ? styles.active : ""}`}
            onClick={() => { closeSidebar(); handleEMAangleClick(); }}
          >
            <MdOutlineRotate90DegreesCw className={styles.icon} />
            <span>EMA Angle</span>
          </div>
        )}

        <TooltipSubMenu
          styles={styles}
          tooltipObj={{ name: "Position", icon: <FcPositiveDynamic className={styles.icon} />, subMenu: positionArr }}
          onClick={(e, id) => { closeSidebar(); handlePositionClick(id); }}
        />

        <TooltipSubMenu
          styles={styles}
          tooltipObj={{ name: "Shapes", icon: <FaShapes className={styles.icon} />, subMenu: shapeArr }}
          onClick={(e, id) => { closeSidebar(); handleShapeClick(id); }}
        />

        <TooltipSubMenu
          styles={styles}
          tooltipObj={{ name: "Breakout", icon: <FcBullish className={styles.icon} />, subMenu: breakoutsArr }}
          onClick={(e, id) => { closeSidebar(); handleBreakoutClick(id); }}
        />

        <TooltipSubMenu
          styles={styles}
          tooltipObj={{ name: "Pattern", icon: <MdPattern className={styles.icon} />, subMenu: patternArr }}
          onClick={(e, id) => { closeSidebar(); handlePatternClick(id); }}
        />
      </motion.div>
    </>
  );
};

export default Sidebar;
