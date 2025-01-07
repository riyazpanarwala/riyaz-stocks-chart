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

// const breakoutName = "volume";
// const breakoutName = "support";
const breakoutName = "";

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
  const [breakouts, setBreakouts] = useState([]);

  const detectBreakouts = (stockData, windowSize = 20) => {
    const resistance = [];
    const support = [];
    const breakoutsArr = [];

    for (let i = 0; i < stockData.length; i++) {
      if (i >= windowSize) {
        const windowData = stockData.slice(i - windowSize, i);
        const highs = windowData.map((d) => d.high);
        const lows = windowData.map((d) => d.low);
        const avgVolume =
          windowData.reduce((sum, d) => sum + d.volume, 0) / windowSize;

        resistance[i] = Math.max(...highs);
        support[i] = Math.min(...lows);

        const price = stockData[i].close;
        const volume = stockData[i].volume;

        if (price > resistance[i] && volume > avgVolume) {
          breakoutsArr.push({ ...stockData[i], bull: true });
        } else if (price < support[i] && volume > avgVolume) {
          breakoutsArr.push({ ...stockData[i], bear: true });
        }
      } else {
        resistance[i] = null;
        support[i] = null;
      }
    }

    setBreakouts(breakoutsArr);
  };

  // Function to detect volume breakout
  const detectVolumeBreakout = (data, period = 20, multiplier = 1.5) => {
    let breakoutsArr = [];
    // Assuming a simple breakout detection based on volume being 1.5 times the average of the past 10 days
    data.forEach((d, i) => {
      if (i < period) return d;
      const past10DaysVol =
        data.slice(i - period, i).reduce((acc, curr) => acc + curr.volume, 0) /
        period;

      if (d.volume > multiplier * past10DaysVol) {
        if (d.close > d.open) {
          breakoutsArr = [...breakoutsArr, { ...d, bull: true }];
        } else {
          breakoutsArr = [...breakoutsArr, { ...d, bear: true }];
        }
      }
    });
    setBreakouts(breakoutsArr);
  };

  // Function to calculate OBV
  const calculateOBV = (data) => {
    let obv = 0;
    return data.map((d, i) => {
      if (i === 0) {
        return { ...d, obv };
      }
      const prevClose = data[i - 1].close;
      if (d.close > prevClose) {
        obv += d.volume;
      } else if (d.close < prevClose) {
        obv -= d.volume;
      }
      return { ...d, obv };
    });
  };

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

      dataArr = calculateOBV(dataArr);

      if (breakoutName === "support") {
        detectBreakouts(dataArr);
      } else if (breakoutName === "volume") {
        detectVolumeBreakout(dataArr);
      }
    }

    setTimeData(timeArr);
    setCandleData(dataArr);
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

  const handlePeriodChange = (obj) => {
    setPeriod(obj);
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
    breakouts,
  };
};

export default useCommonHeader;
