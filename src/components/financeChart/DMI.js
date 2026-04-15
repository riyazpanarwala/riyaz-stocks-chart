import React from "react";
import { LineSeries } from "@riyazpanarwala/series";
import {
  MouseCoordinateY,
  CurrentCoordinate,
  EdgeIndicator,
} from "@riyazpanarwala/coordinates";
import { format } from "d3-format";
import CustomTooltip from "./CustomTooltip";
import { useThemeColors } from "./useThemeColors";

const DMI = () => {
  const DARK = useThemeColors();
  return (
    <>
      <MouseCoordinateY rectWidth={60} displayFormat={format(".2f")} />

      <CurrentCoordinate yAccessor={(d) => d.plusDI} fillStyle={DARK.dmiPlusDI} />
      <CurrentCoordinate yAccessor={(d) => d.minusDI} fillStyle={DARK.dmiMinusDI} />
      <CurrentCoordinate yAccessor={(d) => d.adx} fillStyle={DARK.dmiAdx} />

      <LineSeries yAccessor={(d) => d.plusDI} strokeStyle={DARK.dmiPlusDI} />
      <LineSeries yAccessor={(d) => d.minusDI} strokeStyle={DARK.dmiMinusDI} />
      <LineSeries yAccessor={(d) => d.adx} strokeStyle={DARK.dmiAdx} />

      <CustomTooltip
        origin={[8, 32]}
        yAccessor={(d) => d.adx}
        tooltipName="ADX"
        textFill={DARK.dmiAdx}
      />
      <CustomTooltip
        origin={[8, 48]}
        yAccessor={(d) => d.plusDI}
        tooltipName="DI+"
        textFill={DARK.dmiPlusDI}
      />
      <CustomTooltip
        origin={[8, 64]}
        yAccessor={(d) => d.minusDI}
        tooltipName="DI-"
        textFill={DARK.dmiMinusDI}
      />

      <EdgeIndicator
        itemType="last"
        orient="right"
        edgeAt="right"
        yAccessor={(d) => d.adx}
        fill={DARK.dmiAdx}
        textFill={DARK.edgeText}
      />
      <EdgeIndicator
        itemType="last"
        orient="right"
        edgeAt="right"
        yAccessor={(d) => d.plusDI}
        fill={DARK.dmiPlusDI}
        textFill={DARK.edgeText}
      />
      <EdgeIndicator
        itemType="last"
        orient="right"
        edgeAt="right"
        yAccessor={(d) => d.minusDI}
        fill={DARK.dmiMinusDI}
        textFill={DARK.edgeText}
      />
    </>
  );
};

export default DMI;
