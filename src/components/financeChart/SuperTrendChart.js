import React from "react";
import { LineSeries } from "@riyazpanarwala/series";
import { CurrentCoordinate } from "@riyazpanarwala/coordinates";
import CustomTooltip from "./CustomTooltip";

const SuperTrendChart = () => {
  return (
    <>
      <LineSeries yAccessor={(d) => d.trend} stroke="#4682B4" />
      <CurrentCoordinate yAccessor={(d) => d.trend} fillStyle={"#4682B4"} />
      <CustomTooltip
        origin={[8, 32]}
        yAccessor={(d) => d.trend}
        tooltipName={`Trend`}
        textFill={"#4682B4"}
      />
      {/*
      <LineSeries yAccessor={(d) => d.close} stroke="red" />
      <CurrentCoordinate yAccessor={(d) => d.close} fillStyle={"red"} />
      <CustomTooltip
        origin={[8, 48]}
        yAccessor={(d) => d.close}
        tooltipName={`Close`}
        textFill={"red"}
      />
      */}
    </>
  );
};

export default SuperTrendChart;
