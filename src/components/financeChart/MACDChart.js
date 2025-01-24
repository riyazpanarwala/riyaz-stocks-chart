import React from "react";
import {
  MACDTooltip,
  MACDSeries,
  MouseCoordinateX,
  MouseCoordinateY,
  XAxis,
  YAxis,
} from "@riyazpanarwala/react-financial-charts";
import { format } from "d3-format";
import { timeFormat } from "d3-time-format";

const macdAppearance = {
  strokeStyle: {
    macd: "#FF0000",
    signal: "#00F300",
  },
  fillStyle: {
    divergence: "#4682B4",
  },
};

const mouseEdgeAppearance = {
  textFill: "#542605",
  stroke: "#05233B",
  strokeOpacity: 1,
  strokeWidth: 3,
  arrowWidth: 5,
  fill: "#BCDEFA",
};

const MACDChart = ({ macdCalculator }) => {
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
