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
  dataSource = "shoonya",
  wsStatus = "idle",
}) => {
  return (
    <header className="app-header">
      <div className="dropdown-container">
        <div className="grid-container" style={{ alignItems: "center" }}>
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
          <div className="grid-item" style={{ display: "flex", alignItems: "center" }}>
            <span
              title={
                dataSource === "shoonya"
                  ? wsStatus === "connected"
                    ? "Streaming live ticks via Shoonya WebSocket"
                    : "Streaming candlestick data from Shoonya API"
                  : "Operating on Upstox / Yahoo Finance fallback"
              }
              style={{
                fontSize: 10,
                fontFamily: "'IBM Plex Mono', monospace",
                fontWeight: 600,
                padding: "4px 8px",
                borderRadius: 4,
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                background: dataSource === "shoonya" ? "#052e16" : "#2a1e05",
                color: dataSource === "shoonya" ? "#22c55e" : "#eab308",
                border: `1px solid ${dataSource === "shoonya" ? "#14532d" : "#713f12"}`,
                whiteSpace: "nowrap",
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: dataSource === "shoonya" ? "#22c55e" : "#eab308",
                  boxShadow: dataSource === "shoonya" ? "0 0 6px #22c55e" : "none",
                  display: "inline-block",
                }}
              />
              {dataSource === "shoonya"
                ? wsStatus === "connected"
                  ? "Shoonya WS Live"
                  : "Shoonya API"
                : "Upstox Fallback"}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default React.memo(HeaderWithDropdowns);
