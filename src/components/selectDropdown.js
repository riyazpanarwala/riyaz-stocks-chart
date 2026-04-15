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
    <header className="app-header">
      <div className="dropdown-container">
        <div className="grid-container">
          <div className="grid-item">
            <ReactSelect
              options={intervalArr}
              onChange={handleIntervalChange}
              value={intervalObj}
              minWidth="140px"
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

export default HeaderWithDropdowns;
