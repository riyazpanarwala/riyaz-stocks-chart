import React from "react";
import companyArr from "./utils/companyArr";

const HeaderWithDropdowns = ({
  interval = "30minute",
  intradayOrHistoric = "intraday",
  companyName,
  handleIntervalChange,
  handleIntradayChange,
  handleCompanyChange,
}) => {
  return (
    <header style={styles.header}>
      <div style={styles.dropdownContainer}>
        <select
          style={styles.select}
          value={interval}
          onChange={handleIntervalChange}
        >
          <option value="" disabled>
            Select Interval
          </option>
          {intradayOrHistoric === "intraday" ? (
            <>
              <option value="1minute">1 Minute</option>
              <option value="30minute">30 Minute</option>
            </>
          ) : (
            <>
              <option value="30minute">30 Minute</option>
              <option value="day">Daily</option>
              <option value="week">Weekly</option>
              <option value="month">Monthly</option>
            </>
          )}
        </select>

        <select
          style={styles.select}
          value={intradayOrHistoric}
          onChange={handleIntradayChange}
        >
          <option value="" disabled>
            Select Second Option
          </option>
          <option value="intraday">Intraday</option>
          <option value="historical">historical</option>
        </select>

        <select
          style={styles.select}
          value={companyName}
          onChange={handleCompanyChange}
        >
          <option value="" disabled>
            Select company
          </option>
          {companyArr.map((v) => {
            return (
              <option value={v.value} key={v.value}>
                {v.name}
              </option>
            );
          })}
        </select>
      </div>
    </header>
  );
};

const styles = {
  header: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "20px",
    backgroundColor: "#f5f5f5",
    borderBottom: "2px solid #ddd",
  },
  dropdownContainer: {
    display: "flex",
    gap: "10px",
  },
  select: {
    padding: "10px",
    fontSize: "16px",
    border: "1px solid #ccc",
    borderRadius: "4px",
  },
};

export default HeaderWithDropdowns;
