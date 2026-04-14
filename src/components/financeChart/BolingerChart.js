import React from "react";
import { BollingerSeries } from "@riyazpanarwala/series";
import { BollingerBandTooltip } from "@riyazpanarwala/tooltip";
import { CurrentCoordinate } from "@riyazpanarwala/coordinates";
import DARK from "./colorscheme.js";

const BolingerChart = ({ bb, sma20 }) => {
  const bbStroke = {
    top:    DARK.bbTop,
    middle: DARK.bbMiddle,
    bottom: DARK.bbBottom,
  };

  return (
    <>
      <BollingerSeries
        yAccessor={(d) => d.bb}
        stroke={bbStroke}
        fill={DARK.bbFill}
      />
      <BollingerBandTooltip
        origin={[0, 40]}
        yAccessor={(d) => d.bb}
        options={bb.options()}
      />
      <CurrentCoordinate yAccessor={sma20.accessor()} fill={sma20.stroke()} />
    </>
  );
};

export default BolingerChart;
