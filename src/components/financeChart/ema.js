import React from "react";
import {
  CurrentCoordinate,
  LineSeries,
  MovingAverageTooltip,
} from "react-financial-charts";

const EMAChart = ({ ema26, ema12 }) => {
  return (
    <>
      <LineSeries yAccessor={ema26.accessor()} strokeStyle={ema26.stroke()} />
      <CurrentCoordinate
        yAccessor={ema26.accessor()}
        fillStyle={ema26.stroke()}
      />
      <LineSeries yAccessor={ema12.accessor()} strokeStyle={ema12.stroke()} />
      <CurrentCoordinate
        yAccessor={ema12.accessor()}
        fillStyle={ema12.stroke()}
      />
      <MovingAverageTooltip
        origin={[8, 40]}
        options={[
          {
            yAccessor: ema26.accessor(),
            type: "EMA",
            stroke: ema26.stroke(),
            windowSize: ema26.options().windowSize,
          },
          {
            yAccessor: ema12.accessor(),
            type: "EMA",
            stroke: ema12.stroke(),
            windowSize: ema12.options().windowSize,
          },
        ]}
      />
    </>
  );
};

export default EMAChart;
