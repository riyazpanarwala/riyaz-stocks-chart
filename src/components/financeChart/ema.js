import React from "react";
import {
  LineSeries,
  CurrentCoordinate,
} from "@riyazpanarwala/react-financial-charts";
import CustomTooltip from "./CustomTooltip";

const EMAChart = ({ ema26, ema12, angles }) => {
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
      <CustomTooltip
        origin={[8, 32]}
        yAccessor={ema26.accessor()}
        tooltipName={`EMA(${ema26.options().windowSize})`}
        textFill={ema26.stroke()}
      />
      <CustomTooltip
        origin={[8, 48]}
        yAccessor={ema12.accessor()}
        tooltipName={`EMA(${ema12.options().windowSize})`}
        textFill={ema12.stroke()}
      />

      {angles ? (
        <CustomTooltip
          origin={[8, 64]}
          yAccessor={(d) => angles[d.idx.index]}
          tooltipName={`Angle`}
          textFill={ema26.stroke()}
        />
      ) : (
        ""
      )}
    </>
  );
};

export default EMAChart;
