import React from "react";
import { RSISeries } from "@riyazpanarwala/series";
import { RSITooltip } from "@riyazpanarwala/tooltip";
import DARK from "./colorscheme.js";

const RSIChart = ({ data, rsiYAccessor, rsiCalculator }) => {
  if (data.length < 2) {
    return "";
  }
  return (
    <>
      <RSISeries
        yAccessor={rsiYAccessor}
        strokeStyle={{
          line:             DARK.rsiLine,
          top:              DARK.rsiBand,
          middle:           DARK.rsiBand,
          bottom:           DARK.rsiBand,
          outsideThreshold: DARK.rsiOversold,
          insideThreshold:  DARK.rsiOverbought,
        }}
      />
      <RSITooltip
        origin={[8, 32]}
        labelFill={DARK.axisLabel}
        textFill={DARK.tx_primary}
        yAccessor={rsiYAccessor}
        options={rsiCalculator.options()}
      />
    </>
  );
};

export default RSIChart;
