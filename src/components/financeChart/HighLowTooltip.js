import React from "react";
import { ToolTipTSpanLabel, ToolTipText } from "@riyazpanarwala/tooltip";
import { useThemeColors } from "./useThemeColors";

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
  const DARK = useThemeColors();
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
          fill={DARK.ohlcText}
          key="label_H"
        >
          {displayTextsDefault.h}
        </ToolTipTSpanLabel>
        <tspan key="value_H" fill={DARK.tx_primary}>{maxValue}</tspan>
        <ToolTipTSpanLabel
          fill={DARK.ohlcText}
          key="label_L"
        >
          {displayTextsDefault.l}
        </ToolTipTSpanLabel>
        <tspan key="value_L" fill={DARK.tx_primary}>{minValue}</tspan>
      </ToolTipText>
    </g>
  );
};

export default HighLowTooltip;
