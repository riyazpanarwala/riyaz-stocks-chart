"use client";
import React from "react";
import HeaderWithDropdowns from "../../components/selectDropdown";
import Tiles from "../../components/tiles";
import {
  intraArr,
  intervalArr,
  intervalArr1,
  periodDays,
} from "../../components/utils/data";
import useCommonHeader from "../../components/useCommonHeader";
import Echart from "../../components/Echart";

const CandleStickChart = () => {
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
    timeData,
    period,
  } = useCommonHeader(true);

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
      <div className="app-layout">
        <main className="mainChart">
          <div className="chart-page-inner">
            {intradayObj.value === "historical" && (
              <Tiles
                periods={periodDays}
                selectedPeriod={period}
                setSelectedPeriod={handlePeriodChange}
              />
            )}
            <Echart
              timeData={timeData}
              candleData={candleData}
              companyObj={companyObj}
            />
          </div>
        </main>
      </div>
    </>
  );
};

export default CandleStickChart;
