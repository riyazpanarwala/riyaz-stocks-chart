import React, { useState, useEffect } from "react";
import AnnotateChart from "./AnnotateChart";
import { marubozu, hammer } from "./Pattern";

const PatternChart = ({ patternName, data }) => {
  const [dataArr, setDataArr] = useState([]);

  useEffect(() => {
    if (patternName === "marubozu") {
      const { bullish, bearish } = marubozu(data);
      setDataArr([...bullish, ...bearish]);
    } else if (patternName === "hammer") {
      setDataArr(hammer(data));
    } else {
      setDataArr([]);
    }
  }, [patternName, data]);

  return (
    <AnnotateChart
      dataArr={dataArr}
      tooltipName={patternName}
      tooltipTxt="No Candles found"
      tooltipCallback={(patternObj) => `${patternObj.date}`}
    />
  );
};

export default PatternChart;
