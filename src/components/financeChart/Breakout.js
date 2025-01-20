import React, { useState, useEffect } from "react";
import AnnotateChart from "./AnnotateChart";
import {
  volumeBreakout,
  supportResistanceBreakout,
  calculateBuySellBreakouts,
} from "./indicator";

const Breakout = ({ patternName, data, isIntraday }) => {
  const [dataArr, setDataArr] = useState([]);

  useEffect(() => {
    if (patternName === "support") {
      setDataArr(supportResistanceBreakout(data));
    } else if (patternName === "volume") {
      setDataArr(volumeBreakout(data));
    } else if (patternName === "buysell") {
      setDataArr(calculateBuySellBreakouts(data));
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
