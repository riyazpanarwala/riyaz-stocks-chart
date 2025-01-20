import React, { Fragment } from "react";
import { CurrentCoordinate, LineSeries } from "react-financial-charts";
import CustomTooltip from "./CustomTooltip";

const SMAChart = ({ smaArr, isIntraday }) => {
  return smaArr.map((v, i) => {
    const { val } = v;
    const yVal = (isIntraday ? 48 : 32) + i * 16;
    return (
      <Fragment key={v.id}>
        <LineSeries yAccessor={val.accessor()} strokeStyle={val.stroke()} />
        <CurrentCoordinate
          yAccessor={val.accessor()}
          fillStyle={val.stroke()}
        />
        <CustomTooltip
          origin={[8, yVal]}
          yAccessor={val.accessor()}
          tooltipName={`SMA(${val.options().windowSize})`}
          textFill={val.stroke()}
        />
      </Fragment>
    );
  });
};

export default SMAChart;
