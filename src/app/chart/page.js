"use client";
import React, { useEffect, useState } from "react";
import ReactECharts from "echarts-for-react";
import HeaderWithDropdowns from "../../components/selectDropdown";
import {
  getHistoricData,
  getIntradayData,
} from "../../components/getIntervalData";
import companyArr from "../../components/utils/companyArr";
import Tiles from "../../components/tiles";

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
  const [period, setPeriod] = useState("1m");
  const [companyName, setCompany] = useState(companyArr[0].value);
  const [interval, setInterval] = useState("1minute");
  const [intradayOrHistoric, setIntradayOrHistoric] = useState("intraday");
  const [apiCall, setApiCall] = useState(0);
  const [candleData, setCandleData] = useState([]);
  const [timeData, setTimeData] = useState([]);

  const getOptions = () => {
    const index = companyArr.findIndex((v) => v.value === companyName);
    return {
      title: {
        text: index !== -1 ? companyArr[index].name : "",
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
    let candles = arr.data.candles.reverse();
    candles.forEach((item, i) => {
      dataArr = [...dataArr, [item[1], item[4], item[3], item[2]]];
      timeArr = [...timeArr, item[0]];
    });

    setTimeData(timeArr);
    setCandleData(dataArr);
  };

  const isBSE = () => {
    const index = companyArr.findIndex((v) => v.value === companyName);
    return index !== -1 ? companyArr[index].isBSE : false;
  };

  const callHistoricApi = () => {
    getHistoricData(setCandleArr, interval, companyName, isBSE(), period);
  };

  const callIntradayApi = () => {
    getIntradayData(setCandleArr, interval, companyName, isBSE());
  };

  const handleIntervalChange = (e) => {
    setInterval(e.target.value);
  };

  const handleCompanyChange = (e) => {
    setCompany(e.target.value);
  };

  const handleIntradayChange = (e) => {
    const val = e.target.value;
    if (val === "intraday") {
      setInterval("1minute");
    } else {
      setInterval("30minute");
    }
    setIntradayOrHistoric(val);
  };

  /*
  const nseData = () => {
    fetch("/api/allIndex?symbol=JPP&interval=5minute", {
      method: "GET",
    })
      .then((res) => {
        return res.json();
      })
      .then((data) => {
        console.log(data);
      });
  };
  */

  useEffect(() => {
    if (interval && intradayOrHistoric && apiCall > 0) {
      if (intradayOrHistoric === "intraday") {
        callIntradayApi();
      } else {
        callHistoricApi();
      }
      // nseData();
    }
  }, [apiCall]);

  useEffect(() => {
    setApiCall((prevState) => prevState + 1);
  }, [interval, intradayOrHistoric, companyName, period]);

  return (
    <div>
      <HeaderWithDropdowns
        interval={interval}
        intradayOrHistoric={intradayOrHistoric}
        companyName={companyName}
        handleIntervalChange={handleIntervalChange}
        handleIntradayChange={handleIntradayChange}
        handleCompanyChange={handleCompanyChange}
      />
      <div style={{ margin: "20px" }}>
        {intradayOrHistoric === "historical" && (
          <Tiles
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
    </div>
  );
};

export default CandleStickChart;
