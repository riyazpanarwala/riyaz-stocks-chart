import React, { useState } from "react";
import { FaBars } from "react-icons/fa";
import { MdTrendingFlat } from "react-icons/md";
import styles from "./Sidebar.module.scss";

const Sidebar = ({ handleTrendLineClick, trendLineEnable }) => {
  const [isOpen, setIsOpen] = useState(false);

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
      </div>
    </>
  );
};

export default Sidebar;
