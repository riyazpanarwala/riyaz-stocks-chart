import React, { useCallback, useEffect, useState, useRef } from "react";
import useParseCsv from "./utils/parseCsv";
import {
  intraArr,
  intervalArr,
  intervalArr1,
  periodDays,
  periodMinutes,
  periodHours,
  periodMax,
  indexArr,
  index1Arr,
  globalIndexArr,
} from "./utils/data";
import { getIntradayData } from "./getIntervalData";
import { isMarketOpen } from "./utils/indianstockmarket";
import { getCandleArr, fetchHistoricData } from "./common";
import { useShoonyaWebSocket } from "./OptionChainNew/hooks/useShoonyaWebSocket.js";
import { getShoonyaStreamKeyAction } from "../app/actions/shoonyaCandles.js";

const IST_OFFSET_MS = 5.5 * 3_600_000;

function formatIstDateTime(ms) {
  return new Date(ms + IST_OFFSET_MS).toISOString().slice(0, 19).replace("T", " ");
}

function parseCandleTimestampMs(dateStr) {
  if (!dateStr || typeof dateStr !== "string") return NaN;
  const iso = dateStr.includes("T") ? dateStr : dateStr.replace(" ", "T");
  return Date.parse(iso.endsWith("+05:30") || iso.endsWith("Z") ? iso : `${iso}+05:30`);
}

// ETF trades on NSE as an equity — reuse the NSE_EQ entry
const etfIndexArr = [{ label: "NSE ETF", value: "NSE_EQ" }];

