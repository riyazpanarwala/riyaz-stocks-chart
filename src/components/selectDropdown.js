import React from "react";
import ReactSelect from "./Select/ReactSelect";

const HeaderWithDropdowns = ({
  intervalObj,
  intradayObj,
  companyObj,
  indexObj,
  handleIntervalChange,
  handleIntradayChange,
  handleCompanyChange,
  handleIndexChange,
  companyArr,
  intraArr,
  intervalArr,
  indexArr,
}) => {
  return (
    <header style={styles.header}>
      <div style={styles.dropdownContainer}>
        <div className="grid-container">
          <div className="grid-item">
            <ReactSelect
              options={intervalArr}
              onChange={handleIntervalChange}
              value={intervalObj}
              width="auto"
            />
          </div>
          <div className="grid-item">
            <ReactSelect
              options={intraArr}
              onChange={handleIntradayChange}
              value={intradayObj}
              width="auto"
            />
          </div>
          <div className="grid-item">
            <ReactSelect
              options={companyArr}
              onChange={handleCompanyChange}
              value={companyObj}
              width="350px"
            />
          </div>
          <div className="grid-item">
            <ReactSelect
              options={indexArr}
              onChange={handleIndexChange}
              value={indexObj}
              width="auto"
            />
          </div>
        </div>
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
