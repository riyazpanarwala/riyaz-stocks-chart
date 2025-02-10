import React from "react";
import ReactSelect from "./Select/ReactSelect";

const watchlistArray = [
  {
    label: "JPPOWER",
    symbol: "JPPOWER",
    value: "INE351F01018",
    nse: true,
    bse: false,
  },
  {
    label: "MAZDOCK",
    symbol: "MAZDOCK",
    value: "INE249Z01020",
    nse: true,
    bse: false,
  },
  {
    label: "NHPC",
    symbol: "NHPC",
    value: "INE848E01016",
    nse: true,
    bse: false,
  },
  {
    label: "COALINDIA",
    symbol: "COALINDIA",
    value: "INE522F01014",
    nse: true,
    bse: false,
  },
  {
    label: "IRFC",
    symbol: "IRFC",
    value: "INE053F01010",
    nse: true,
    bse: false,
  },
  {
    label: "ONGC",
    symbol: "ONGC",
    value: "INE213A01029",
    nse: true,
    bse: false,
  },
  {
    label: "RPOWER",
    symbol: "RPOWER",
    value: "INE614G01033",
    nse: true,
    bse: false,
  },
  {
    label: "SUZLON",
    symbol: "SUZLON",
    value: "INE040H01021",
    nse: true,
    bse: false,
  },
  {
    label: "SEPC",
    symbol: "SEPC",
    value: "INE964H01014",
    nse: true,
    bse: false,
  },
  {
    label: "BPCL",
    symbol: "BPCL",
    value: "INE029A01011",
    nse: true,
    bse: false,
  },
  {
    label: "GTLINFRA",
    symbol: "GTLINFRA",
    value: "INE221H01019",
    nse: true,
    bse: false,
  },
  {
    label: "VEDANTA",
    symbol: "VEDL",
    value: "INE205A01025",
    nse: true,
    bse: false,
  },
  { label: "BEL", symbol: "BEL", value: "INE263A01024", nse: true, bse: false },
  {
    label: "NBCC",
    symbol: "NBCC",
    value: "INE095N01031",
    nse: true,
    bse: false,
  },
  { label: "SRESTHAFINVEST", value: "INE606K01049", nse: false, bse: true },
];

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
              options={watchlistArray}
              onChange={handleCompanyChange}
              value={companyObj}
              width="200px"
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
