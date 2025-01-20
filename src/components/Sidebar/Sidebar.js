import React, { useState } from "react";
import { FaBars } from "react-icons/fa";
import {
  MdTrendingFlat,
  MdOutlineRotate90DegreesCw,
  MdPattern,
} from "react-icons/md";
import { LiaRulerHorizontalSolid } from "react-icons/lia";
import { GrIndicator } from "react-icons/gr";
import { CiText } from "react-icons/ci";
import { FcPositiveDynamic, FcBullish } from "react-icons/fc";
import { FaShapes } from "react-icons/fa";
import TooltipSubMenu from "./toolTipMenu";
import styles from "./Sidebar.module.scss";

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
  hangleBreakoutClick,
  patternName,
  hanglePatternClick,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  const closeSidebar = () => {
    setIsOpen(false); // Close sidebar on navigation for mobile
  };

  const indicatorArr = [
    { id: "ema", name: "EMA", isActive: indicatorName === "ema" },
    { id: "rsi", name: "RSI", isActive: indicatorName === "rsi" },
    { id: "dmi", name: "DMI", isActive: indicatorName === "dmi" },
    { id: "obv", name: "OBV", isActive: indicatorName === "obv" },
    { id: "macd", name: "MACD(12,26,9)", isActive: indicatorName === "macd" },
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
    {
      id: "buysell",
      name: "Buy and Sell(20) (Not ready)",
      isActive: breakoutName === "buysell",
    },
    {
      id: "volume",
      name: "Volume (MA20)",
      isActive: breakoutName === "volume",
    },
    {
      id: "support",
      name: "Support & Resistance (MA20)",
      isActive: breakoutName === "support",
    },
  ];
  const patternArr = [
    {
      id: "multibagger",
      name: "MultiBagger",
      isActive: patternName === "multibagger",
    },
    {
      id: "marubozu",
      name: "Marubozu",
      isActive: patternName === "marubozu",
    },
    {
      id: "hammer",
      name: "Hammer",
      isActive: patternName === "hammer",
    },
    {
      id: "morningstar",
      name: "Morning Star",
      isActive: patternName === "morningstar",
    },
  ];

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
        <TooltipSubMenu
          styles={styles}
          tooltipObj={{
            name: "Indicator",
            icon: <GrIndicator className={styles.icon} />,
            subMenu: indicatorArr,
          }}
          onClick={(e, id) => {
            closeSidebar();
            handleIndicatorClick(id);
          }}
        />
        {indicatorName === "ema" ? (
          <div
            className={`${styles.button} ${
              isAngleEnabled ? styles.active : ""
            }`}
            onClick={(e) => {
              closeSidebar();
              handleEMAangleClick(e);
            }}
          >
            <MdOutlineRotate90DegreesCw className={styles.icon} />
            <span>EMA Angle</span>
          </div>
        ) : (
          ""
        )}
        <TooltipSubMenu
          styles={styles}
          tooltipObj={{
            name: "Position",
            icon: <FcPositiveDynamic className={styles.icon} />,
            subMenu: positionArr,
          }}
          onClick={(e, id) => {
            closeSidebar();
            handlePositionClick(id);
          }}
        />
        <TooltipSubMenu
          styles={styles}
          tooltipObj={{
            name: "Shapes",
            icon: <FaShapes className={styles.icon} />,
            subMenu: shapeArr,
          }}
          onClick={(e, id) => {
            closeSidebar();
            handleShapeClick(id);
          }}
        />
        <TooltipSubMenu
          styles={styles}
          tooltipObj={{
            name: "Breakout",
            icon: <FcBullish className={styles.icon} />,
            subMenu: breakoutsArr,
          }}
          onClick={(e, id) => {
            closeSidebar();
            hangleBreakoutClick(id);
          }}
        />
        <TooltipSubMenu
          styles={styles}
          tooltipObj={{
            name: "Pattern",
            icon: <MdPattern className={styles.icon} />,
            subMenu: patternArr,
          }}
          onClick={(e, id) => {
            closeSidebar();
            hanglePatternClick(id);
          }}
        />
      </div>
    </>
  );
};

export default Sidebar;
