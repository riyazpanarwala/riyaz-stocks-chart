// src/components/CandleStickChartClient.js
"use client";
import React, { useEffect, useState } from "react";
import { FullScreen, useFullScreenHandle } from "react-full-screen";
import Sidebar from "./Sidebar/Sidebar.js";
import HeaderWithDropdowns from "./selectDropdown";
import Tiles from "./tiles";
import FinanceChart from "./financeChart";
import SeoIntro from "./SeoIntro.jsx";
import {
  intraArr,
  intervalArr,
  intervalArr1,
  periodDays,
  periodMinutes,
  periodHours,
  periodMax,
} from "./utils/data";
import useCommonHeader from "./useCommonHeader";
import TechnicalInfo from "./TechnicalInfo";
import {
  setToStorage,
  updateStorageData,
  isCompanyExistInStorage,
} from "./utils/storage";
import Fundamentals from "./FundaMentals/index.js";
import ActionButton from "./ActionButton.js";
import TrendlyneChecklist from "./Trendlyne/TrendlyneChecklist.jsx";

const CandleStickChart = () => {
  const [trendLineEnable, setTrendLineEnable] = useState(false);
  const [measurementEnable, setMeasurementEnable] = useState(false);
  const [textEnable, setTextEnable] = useState(false);
  const [indicatorName, setIndicatorName] = useState("rsi");
  const [positionName, setPositionName] = useState("");
  const [shapeName, setShapeName] = useState("");
  const [isAngleEnabled, setAngleEnabled] = useState(false);
  const [breakoutName, setBreakoutName] = useState("");
  const [patternName, setPatternName] = useState("");
  const [modal, setModalOpen] = useState(false);
  const [modal1, setModalOpen1] = useState(false);
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const {
    intervalObj,
    intradayObj,
    companyObj,
    indexObj,
    handleIntervalChange,
    handleIntradayChange,
    handleCompanyChange,
    handleIndexChange,
    handlePeriodChange,
    companyArr,
    newIndexArr,
    candleData,
    period,
  } = useCommonHeader();
  const [isCompanyExist, setCompanyExist] = useState(
    isCompanyExistInStorage(companyObj),
  );
  const handle = useFullScreenHandle();

  const handleWatchListClick = (obj) => {
    disableAllTools();
    handleCompanyChange(obj);
  };

  const handlePatternClick = (id) => {
    disableAllTools();
    setPatternName(id);
  };

  const handleBreakoutClick = (id) => {
    disableAllTools();
    setBreakoutName(id);
  };

  const handleEMAangleClick = () => {
    disableAllTools();
    setAngleEnabled(true);
  };

  const handleShapeClick = (id) => {
    disableAllTools();
    setShapeName(id);
  };

  const handlePositionClick = (id) => {
    disableAllTools();
    setPositionName(id);
  };

  const handleTrendLineClick = () => {
    disableAllTools();
    setTrendLineEnable(true);
  };

  const handleMeasurementClick = () => {
    disableAllTools();
    setMeasurementEnable(true);
  };

  const handleTextClick = () => {
    disableAllTools();
    setTextEnable(true);
  };

  const disableAllTools = () => {
    setAngleEnabled(false);
    setMeasurementEnable(false);
    setTrendLineEnable(false);
    setTextEnable(false);
    setPositionName("");
    setShapeName("");
    setBreakoutName("");
    setPatternName("");
  };

  const getCompanyName = () => companyObj?.label;

  const analysisClick = () => setModalOpen(true);
  const fundaMentalsClick = () => setModalOpen1(true);

  const addToWatchList = () => {
    setToStorage(companyObj);
    setCompanyExist(true);
  };

  const removeFrmWatchList = () => {
    updateStorageData(companyObj);
    setCompanyExist(false);
  };

  const enterFullScreen = async () => {
    handle.enter();
    if (screen.orientation?.lock) {
      try {
        await screen.orientation.lock("landscape");
      } catch (error) {
        console.log("Orientation lock failed:", error);
      }
    }
  };

  useEffect(() => {
    setCompanyExist(isCompanyExistInStorage(companyObj));
  }, [companyObj]);

  useEffect(() => {
    let isMobileViewport = window.innerWidth <= 768;
    setSidebarOpen(!isMobileViewport);

    const syncSidebarForViewportChange = () => {
      const nextIsMobileViewport = window.innerWidth <= 768;
      if (nextIsMobileViewport !== isMobileViewport) {
        isMobileViewport = nextIsMobileViewport;
        setSidebarOpen(!nextIsMobileViewport);
      }
    };

    window.addEventListener("resize", syncSidebarForViewportChange);

    return () => window.removeEventListener("resize", syncSidebarForViewportChange);
  }, []);

  // ── Dynamic <title> per selected stock for SEO ──────────────────────────
  useEffect(() => {
    if (companyObj?.label) {
      const symbol = companyObj.symbol || companyObj.label;
      document.title = `${companyObj.label} (${symbol}) Stock Chart | NSE BSE Technical Analysis`;
    }
  }, [companyObj]);

  // ── Loading state – show SEO intro instead of blank page ────────────────
  if (!companyArr.length) {
    return (
      <>
        {/* Static SEO section visible before JS hydrates */}
        <SeoIntro headingTag="h1" />
      </>
    );
  }

  let periodArr = [];
  let isDisplayHrAndTime = true;
  if (intervalObj.apiUnit === "minutes") {
    periodArr = periodMinutes;
  } else if (intervalObj.apiUnit === "hours") {
    periodArr = periodHours;
  } else if (intervalObj.apiUnit === "days") {
    isDisplayHrAndTime = false;
    periodArr = periodDays;
  } else {
    isDisplayHrAndTime = false;
    periodArr = periodMax;
  }

  return (
    <div className={`chart-shell ${isSidebarOpen ? "" : "sidebar-collapsed"}`}>
      <HeaderWithDropdowns
        intervalObj={intervalObj}
        intradayObj={intradayObj}
        companyObj={companyObj}
        indexObj={indexObj}
        handleIntervalChange={handleIntervalChange}
        handleIntradayChange={handleIntradayChange}
        handleCompanyChange={handleCompanyChange}
        handleIndexChange={handleIndexChange}
        companyArr={companyArr}
        intraArr={intraArr}
        intervalArr={
          intradayObj.value === "intraday" ? intervalArr : intervalArr1
        }
        indexArr={newIndexArr}
      />
      <div className="app-layout">
        <Sidebar
          handleTrendLineClick={handleTrendLineClick}
          trendLineEnable={trendLineEnable}
          measurementEnable={measurementEnable}
          handleMeasurementClick={handleMeasurementClick}
          textEnable={textEnable}
          handleTextClick={handleTextClick}
          indicatorName={indicatorName}
          handleIndicatorClick={setIndicatorName}
          positionName={positionName}
          handlePositionClick={handlePositionClick}
          shapeName={shapeName}
          handleShapeClick={handleShapeClick}
          isAngleEnabled={isAngleEnabled}
          handleEMAangleClick={handleEMAangleClick}
          breakoutName={breakoutName}
          handleBreakoutClick={handleBreakoutClick}
          patternName={patternName}
          handlePatternClick={handlePatternClick}
          handleWatchListClick={handleWatchListClick}
          companyObj={companyObj}
          isOpen={isSidebarOpen}
          onToggle={setSidebarOpen}
        />

        <main className="mainChart" id="main-content">
          <div>
            <div className="headerContent">
              {/* Primary visible H1 heading for Googlebot and screen readers */}
              <h1 className="company-name" aria-label={`${getCompanyName()} stock chart`}>
                {getCompanyName()}
              </h1>
              <div className="action-buttons" role="toolbar" aria-label="Chart actions">
                {(indexObj.value === "NSE_EQ" || indexObj.value === "BSE_EQ") && (
                  <ActionButton
                    onClick={fundaMentalsClick}
                    aria-label={`View fundamental data for ${getCompanyName()}`}
                  >
                    Fundamentals
                  </ActionButton>
                )}
                <ActionButton
                  onClick={analysisClick}
                  aria-label={`View technical analysis for ${getCompanyName()}`}
                >
                  Technical Analysis
                </ActionButton>
                {isCompanyExist ? (
                  <ActionButton
                    onClick={removeFrmWatchList}
                    aria-label={`Remove ${getCompanyName()} from watchlist`}
                  >
                    ★ Remove
                  </ActionButton>
                ) : (
                  <ActionButton
                    onClick={addToWatchList}
                    aria-label={`Add ${getCompanyName()} to watchlist`}
                  >
                    ☆ Add
                  </ActionButton>
                )}
                <div className="mobile-view">
                  <ActionButton onClick={enterFullScreen} aria-label="Enter full screen mode">
                    ⛶ Full Screen
                  </ActionButton>
                </div>
              </div>
            </div>

            {intradayObj.value === "historical" && (
              <div className="tiles-container" role="navigation" aria-label="Time period selector">
                <Tiles
                  periods={periodArr}
                  selectedPeriod={period}
                  setSelectedPeriod={handlePeriodChange}
                />
              </div>
            )}

            {candleData.length ? (
              <FullScreen handle={handle}>
                <div
                  className="finance-charts"
                  role="img"
                  aria-label={`Candlestick chart for ${getCompanyName()}`}
                >
                  <FinanceChart
                    isDisplayHrAndTime={isDisplayHrAndTime}
                    isHistoricalMinutes={intervalObj.apiUnit === "minutes"}
                    isHistoricalHours={intervalObj.apiUnit === "hours"}
                    isIntraday={intradayObj.value === "intraday"}
                    initialData={candleData}
                    trendLineEnable={trendLineEnable}
                    disableAllTools={disableAllTools}
                    measurementEnable={measurementEnable}
                    textEnable={textEnable}
                    indicatorName={indicatorName}
                    positionName={positionName}
                    shapeName={shapeName}
                    isAngleEnabled={isAngleEnabled}
                    breakoutName={breakoutName}
                    patternName={patternName}
                  />
                </div>
              </FullScreen>
            ) : (
              /* Show SEO intro while chart data is loading */
              <SeoIntro headingTag="h2" />
            )}

            {!(companyObj.nseIndex || companyObj.etf || companyObj.global || companyObj.upstoxOnly) && (
              <TrendlyneChecklist
                key={companyObj.symbol}
                symbol={companyObj.symbol}
                isGlobal={companyObj.global}
              />
            )}
          </div>
        </main>

        {modal && (
          <TechnicalInfo
            companyObj={companyObj}
            indexName={indexObj.value}
            onClose={() => setModalOpen(false)}
          />
        )}

        {modal1 && (
          <Fundamentals
            companyObj={companyObj}
            indexObj={indexObj}
            onClose={() => setModalOpen1(false)}
          />
        )}
      </div>
    </div>
  );
};

export default CandleStickChart;

