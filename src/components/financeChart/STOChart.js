import React from "react";
import { StochasticSeries } from "@riyazpanarwala/series";
import { StochasticTooltip } from "@riyazpanarwala/tooltip";
import { useThemeColors } from "./useThemeColors";

const STOChart = () => {
  const colors = useThemeColors();

  const stoAppearance = {
    stroke: {
      dLine: colors.tx_primary,
      kLine: colors.tx_primary,
    }
  };

  return (
    <>
      <StochasticSeries yAccessor={(d) => d.fullSTO} {...stoAppearance} />
      <StochasticTooltip
        origin={[0, 40]}
        yAccessor={(d) => d.fullSTO}
        options={{ windowSize: 20, kWindowSize: 20, dWindowSize: 3 }}
        appearance={stoAppearance}
        labelFill={colors.ohlcText}
        label="Full STO"
      />
    </>
  );
};

export default STOChart;
