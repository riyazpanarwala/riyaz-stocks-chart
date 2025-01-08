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
  return (
    <>
      <MouseCoordinateX rectWidth={60} displayFormat={timeFormat("%Y-%m-%d")} />
      <MouseCoordinateY rectWidth={60} displayFormat={format(".2f")} />

      <CurrentCoordinate yAccessor={(d) => d.plusDI} fillStyle={"#000"} />
      <CurrentCoordinate yAccessor={(d) => d.minusDI} fillStyle={"red"} />
      <CurrentCoordinate yAccessor={(d) => d.adx} fillStyle={"blue"} />

      <LineSeries yAccessor={(d) => d.plusDI} strokeStyle="#000" />
      <LineSeries yAccessor={(d) => d.minusDI} strokeStyle="red" />
      <LineSeries yAccessor={(d) => d.adx} strokeStyle="blue" />

      <CustomTooltip
        origin={[8, 32]}
        yAccessor={(d) => d.plusDI}
        tooltipName="DMI+"
        textFill="#000"
      />
      <CustomTooltip
        origin={[8, 48]}
        yAccessor={(d) => d.minusDI}
        tooltipName="DMI-"
        textFill="red"
      />
      <CustomTooltip
        origin={[8, 64]}
        yAccessor={(d) => d.adx}
        tooltipName="ADX"
        textFill="blue"
      />
    </>
  );
};

export default DMI;
