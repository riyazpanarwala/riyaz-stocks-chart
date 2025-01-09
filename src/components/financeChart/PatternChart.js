import React, { useState, useEffect } from "react";
import {
  Annotate,
  SvgPathAnnotation,
  ToolTipTSpanLabel,
  ToolTipText,
} from "react-financial-charts";
import { marubozu } from "./Pattern";

const PatternChart = ({ patternName, data }) => {
  const [dataArr, setDataArr] = useState([]);

  useEffect(() => {
    if (patternName === "marubozu") {
      const { bullish, bearish } = marubozu([...data]);
      setDataArr([...bullish, ...bearish]);
    } else {
      setDataArr([]);
    }
  }, [patternName, data]);

  const patternPath = (pattern) => {
    return {
      fill: pattern.bull ? "Green" : "red",
      path: () =>
        "M12,11.5A2.5,2.5 0 0,1 9.5,9A2.5,2.5 0 0,1 12,6.5A2.5,2.5 0 0,1 14.5,9A2.5,2.5 0 0,1 12,11.5M12,2A7,7 0 0,0 5,9C5,14.25 12,22 12,22C12,22 19,14.25 19,9A7,7 0 0,0 12,2Z",
      pathWidth: 12,
      pathHeight: 12,
      tooltip: `${pattern.date}`,
      y: ({ yScale, datum }) => yScale(datum.close),
    };
  };

  if (!dataArr.length) {
    return (
      <g
        className={"react-financial-charts-tooltip"}
        transform={`translate(8, 32)`}
      >
        <ToolTipText x={0} y={0}>
          <ToolTipTSpanLabel>{patternName}: </ToolTipTSpanLabel>
          <tspan>No Candles found</tspan>
        </ToolTipText>
      </g>
    );
  }

  return dataArr.map((pattern) => {
    return (
      <Annotate
        key={pattern.date}
        with={SvgPathAnnotation}
        when={(d) => d.date === pattern.date}
        usingProps={patternPath(pattern)}
      />
    );
  });
};

export default PatternChart;
