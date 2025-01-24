import React from "react";
import { RSISeries } from "@riyazpanarwala/series";
import { RSITooltip } from "@riyazpanarwala/tooltip";

const RSIChart = ({ rsiYAccessor, rsiCalculator }) => {
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
        yAccessor={rsiYAccessor}
        options={rsiCalculator.options()}
      />
    </>
  );
};

export default RSIChart;
