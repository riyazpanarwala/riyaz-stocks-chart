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
import {
  getHistoricData,
  getIntradayData,
  getHistoricDataNSE,
  getMarketTimings,
  getNSEDataYahooFinance,
  // getNSEData,
} from "./getIntervalData";
import isTradingActive from "./utils/isTradingActive";
import _ from "lodash";

const isYahooFinanceEnable = false;

const useCommonHeader = (isEchart) => {
  const [period, setPeriod] = useState(periods[1]);
  const [intervalObj, setInterval] = useState([]);
  const [intradayObj, setIntradayOrHistoric] = useState(intraArr[1]);
  const [indexObj, setIndex] = useState({});
  const [newIndexArr, setNewIndexArr] = useState([]);
  const [apiCall, setApiCall] = useState(0);
  const [candleData, setCandleData] = useState([]);
  const [timeData, setTimeData] = useState([]);
  const [marketTimings, setMartketTimings] = useState([]);
  const { companyArr, companyObj, setCompany } = useParseCsv();
  let countdownInterval;

  const isMarketOpen = (exchangeName = "NSE") => {
    const indexData = marketTimings.filter((v) => v.exchange === exchangeName);
    return indexData.length;
    /*
    const indexStartTime = new Date(indexData[0].start_time);
    const indexEndTime = new Date(indexData[0].end_time);
    const currentime = new Date().getTime();
    return indexEndTime >= currentime && indexStartTime <= currentime;
    */
  };

  const getDataFromIntraday = (intradayData) => {
    const total = intradayData.reduce((sum, candle) => sum + candle[5], 0);

    const maxValue = Math.max.apply(
      Math,
      intradayData.map((d) => d[2])
    );
    const minValue = Math.min.apply(
      Math,
      intradayData.map((d) => d[3])
    );

    return {
      date: intradayData[0][0],
      open: intradayData[0][1],
      close: intradayData[intradayData.length - 1][4],
      high: maxValue,
      low: minValue,
      volume: total,
    };
  };

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

  const setCandleArr = async (arr, isIntradayCall) => {
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

      if (isIntradayCall) {
        if (isMarketOpen()) {
          const arr1 = await getIntradayData(
            "1minute",
            companyObj.value,
            indexObj.value
          );
          let candleData = arr1.data.candles?.reverse();
          dataArr = [...dataArr, getDataFromIntraday(candleData)];
        }
      }
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

  const callHistoricApi = async (isCallNSE) => {
    if (
      isCallNSE &&
      intervalObj.value === "day" &&
      (indexObj.value === "NSE_EQ" || indexObj.value === "NSE_INDEX")
    ) {
      let apiName = "historic";
      if (companyObj.nseIndex) {
        apiName = "indexHistoric";
      }
      const { candles } = await getHistoricDataNSE(
        companyObj.symbol,
        period,
        apiName
      );
      setCandleData(candles);

      // getNSEData("F&O", "NIFTY");
      // getNSEData("corporateInfo", companyObj.symbol);
      // getNSEData("details", companyObj.symbol);
      // getNSEData("tradeInfo", companyObj.symbol);
    } else {
      if (
        isYahooFinanceEnable &&
        (companyObj.yahooSymbol || indexObj.value === "NSE_EQ")
      ) {
        const arr = await getNSEDataYahooFinance(
          companyObj.yahooSymbol || companyObj.symbol + ".NS",
          intervalObj.interval,
          period
        );
        setCandleData(arr);
      } else {
        const arr = await getHistoricData(
          intervalObj.value,
          companyObj.value,
          indexObj.value,
          period
        );
        setCandleArr(arr, intervalObj.value === "day");
      }
    }
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
      setCandleArr(arr);
    }
    startTimer();
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

  const setMarketTimings = async () => {
    const response = await getMarketTimings();
    setMartketTimings(response.data);
  };

  useEffect(() => {
    setMarketTimings();
  }, []);

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
    isMarketOpen,
  };
};

export default useCommonHeader;
