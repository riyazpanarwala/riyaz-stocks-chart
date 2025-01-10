import React, { useState, useEffect } from "react";
import AnnotateChart from "./AnnotateChart";
import { marubozu, hammer, morningstar, multibagger } from "./Pattern";

const PatternChart = ({ patternName, data, isIntraday }) => {
  const [dataArr, setDataArr] = useState([]);

  const displayTooltip = (obj) => {
    const dateStr = obj.date.split(" ")[0];
    if (obj.isVolume) {
      return `${patternName} - With Volume Confirm ${dateStr}`;
    }
    return `${patternName} - ${dateStr}`;
  };

  useEffect(() => {
    if (patternName === "marubozu") {
      const { bullish, bearish } = marubozu(data);
      setDataArr([...bullish, ...bearish]);
    } else if (patternName === "hammer") {
      setDataArr(hammer(data));
    } else if (patternName === "morningstar") {
      setDataArr(morningstar(data));
    } else if (patternName === "multibagger") {
      setDataArr(multibagger(data));
    } else {
      setDataArr([]);
    }
  }, [patternName, data]);

  return (
    <AnnotateChart
      dataArr={dataArr}
      tooltipName={patternName}
      tooltipTxt="No Candles found"
      tooltipCallback={displayTooltip}
      origin={isIntraday ? [8, 48] : [8, 32]}
    />
  );
};

export default PatternChart;
