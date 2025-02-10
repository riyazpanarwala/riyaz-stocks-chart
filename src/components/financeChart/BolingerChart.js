import React from "react";
import { BollingerSeries } from "@riyazpanarwala/series";
import { BollingerBandTooltip } from "@riyazpanarwala/tooltip";
import { CurrentCoordinate } from "@riyazpanarwala/coordinates";

const BolingerChart = ({ bb, sma20 }) => {
  const bbStroke = {
    top: "#964B00",
    middle: "#000000",
    bottom: "#964B00",
  };

  const bbFill = "#4682B4";

  return (
    <>
      <BollingerSeries
        yAccessor={(d) => d.bb}
        stroke={bbStroke}
        fill={bbFill}
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
