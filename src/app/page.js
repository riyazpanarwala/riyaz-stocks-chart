"use client";
import React, { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar/Sidebar.js";
import HeaderWithDropdowns from "../components/selectDropdown";
import Tiles from "../components/tiles";
import FinanceChart from "../components/financeChart";
import {
  intraArr,
  intervalArr,
  intervalArr1,
  periods,
} from "../components/utils/data";
import useCommonHeader from "../components/useCommonHeader";
import TechnicalInfo from "../components/TechnicalInfo";
import {
  setToStorage,
  updateStorageData,
  isCompanyExistInStorage,
} from "../components/utils/storage";

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
    isCompanyExistInStorage(companyObj)
  );

  const handleWatchListClick = (obj) => {
    disableAllTools();
    handleCompanyChange(obj);
  };

  const hanglePatternClick = (id) => {
    disableAllTools();
    setPatternName(id);
  };

  const hangleBreakoutClick = (id) => {
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

  const getCompanyName = () => {
    return companyObj?.label;
  };

  const analysisClick = () => {
    setModalOpen(true);
  };

  const addToWatchList = () => {
    setToStorage(companyObj);
    setCompanyExist(true);
  };

  const removeFrmWatchList = () => {
    updateStorageData(companyObj);
    setCompanyExist(false);
  };

  useEffect(() => {
    setCompanyExist(isCompanyExistInStorage(companyObj));
  }, [companyObj]);

  if (!companyArr.length) {
    return "please wait";
  }

  return (
    <>
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
      <div style={{ display: "flex" }}>
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
          hangleBreakoutClick={hangleBreakoutClick}
          patternName={patternName}
          hanglePatternClick={hanglePatternClick}
          handleWatchListClick={handleWatchListClick}
          companyObj={companyObj}
        />
        <main className="mainChart">
          <div>
            <div className="tileDiv">
              {intradayObj.value === "historical" && (
                <Tiles
                  periods={periods}
                  selectedPeriod={period}
                  setSelectedPeriod={handlePeriodChange}
                />
              )}
              <div className="inlineDiv">
                <h2>{getCompanyName()}</h2>
              </div>
              <div className="inlineDiv">
                <div className="inlineBlkDiv">
                  <button onClick={analysisClick} className="custom-button">
                    Technical Analysis
                  </button>
                </div>
                <div className="inlineBlkDiv">
                  {isCompanyExist ? (
                    <button
                      onClick={removeFrmWatchList}
                      className="custom-button"
                    >
                      Remove from WatchList
                    </button>
                  ) : (
                    <button onClick={addToWatchList} className="custom-button">
                      Add to WatchList
                    </button>
                  )}
                </div>
              </div>
            </div>
            {candleData.length ? (
              <div className="finance-charts">
                <FinanceChart
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
            ) : (
              ""
            )}
          </div>
        </main>

        {modal && (
          <TechnicalInfo
            companyObj={companyObj}
            indexName={indexObj.value}
            onClose={() => {
              setModalOpen(false);
            }}
          />
        )}
      </div>
    </>
  );
};

export default CandleStickChart;
