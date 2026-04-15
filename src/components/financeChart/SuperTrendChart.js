import React from "react";
import { LineSeries } from "@riyazpanarwala/series";
import { CurrentCoordinate } from "@riyazpanarwala/coordinates";
import CustomTooltip from "./CustomTooltip";
import { useThemeColors } from "./useThemeColors";

const SuperTrendChart = () => {
  const DARK = useThemeColors();
  return (
    <>
      <LineSeries yAccessor={(d) => d.trend} strokeStyle={DARK.indicator} />
      <CurrentCoordinate yAccessor={(d) => d.trend} fillStyle={DARK.indicator} />
      <CustomTooltip
        origin={[8, 32]}
        yAccessor={(d) => d.trend}
        tooltipName="Trend"
        textFill={DARK.indicator}
      />
    </>
  );
};

export default SuperTrendChart;
