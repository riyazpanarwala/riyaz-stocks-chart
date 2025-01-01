import React, { useState } from "react";
import { FaBars } from "react-icons/fa";
import { MdTrendingFlat } from "react-icons/md";
import { LiaRulerHorizontalSolid } from "react-icons/lia";
import { GrIndicator } from "react-icons/gr";
import { CiText } from "react-icons/ci";
import { FcPositiveDynamic } from "react-icons/fc";
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
  ];
  const positionArr = [
    { id: "long", name: "Long Position", isActive: positionName === "long" },
    { id: "short", name: "Short Position", isActive: positionName === "short" },
  ];
  const shapeArr = [
    { id: "circle", name: "Circle", isActive: shapeName === "circle" },
    { id: "rectangle", name: "Rectangle", isActive: shapeName === "rectangle" },
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
      </div>
    </>
  );
};

export default Sidebar;
