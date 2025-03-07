import React, { useEffect, useState } from "react";
import useParseCsv from "./utils/parseCsv";
import {
  intraArr,
  intervalArr,
  intervalArr1,
  periods,
  indexArr,
  index1Arr,
} from "./utils/data";
import { getIntradayData } from "./getIntervalData";
// import isTradingActive from "./utils/isTradingActive";
import { isMarketOpen } from "./utils/indianstockmarket";
import { getDataFromIntraday, getCandleArr, fetchHistoricData } from "./common";
import _ from "lodash";

const useCommonHeader = (isEchart) => {
  const [period, setPeriod] = useState(periods[1]);
  const [intervalObj, setInterval] = useState([]);
  const [intradayObj, setIntradayOrHistoric] = useState(intraArr[1]);
  const [indexObj, setIndex] = useState({});
  const [newIndexArr, setNewIndexArr] = useState([]);
  const [apiCall, setApiCall] = useState(0);
  const [candleData, setCandleData] = useState([]);
  const [timeData, setTimeData] = useState([]);
  const { companyArr, companyObj, setCompany } = useParseCsv();
  let countdownInterval;

  const setCandleArrOtherTimeframes = (arr, chunkSize) => {
    let candleData = arr.data.candles?.reverse();

    // Use _.chunk() to split the array into chunks of size
    let chunks = _.chunk(candleData, chunkSize);
    let candleArr = [];
    chunks.forEach((v) => {
      candleArr = [...candleArr, getDataFromIntraday(v)];
    });

    setCandleData(candleArr);
  };

  const startTimer = () => {
    if (isMarketOpen()) {
      clearTimeout(countdownInterval);
      countdownInterval = setTimeout(() => {
        setApiCall((prevState) => prevState + 1);
      }, 1000 * 30);
    }
  };

  const callHistoricApi = async () => {
    const interval = intervalObj.interval;
    const intervalVal = intervalObj.value;
    const indexName = indexObj.value;

    const { candles, timeArr } = await fetchHistoricData(
      isEchart,
      intervalVal,
      interval,
      indexName,
      period,
      companyObj
    );

    setTimeData(timeArr);
    setCandleData(candles);
  };

  const callIntradayApi = async () => {
    let interval = intervalObj.value;
    if (intervalObj.val) {
      interval = "1minute";
    }
    const arr = await getIntradayData(
      interval,
      companyObj.value,
      indexObj.value
    );

    if (intervalObj.val) {
      setCandleArrOtherTimeframes(arr, intervalObj.val);
    } else {
      const { dataArr, timeArr } = getCandleArr(arr, isEchart);
      setTimeData(timeArr);
      setCandleData(dataArr);
    }
  };

  const handleIntervalChange = (obj) => {
    setInterval(obj);
  };

  const setIndexes = ({ nse, bse, nseIndex, bseIndex }) => {
    if (nse && bse) {
      setNewIndexArr(indexArr);
      setIndex(indexArr[0]);
    } else if (nse) {
      setNewIndexArr([indexArr[0]]);
      setIndex(indexArr[0]);
    } else if (bse) {
      setNewIndexArr([indexArr[1]]);
      setIndex(indexArr[1]);
    } else if (nseIndex) {
      setNewIndexArr([index1Arr[0]]);
      setIndex(index1Arr[0]);
    } else if (bseIndex) {
      setNewIndexArr([index1Arr[1]]);
      setIndex(index1Arr[1]);
    }
  };

  useEffect(() => {
    if (!indexObj.value && companyObj.label) {
      setIndexes(companyObj);
    }
  }, [companyObj]);

  const handleCompanyChange = (companyObj) => {
    setIndexes(companyObj);
    setCompany(companyObj);
  };

  const handleIndexChange = (obj) => {
    setIndex(obj);
  };

  const isIntraday = (value) => {
    return value === "intraday";
  };

  const setIntervalData = ({ value }) => {
    if (isIntraday(value)) {
      setInterval(intervalArr[0]);
    } else {
      setInterval(intervalArr1[0]);
    }
  };

  const handleIntradayChange = (obj) => {
    setIntervalData(obj);
    setIntradayOrHistoric(obj);
  };

  useEffect(() => {
    if (!intervalObj.value) {
      setIntervalData(intradayObj);
    }
  }, [intradayObj]);

  const handlePeriodChange = (obj) => {
    setPeriod(obj);
  };

  useEffect(() => {
    clearTimeout(countdownInterval);
    if (apiCall > 0) {
      setCandleData([]);
      if (isIntraday(intradayObj.value)) {
        callIntradayApi();
      } else {
        callHistoricApi();
      }
      startTimer();
    }
    // Cleanup function to clear the interval when the component unmounts
    return () => clearTimeout(countdownInterval);
  }, [apiCall]);

  useEffect(() => {
    if (
      intervalObj.value &&
      intradayObj.value &&
      companyObj.value &&
      indexObj.value
    ) {
      setApiCall((prevState) => prevState + 1);
    }
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
