import React from "react";
import { MACDTooltip } from "@riyazpanarwala/tooltip";
import { MACDSeries } from "@riyazpanarwala/series";
import {
  MouseCoordinateX,
  MouseCoordinateY,
} from "@riyazpanarwala/coordinates";
import { XAxis, YAxis } from "@riyazpanarwala/axes";
import { format } from "d3-format";
import { timeFormat } from "d3-time-format";
import { useThemeColors } from "./useThemeColors";

const MACDChart = ({ macdCalculator }) => {
  const DARK = useThemeColors();
  const macdAppearance = {
    strokeStyle: {
      macd: DARK.macdLine,
      signal: DARK.macdSignal,
    },
    fillStyle: {
      divergence: DARK.macdHist,
    },
  };

  const mouseEdgeAppearance = {
    textFill: DARK.macdEdgeText,
    stroke: DARK.macdEdgeStroke,
    strokeOpacity: 1,
    strokeWidth: 1,
    arrowWidth: 4,
    fill: DARK.macdEdgeFill,
  };

  return (
    <>
      <XAxis axisAt="bottom" orient="bottom" />
      <YAxis axisAt="right" orient="right" ticks={2} />

      <MouseCoordinateX
        at="bottom"
        orient="bottom"
        displayFormat={timeFormat("%Y-%m-%d")}
        rectRadius={5}
        {...mouseEdgeAppearance}
      />
      <MouseCoordinateY
        at="right"
        orient="right"
        displayFormat={format(".2f")}
        {...mouseEdgeAppearance}
      />

      <MACDSeries yAccessor={(d) => d.macd} {...macdAppearance} />
      <MACDTooltip
        origin={[8, 32]}
        yAccessor={(d) => d.macd}
        options={macdCalculator.options()}
        appearance={macdAppearance}
      />
    </>
  );
};

export default MACDChart;
