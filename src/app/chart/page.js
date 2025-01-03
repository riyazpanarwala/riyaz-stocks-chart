"use client";
import React from "react";
import HeaderWithDropdowns from "../../components/selectDropdown";
import Tiles from "../../components/tiles";
import {
  intraArr,
  intervalArr,
  intervalArr1,
  periods,
} from "../../components/utils/data";
import useCommonHeader from "../../components/useCommonHeader";
import Echart from "../../components/Echart";

/*
{
"timestamp": "2024-11-22T00:00:00+05:30",
"open": 123.0,
"high": 128.0,
"low": 122.0,
"close": 127.0,
"volume": 41000
}
*/

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
      <div style={{ display: "flex" }}>
        <main className="mainChart">
          <div style={{ margin: "20px" }}>
            {intradayObj.value === "historical" && (
              <Tiles
                periods={periods}
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
