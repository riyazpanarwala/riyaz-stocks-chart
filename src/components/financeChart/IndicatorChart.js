import React from "react";
import { LineSeries } from "@riyazpanarwala/series";
import { CurrentCoordinate } from "@riyazpanarwala/coordinates";
import CustomTooltip from "./CustomTooltip";

const IndicatorChart = ({ keyVal, tooltipName }) => {
  return (
    <>
      <LineSeries yAccessor={(d) => d[keyVal]} stroke="#4682B4" />
      <CurrentCoordinate yAccessor={(d) => d[keyVal]} fillStyle={"#4682B4"} />
      <CustomTooltip
        origin={[8, 32]}
        yAccessor={(d) => d[keyVal]}
        tooltipName={tooltipName}
        textFill={"#4682B4"}
      />
    </>
  );
};

export default IndicatorChart;
