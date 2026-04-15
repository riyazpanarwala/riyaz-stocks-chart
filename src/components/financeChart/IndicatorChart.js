import React from "react";
import { LineSeries } from "@riyazpanarwala/series";
import { CurrentCoordinate } from "@riyazpanarwala/coordinates";
import CustomTooltip from "./CustomTooltip";
import { useThemeColors } from "./useThemeColors";

const IndicatorChart = ({ keyVal, tooltipName }) => {
  const DARK = useThemeColors();
  return (
    <>
      <LineSeries yAccessor={(d) => d[keyVal]} strokeStyle={DARK.indicator} />
      <CurrentCoordinate yAccessor={(d) => d[keyVal]} fillStyle={DARK.indicator} />
      <CustomTooltip
        origin={[8, 32]}
        yAccessor={(d) => d[keyVal]}
        tooltipName={tooltipName}
        textFill={DARK.indicator}
      />
    </>
  );
};

export default IndicatorChart;
