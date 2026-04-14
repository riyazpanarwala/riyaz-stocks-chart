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
          line: "#000000",
          top: "#B8C2CC",
          middle: "#8795A1",
          bottom: "#B8C2CC",
          outsideThreshold: "green",
          insideThreshold: "blue",
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
