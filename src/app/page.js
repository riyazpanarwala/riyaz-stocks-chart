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

const CandleStickChart = () => {
  const [trendLineEnable, setTrendLineEnable] = useState(false);
  const [measurementEnable, setMeasurementEnable] = useState(false);
  const [textEnable, setTextEnable] = useState(false);
  const [indicatorName, setIndicatorName] = useState("");
  const [positionName, setPositionName] = useState("");
  const [shapeName, setShapeName] = useState("");
  const [isAngleEnabled, setAngleEnabled] = useState(false);
  const [breakoutName, setBreakoutName] = useState("");
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
  };

  const getCompanyName = () => {
    return companyObj?.label;
  };

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
        />
        <main className="mainChart">
          <div>
            <div style={{ display: "flex" }}>
              {intradayObj.value === "historical" && (
                <Tiles
                  periods={periods}
                  selectedPeriod={period}
                  setSelectedPeriod={handlePeriodChange}
                />
              )}
              <div className="inlineDiv">
                <h1>{getCompanyName()}</h1>
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
                />
              </div>
            ) : (
              ""
            )}
          </div>
        </main>
      </div>
    </>
  );
};

export default CandleStickChart;
