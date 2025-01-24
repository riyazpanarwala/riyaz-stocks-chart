import React from "react";
import {
  ToolTipTSpanLabel,
  ToolTipText,
} from "@riyazpanarwala/react-financial-charts";

const defaultTexts = {
  h: "Day High: ",
  l: " Day Low: ",
};

const HighLowTooltip = ({
  className,
  ohlcData,
  origin = [0, 0],
  displayTextsDefault = defaultTexts,
}) => {
  const [x, y] = origin;
  const maxValue = Math.max.apply(
    null,
    ohlcData.map((v) => v.high)
  );
  const minValue = Math.min.apply(
    null,
    ohlcData.map((v) => v.low)
  );

  return (
    <g className={className} transform={`translate(${x}, ${y})`}>
      <ToolTipText x={0} y={0}>
        <ToolTipTSpanLabel
          // fill={labelFill}
          key="label_H"
        >
          {displayTextsDefault.h}
        </ToolTipTSpanLabel>
        <tspan key="value_H">{maxValue}</tspan>
        <ToolTipTSpanLabel
          // fill={labelFill}
          key="label_L"
        >
          {displayTextsDefault.l}
        </ToolTipTSpanLabel>
        <tspan key="value_L">{minValue}</tspan>
      </ToolTipText>
    </g>
  );
};

export default HighLowTooltip;
