"use client";
import React, { useEffect, useState } from "react";
import HeaderWithDropdowns from "../components/selectDropdown";
import {
  getHistoricData,
  getIntradayData,
} from "../components/getIntervalData";
import Tiles from "../components/tiles";
import FinanceChart from "../components/financeChart";
import useParseCsv from "../components/utils/parseCsv";

const intraArr = [
  { label: "Intraday", value: "intraday" },
  { label: "historical", value: "historical" },
];

const intervalArr = [
  { label: "1 Minute", value: "1minute" },
  { label: "30 Minute", value: "30minute" },
];

const intervalArr1 = [
  { label: "30 Minute", value: "30minute" },
  { label: "Daily", value: "day" },
  { label: "Weekly", value: "week" },
  { label: "Monthly", value: "month" },
];

const CandleStickChart = () => {
  const [period, setPeriod] = useState("1m");
  const [intervalObj, setInterval] = useState(intervalArr[0]);
  const [intradayObj, setIntradayOrHistoric] = useState(intraArr[0]);
  const [apiCall, setApiCall] = useState(0);
  const [candleData, setCandleData] = useState([]);
  const { companyArr, companyObj, setCompany } = useParseCsv();

  const setCandleArr = (arr) => {
    let dataArr = [];
    let candles = arr.data.candles.reverse();

    candles.forEach((item, i) => {
      const aa = item[0].split("T");
      const hhmmss = aa[1].split("+")[0];
      dataArr = [
        ...dataArr,
        {
          date: `${aa[0]} ${hhmmss}`,
          open: item[1],
          high: item[2],
          low: item[3],
          close: item[4],
          volume: item[5],
        },
      ];
    });

    setCandleData(dataArr);
  };

  const getCompanyName = () => {
    return companyObj?.label;
  };

  const isBSE = () => {
    return companyObj?.isBSE;
  };

  const callHistoricApi = () => {
    getHistoricData(
      setCandleArr,
      intervalObj.value,
      companyObj.value,
      isBSE(),
      period
    );
  };

  const callIntradayApi = () => {
    getIntradayData(setCandleArr, intervalObj.value, companyObj.value, isBSE());
  };

  const handleIntervalChange = (obj) => {
    setInterval(obj);
  };

  const handleCompanyChange = (companyObj) => {
    setCompany(companyObj);
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
  }, [intervalObj, intradayObj, companyObj, period]);

  if (!companyArr.length) {
    return "please wait";
  }

  return (
    <div>
      <HeaderWithDropdowns
        intervalObj={intervalObj}
        intradayObj={intradayObj}
        companyObj={companyObj}
        handleIntervalChange={handleIntervalChange}
        handleIntradayChange={handleIntradayChange}
        handleCompanyChange={handleCompanyChange}
        companyArr={companyArr}
        intraArr={intraArr}
        intervalArr={
          intradayObj.value === "intraday" ? intervalArr : intervalArr1
        }
      />
      <div style={{ margin: "20px" }}>
        {intradayObj.value === "historical" && (
          <Tiles
            selectedPeriod={period}
            setSelectedPeriod={(val) => {
              setPeriod(val);
            }}
          />
        )}
        <h1>{getCompanyName()}</h1>
        <FinanceChart initialData={candleData} />
      </div>
    </div>
  );
};

export default CandleStickChart;