const useCommonHeader = () => {
  const [period, setPeriod] = useState(periodDays[1]);
  const [intervalObj, setIntervalObj] = useState(intervalArr1[6]);
  const [intradayObj, setIntradayOrHistoric] = useState(intraArr[1]);
  const [indexObj, setIndex] = useState({});
  const [newIndexArr, setNewIndexArr] = useState([]);
  const [apiCall, setApiCall] = useState(0);
  const [candleData, setCandleData] = useState([]);
  const [dataSource, setDataSource] = useState("shoonya");
  const [wsTokenKey, setWsTokenKey] = useState(null);
  const { companyArr, companyObj, setCompany, isFO } = useParseCsv();
  const timerRef = useRef(null);
  const lastLoadedSymbolRef = useRef(null);

  const startTimer = () => {
    const isTrading = companyObj.global ? true : isMarketOpen();
    if (isTrading) {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setApiCall((prevState) => prevState + 1);
      }, 1000 * 30);
    }
  };

  const callHistoricApi = async () => {
    const interval = intervalObj.interval;
    const intervalVal = intervalObj.apiUnit;
    const indexName = indexObj.value;

    const { candles, source } = await fetchHistoricData(
      intervalVal,
      interval,
      indexName,
      period,
      companyObj,
      intervalObj.apiInterval
    );

    setCandleData(candles);
    if (source) setDataSource(source);
  };

  const callIntradayApi = async () => {
    let interval = intervalObj.apiUnit;

    const arr = await getIntradayData(
      interval,
      companyObj.value,
      indexObj.value,
      intervalObj.apiInterval
    );

    const { dataArr } = getCandleArr(arr);
    setCandleData(dataArr);
    if (arr?.source) setDataSource(arr.source);
  };

  const setPeriodOnIntervalChange = useCallback((obj) => {
    if (obj.apiUnit === "minutes") {
      setPeriod(periodMinutes[0]);
    } else if (obj.apiUnit === "hours") {
      setPeriod(periodHours[0]);
    } else if (obj.apiUnit === "days") {
      setPeriod(periodDays[1]);
    } else {
      setPeriod(periodMax[0]);
    }
  }, []);

  const handleIntervalChange = useCallback(
    (obj) => {
      setIntervalObj((prev) => {
        if (prev.apiUnit !== obj.apiUnit) {
          setPeriodOnIntervalChange(obj);
        }
        return obj;
      });
    },
    [setPeriodOnIntervalChange],
  );

  /**
   * Determine which index tabs to show based on the selected company's flags.
   * ETFs are listed on NSE as equities, so we show a single "NSE ETF" entry.
   */
  const setIndexes = useCallback(({
    nse,
    bse,
    nseIndex,
    bseIndex,
    etf,
    global,
    globalSegment,
  }) => {
    if (etf) {
      setNewIndexArr(etfIndexArr);
      setIndex(etfIndexArr[0]);
    } else if (global) {
      const globalIndex = { ...globalIndexArr[0], value: globalSegment };
      setNewIndexArr([globalIndex]);
      setIndex(globalIndex);
    } else if (nse && bse) {
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
  }, []);

  useEffect(() => {
    if (companyObj?.label) {
      setIndexes(companyObj);
    }
  }, [companyObj, setIndexes]);

  const handleCompanyChange = useCallback(
    (nextCompanyObj) => {
      setIndexes(nextCompanyObj);
      setCompany(nextCompanyObj);
    },
    [setIndexes, setCompany],
  );

  const handleIndexChange = useCallback((obj) => {
    setIndex(obj);
  }, []);

  const isIntraday = (value) => {
    return value === "intraday";
  };

  const setIntervalData = useCallback(({ value }) => {
    if (isIntraday(value)) {
      setIntervalObj(intervalArr[0]);
    } else {
      setIntervalObj(intervalArr1[6]);
      setPeriod(periodDays[1]);
    }
  }, []);

  const handleIntradayChange = useCallback(
    (obj) => {
      setIntervalData(obj);
      setIntradayOrHistoric(obj);
    },
    [setIntervalData],
  );

  useEffect(() => {
    if (!intervalObj.value) {
      setIntervalData(intradayObj);
    }
  }, [intradayObj]);

  const handlePeriodChange = (obj) => {
    setPeriod(obj);
  };

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (apiCall > 0) {
      const currentSymbol = companyObj?.value || companyObj?.symbol;
      if (lastLoadedSymbolRef.current !== currentSymbol) {
        setCandleData([]);
        lastLoadedSymbolRef.current = currentSymbol;
      }
      if (isIntraday(intradayObj.value)) {
        callIntradayApi();
      } else {
        callHistoricApi();
      }
      startTimer();
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
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

  // Resolve Shoonya WebSocket token key for the active symbol
  useEffect(() => {
    let cancelled = false;
    if (!companyObj?.value || !indexObj?.value || companyObj?.global) {
      setWsTokenKey(null);
      return;
    }

    const instrumentKey = `${indexObj.value}|${companyObj.value}`;
    getShoonyaStreamKeyAction(instrumentKey)
      .then((res) => {
        if (!cancelled) {
          setWsTokenKey(res?.tokenKey || null);
        }
      })
      .catch(() => {
        if (!cancelled) setWsTokenKey(null);
      });

    return () => {
      cancelled = true;
    };
  }, [companyObj?.value, companyObj?.global, indexObj?.value]);

  const handleLiveTick = useCallback(
    (tick) => {
      const ltp = Number(tick?.ltp);
      if (!Number.isFinite(ltp) || ltp <= 0) return;

      const tickTimeMs = Number.isFinite(Number(tick?.time)) ? Number(tick.time) : Date.now();
      const apiUnit = intervalObj?.apiUnit;
      const apiInterval = Math.max(1, Number(intervalObj?.apiInterval) || 1);

      setCandleData((prev) => {
        if (!Array.isArray(prev) || prev.length === 0) return prev;
        const last = prev[prev.length - 1];
        if (!last) return prev;

        if (apiUnit === "minutes" || apiUnit === "hours") {
          const intervalMs = apiUnit === "hours" ? apiInterval * 3_600_000 : apiInterval * 60_000;
          const lastTs = parseCandleTimestampMs(last.date);

          if (Number.isFinite(lastTs) && tickTimeMs >= lastTs && tickTimeMs < lastTs + intervalMs) {
            const nextHigh = Math.max(Number(last.high) || ltp, ltp);
            const nextLow = Math.min(Number(last.low) || ltp, ltp);
            if (last.close === ltp && last.high === nextHigh && last.low === nextLow) return prev;
            const updated = [...prev];
            updated[updated.length - 1] = { ...last, high: nextHigh, low: nextLow, close: ltp };
            return updated;
          }

          if (!Number.isFinite(lastTs) || tickTimeMs >= lastTs + intervalMs) {
            const bucketStartMs = Number.isFinite(lastTs)
              ? lastTs + Math.floor((tickTimeMs - lastTs) / intervalMs) * intervalMs
              : Math.floor(tickTimeMs / intervalMs) * intervalMs;
            return [
              ...prev,
              {
                date: formatIstDateTime(bucketStartMs),
                open: ltp,
                high: ltp,
                low: ltp,
                close: ltp,
                volume: 0,
                dividend: null,
                split: null,
                dividends: null,
                splits: null,
              },
            ];
          }
          return prev;
        }

        // Daily / Weekly / Monthly: update latest candle's high, low, close
        const nextHigh = Math.max(Number(last.high) || ltp, ltp);
        const nextLow = Math.min(Number(last.low) || ltp, ltp);
        if (last.close === ltp && last.high === nextHigh && last.low === nextLow) return prev;
        const updated = [...prev];
        updated[updated.length - 1] = { ...last, high: nextHigh, low: nextLow, close: ltp };
        return updated;
      });
    },
    [intervalObj?.apiUnit, intervalObj?.apiInterval],
  );

  const { status: wsStatus } = useShoonyaWebSocket({
    enabled: Boolean(wsTokenKey && isMarketOpen()),
    tokenKeys: wsTokenKey,
    onTick: handleLiveTick,
  });

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
    dataSource,
    wsStatus,
    period,
    isFO,
  };
};

export default useCommonHeader;
