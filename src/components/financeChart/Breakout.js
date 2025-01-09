import React, { useState, useEffect } from "react";
import AnnotateChart from "./AnnotateChart";
import { volumeBreakout, supportResistanceBreakout } from "./indicator";

const Breakout = ({ patternName, data }) => {
  const [dataArr, setDataArr] = useState([]);

  useEffect(() => {
    if (patternName === "support") {
      setDataArr(supportResistanceBreakout(data));
    } else if (patternName === "volume") {
      setDataArr(volumeBreakout(data));
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
    />
  );
};

export default Breakout;
