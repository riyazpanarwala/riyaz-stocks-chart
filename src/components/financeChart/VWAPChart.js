import React from "react";
import { LineSeries } from "@riyazpanarwala/series";
import { CurrentCoordinate } from "@riyazpanarwala/coordinates";
import CustomTooltip from "./CustomTooltip";
import { useThemeColors } from "./useThemeColors";

/** Render VWAP with the selected volume-weighted deviation bands. */
const VWAPChart = ({ bands }) => {
  const colors = useThemeColors();
  /** Keep null and non-finite samples out of the rendered line path. */
  const defined = (value) => Number.isFinite(value);
  return (
    <>
      <LineSeries yAccessor={(d) => d.vwap} defined={defined} strokeStyle={colors.vwapLine} strokeWidth={2} />
      <CurrentCoordinate yAccessor={(d) => d.vwap} fillStyle={colors.vwapLine} />
      {bands >= 1 && <>
        <LineSeries yAccessor={(d) => d.upper1} defined={defined} strokeStyle={colors.vwapBand} strokeDasharray="ShortDash" />
        <LineSeries yAccessor={(d) => d.lower1} defined={defined} strokeStyle={colors.vwapBand} strokeDasharray="ShortDash" />
      </>}
      {bands >= 2 && <>
        <LineSeries yAccessor={(d) => d.upper2} defined={defined} strokeStyle={colors.vwapOuterBand} strokeDasharray="ShortDash" />
        <LineSeries yAccessor={(d) => d.lower2} defined={defined} strokeStyle={colors.vwapOuterBand} strokeDasharray="ShortDash" />
      </>}
      <CustomTooltip origin={[8, 48]} yAccessor={(d) => d.vwap} tooltipName="VWAP" textFill={colors.vwapLine} />
    </>
  );
};

export default VWAPChart;
