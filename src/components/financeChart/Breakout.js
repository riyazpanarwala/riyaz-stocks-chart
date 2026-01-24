import React, { useState, useEffect } from "react";
import AnnotateChart from "./AnnotateChart";
import {
  volumeBreakout,
  supportResistanceBreakout,
  calculateBuySellBreakouts,
} from "./indicator";
import { calculateChandelierExit } from "../Chandelier/CEanalysis";

const Breakout = ({ patternName, data, isIntraday }) => {
  const [dataArr, setDataArr] = useState([]);

  useEffect(() => {
    if (patternName === "support") {
      setDataArr(supportResistanceBreakout(data));
    } else if (patternName === "volume") {
      setDataArr(volumeBreakout(data));
    } else if (patternName === "buysell") {
      const { breakoutsArr } = calculateBuySellBreakouts(data);
      setDataArr(breakoutsArr);
    } else if (patternName === "CE") {
      const ceData = calculateChandelierExit(
        data,
        22, // lookback
        3 // ATR multiplier
      );
      // Latest CE value
      const last = ceData[ceData.length - 1];
      console.log(
        "CE:",
        last.ce,
        "Trend:",
        last.trend,
        "Signal:",
        last.signal,
        "at",
        last.date
      );
      setDataArr(ceData.filter((item) => item.signal !== null));
    } else {
      setDataArr([]);
    }
  }, [patternName, data]);

  return (
    <AnnotateChart
      dataArr={dataArr}
      tooltipName={patternName}
      tooltipTxt="No Breakouts detected"
      tooltipCallback={(patternObj) =>
        `(${patternObj.close}) ${patternObj.date}`
      }
      origin={isIntraday ? [8, 48] : [8, 32]}
    />
  );
};

export default Breakout;
