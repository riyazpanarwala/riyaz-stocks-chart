import React, { useEffect, useState } from "react";
import useParseCsv from "./utils/parseCsv";
import {
  intraArr,
  intervalArr,
  intervalArr1,
  periods,
  indexArr,
} from "./utils/data";
import { getHistoricData, getIntradayData } from "./getIntervalData";
import isTradingActive from "./utils/isTradingActive";

const useCommonHeader = (isEchart) => {
  const [period, setPeriod] = useState(periods[0]);
  const [intervalObj, setInterval] = useState(intervalArr1[0]);
  const [intradayObj, setIntradayOrHistoric] = useState(intraArr[1]);
  const [indexObj, setIndex] = useState(indexArr[0]);
  const [newIndexArr, setNewIndexArr] = useState(indexArr);
  const [apiCall, setApiCall] = useState(0);
  const [candleData, setCandleData] = useState([]);
  const [timeData, setTimeData] = useState([]);
  const { companyArr, companyObj, setCompany } = useParseCsv();
  let countdownInterval;

  const setCandleArr = (arr) => {
    let timeArr = [];
    let dataArr = [];
    let candles = arr.data.candles?.reverse();

    if (isEchart) {
      candles?.forEach((item) => {
        dataArr = [...dataArr, [item[1], item[4], item[3], item[2]]];
        timeArr = [...timeArr, item[0]];
      });
    } else {
      candles?.forEach((item, i) => {
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
    }

    setTimeData(timeArr);
    setCandleData(dataArr);
  };

  const startTimer = () => {
    if (isTradingActive()) {
      clearTimeout(countdownInterval);
      countdownInterval = setTimeout(() => {
        setApiCall((prevState) => prevState + 1);
      }, 1000 * 60);
    }
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
    startTimer();
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

  const handlePeriodChange = (obj) => {
    setPeriod(obj);
  };

  useEffect(() => {
    clearTimeout(countdownInterval);
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
    // Cleanup function to clear the interval when the component unmounts
    return () => clearTimeout(countdownInterval);
  }, [apiCall]);

  useEffect(() => {
    setApiCall((prevState) => prevState + 1);
  }, [intervalObj, intradayObj, companyObj, period, indexObj]);

  return {
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
  };
};

export default useCommonHeader;
