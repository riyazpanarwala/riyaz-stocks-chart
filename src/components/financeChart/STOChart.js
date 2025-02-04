import React from "react";
import { StochasticSeries } from "@riyazpanarwala/series";
import { StochasticTooltip } from "@riyazpanarwala/tooltip";

const stoAppearance = {
  stroke: Object.assign({}, StochasticSeries.defaultProps.stroke),
};

const STOChart = () => {
  return (
    <>
      <StochasticSeries yAccessor={(d) => d.fullSTO} {...stoAppearance} />
      <StochasticTooltip
        origin={[0, 40]}
        yAccessor={(d) => d.fullSTO}
        options={{ windowSize: 20, kWindowSize: 20, dWindowSize: 3 }}
        appearance={stoAppearance}
        label="Full STO"
      />
    </>
  );
};

export default STOChart;
