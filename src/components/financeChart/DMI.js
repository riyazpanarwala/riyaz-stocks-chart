import React from "react";
import {
  LineSeries,
  MouseCoordinateX,
  MouseCoordinateY,
  CurrentCoordinate,
} from "react-financial-charts";
import { format } from "d3-format";
import { timeFormat } from "d3-time-format";
import CustomTooltip from "./CustomTooltip";

const DMI = () => {
  const adxColor = "red";
  const plusDIColor = "blue";
  const minusDIColor = "orange";
  return (
    <>
      <MouseCoordinateX rectWidth={60} displayFormat={timeFormat("%Y-%m-%d")} />
      <MouseCoordinateY rectWidth={60} displayFormat={format(".2f")} />

      <CurrentCoordinate yAccessor={(d) => d.plusDI} fillStyle={plusDIColor} />
      <CurrentCoordinate
        yAccessor={(d) => d.minusDI}
        fillStyle={minusDIColor}
      />
      <CurrentCoordinate yAccessor={(d) => d.adx} fillStyle={adxColor} />

      <LineSeries yAccessor={(d) => d.plusDI} strokeStyle={plusDIColor} />
      <LineSeries yAccessor={(d) => d.minusDI} strokeStyle={minusDIColor} />
      <LineSeries yAccessor={(d) => d.adx} strokeStyle={adxColor} />

      <CustomTooltip
        origin={[8, 32]}
        yAccessor={(d) => d.adx}
        tooltipName="ADX"
        textFill={adxColor}
      />
      <CustomTooltip
        origin={[8, 48]}
        yAccessor={(d) => d.plusDI}
        tooltipName="DI+"
        textFill={plusDIColor}
      />
      <CustomTooltip
        origin={[8, 64]}
        yAccessor={(d) => d.minusDI}
        tooltipName="DI-"
        textFill={minusDIColor}
      />
    </>
  );
};

export default DMI;
