import React from "react";
import { LineSeries } from "@riyazpanarwala/series";
import { CurrentCoordinate } from "@riyazpanarwala/coordinates";
import CustomTooltip from "./CustomTooltip";
import { useThemeColors } from "./useThemeColors";

const VWAPChart = ({ bands }) => {
  const colors = useThemeColors();
  return (
    <>
      <LineSeries yAccessor={(d) => d.vwap} strokeStyle={colors.vwapLine} strokeWidth={2} />
      <CurrentCoordinate yAccessor={(d) => d.vwap} fillStyle={colors.vwapLine} />
      {bands >= 1 && <>
        <LineSeries yAccessor={(d) => d.upper1} strokeStyle={colors.vwapBand} strokeDasharray="ShortDash" />
        <LineSeries yAccessor={(d) => d.lower1} strokeStyle={colors.vwapBand} strokeDasharray="ShortDash" />
      </>}
      {bands >= 2 && <>
        <LineSeries yAccessor={(d) => d.upper2} strokeStyle={colors.vwapOuterBand} strokeDasharray="ShortDash" />
        <LineSeries yAccessor={(d) => d.lower2} strokeStyle={colors.vwapOuterBand} strokeDasharray="ShortDash" />
      </>}
      <CustomTooltip origin={[8, 48]} yAccessor={(d) => d.vwap} tooltipName="VWAP" textFill={colors.vwapLine} />
    </>
  );
};

export default VWAPChart;
