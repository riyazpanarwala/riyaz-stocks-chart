import React from "react";
import { Annotate, SvgPathAnnotation } from "@riyazpanarwala/annotations";
import { ToolTipTSpanLabel, ToolTipText } from "@riyazpanarwala/tooltip";
import DARK from "./colorscheme.js";

const AnnotateChart = ({
  dataArr,
  tooltipName,
  tooltipTxt,
  tooltipCallback,
  origin: [x, y],
}) => {
  const getColor = (patternObj) => {
    if (patternObj.bull) return DARK.annotBull;
    if (patternObj.bear) return DARK.annotBear;
    return patternObj.isVolume ? DARK.annotVolume : DARK.annotDefault;
  };

  const anotateFunc = (patternObj) => {
    return {
      fill: getColor(patternObj),
      path: () =>
        "M12,11.5A2.5,2.5 0 0,1 9.5,9A2.5,2.5 0 0,1 12,6.5A2.5,2.5 0 0,1 14.5,9A2.5,2.5 0 0,1 12,11.5M12,2A7,7 0 0,0 5,9C5,14.25 12,22 12,22C12,22 19,14.25 19,9A7,7 0 0,0 12,2Z",
      pathWidth: 12,
      pathHeight: 12,
      tooltip: tooltipCallback(patternObj),
      y: ({ yScale, datum }) => yScale(datum.close),
    };
  };

  if (!dataArr.length) {
    return (
      <g
        className={"react-financial-charts-tooltip"}
        transform={`translate(${x}, ${y})`}
      >
        <ToolTipText x={0} y={0}>
          <ToolTipTSpanLabel fill={DARK.ohlcText}>
            {tooltipName}:{" "}
          </ToolTipTSpanLabel>
          <tspan fill={DARK.tx_primary}>{tooltipTxt}</tspan>
        </ToolTipText>
      </g>
    );
  }

  return dataArr.map((pattern) => (
    <Annotate
      key={pattern.date}
      with={SvgPathAnnotation}
      when={(d) => d.date === pattern.date}
      usingProps={anotateFunc(pattern)}
    />
  ));
};

export default AnnotateChart;
