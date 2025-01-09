import React, { useState, useEffect } from "react";
import AnnotateChart from "./AnnotateChart";
import { marubozu, hammer, morningstar } from "./Pattern";

const PatternChart = ({ patternName, data }) => {
  const [dataArr, setDataArr] = useState([]);

  const displayTooltip = (obj) => {
    if (obj.isVolume) {
      return `${patternName} - With Volume Confirm`;
    }
    return patternName;
  };

  useEffect(() => {
    if (patternName === "marubozu") {
      const { bullish, bearish } = marubozu(data);
      setDataArr([...bullish, ...bearish]);
    } else if (patternName === "hammer") {
      setDataArr(hammer(data));
    } else if (patternName === "morningstar") {
      setDataArr(morningstar(data));
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
    />
  );
};

export default PatternChart;
