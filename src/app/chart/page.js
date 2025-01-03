"use client";
import React, { useEffect, useState } from "react";
import ReactECharts from "echarts-for-react";
import HeaderWithDropdowns from "../../components/selectDropdown";
import {
  getHistoricData,
  getIntradayData,
} from "../../components/getIntervalData";
import Tiles from "../../components/tiles";
import useParseCsv from "../../components/utils/parseCsv";
import {
  intraArr,
  intervalArr,
  intervalArr1,
  periods,
  indexArr,
} from "../../components/utils/data";

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
  const [period, setPeriod] = useState(periods[0]);
  const [intervalObj, setInterval] = useState(intervalArr[0]);
  const [intradayObj, setIntradayOrHistoric] = useState(intraArr[0]);
  const [indexObj, setIndex] = useState(indexArr[0]);
  const [newIndexArr, setNewIndexArr] = useState(indexArr);
  const [apiCall, setApiCall] = useState(0);
  const [candleData, setCandleData] = useState([]);
  const [timeData, setTimeData] = useState([]);
  const { companyArr, companyObj, setCompany } = useParseCsv();

  const getOptions = () => {
    return {
      title: {
        text: getCompanyName(),
        left: "center",
      },
      tooltip: {
        trigger: "axis",
        axisPointer: {
          type: "cross",
        },
      },
      xAxis: {
        type: "category",
        data: timeData, // Dates for the x-axis
        boundaryGap: true,
      },
      yAxis: {
        type: "value",
        scale: true,
        splitArea: {
          show: true,
        },
      },
      series: [
        {
          type: "candlestick",
          data: candleData, // Candlestick data: [Open, Close, Low, High]
          itemStyle: {
            color: "#00ff00", // Upward color
            color0: "#ff0000", // Downward color
            borderColor: "#00ff00",
            borderColor0: "#ff0000",
          },
        },
      ],
    };
  };

  const setCandleArr = (arr) => {
    let timeArr = [];
    let dataArr = [];
    let candles = arr.data.candles?.reverse();

    candles?.forEach((item, i) => {
      dataArr = [...dataArr, [item[1], item[4], item[3], item[2]]];
      timeArr = [...timeArr, item[0]];
    });

    setTimeData(timeArr);
    setCandleData(dataArr);
  };

  const getCompanyName = () => {
    return companyObj?.label;
  };

  const callHistoricApi = async () => {
    const arr = await getHistoricData(
      intervalObj.value,
      companyObj.value,
      indexObj.value,
      period
    );
    setCandleArr(arr);
  };

  const callIntradayApi = async () => {
    const arr = await getIntradayData(
      intervalObj.value,
      companyObj.value,
      indexObj.value
    );
    setCandleArr(arr);
  };

  const handleIntervalChange = (obj) => {
    setInterval(obj);
  };

  const handleCompanyChange = (companyObj) => {
    if (companyObj.nse && companyObj.bse) {
      setNewIndexArr(indexArr);
      setIndex(indexArr[0]);
    } else if (companyObj.nse) {
      setNewIndexArr([indexArr[0]]);
      setIndex(indexArr[0]);
    } else if (companyObj.bse) {
      setNewIndexArr([indexArr[1]]);
      setIndex(indexArr[1]);
    }
    setCompany(companyObj);
  };

  const handleIndexChange = (obj) => {
    setIndex(obj);
  };

  const handleIntradayChange = (obj) => {
    const val = obj.value;
    if (val === "intraday") {
      setInterval(intervalArr[0]);
    } else {
      setInterval(intervalArr1[0]);
    }
    setIntradayOrHistoric(obj);
  };

  useEffect(() => {
    if (
      intervalObj.value &&
      intradayObj.value &&
      companyObj.value &&
      indexObj.value &&
      apiCall > 0
    ) {
      setCandleData([]);
      if (intradayObj.value === "intraday") {
        callIntradayApi();
      } else {
        callHistoricApi();
      }
    }
  }, [apiCall]);

  useEffect(() => {
    setApiCall((prevState) => prevState + 1);
  }, [intervalObj, intradayObj, companyObj, period, indexObj]);

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
                setSelectedPeriod={(val) => {
                  setPeriod(val);
                }}
              />
            )}
            <ReactECharts
              option={getOptions()}
              style={{ height: 400, width: "100%" }}
            />
          </div>
        </main>
      </div>
    </>
  );
};

export default CandleStickChart;
