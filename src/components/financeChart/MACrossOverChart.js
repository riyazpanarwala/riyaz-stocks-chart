import React from "react";
import { LineSeries } from "@riyazpanarwala/series";
import { CurrentCoordinate } from "@riyazpanarwala/coordinates";
import {
  Annotate,
  SvgPathAnnotation,
  // buyPath,
  // sellPath,
} from "@riyazpanarwala/annotations";
import CustomTooltip from "./CustomTooltip";

const MACrossOverChart = ({ ma1, ma2, indicatorName }) => {
  const defaultAnnotationProps = {
    onClick: console.log.bind(console),
  };

  const longAnnotationProps = {
    ...defaultAnnotationProps,
    y: ({ yScale, datum }) => yScale(datum.low),
    fill: "#006517",
    // path: () => buyPath,
    path: () =>
      "M12,11.5A2.5,2.5 0 0,1 9.5,9A2.5,2.5 0 0,1 12,6.5A2.5,2.5 0 0,1 14.5,9A2.5,2.5 0 0,1 12,11.5M12,2A7,7 0 0,0 5,9C5,14.25 12,22 12,22C12,22 19,14.25 19,9A7,7 0 0,0 12,2Z",
    pathWidth: 12,
    pathHeight: 12,
    tooltip: "Go long",
  };

  const shortAnnotationProps = {
    ...defaultAnnotationProps,
    y: ({ yScale, datum }) => yScale(datum.high),
    fill: "#FF0000",
    // path: () => sellPath,
    path: () =>
      "M12,11.5A2.5,2.5 0 0,1 9.5,9A2.5,2.5 0 0,1 12,6.5A2.5,2.5 0 0,1 14.5,9A2.5,2.5 0 0,1 12,11.5M12,2A7,7 0 0,0 5,9C5,14.25 12,22 12,22C12,22 19,14.25 19,9A7,7 0 0,0 12,2Z",
    pathWidth: 12,
    pathHeight: 12,
    tooltip: "Go short",
  };

  return (
    <>
      <LineSeries yAccessor={ma1.accessor()} strokeStyle={ma1.stroke()} />
      <LineSeries yAccessor={ma2.accessor()} strokeStyle={ma2.stroke()} />

      <CurrentCoordinate yAccessor={ma1.accessor()} fillStyle={ma1.stroke()} />
      <CurrentCoordinate yAccessor={ma2.accessor()} fillStyle={ma2.stroke()} />

      <CustomTooltip
        origin={[8, 32]}
        yAccessor={ma1.accessor()}
        tooltipName={`SMA(${ma1.options().windowSize})`}
        textFill={ma1.stroke()}
      />
      <CustomTooltip
        origin={[8, 48]}
        yAccessor={ma2.accessor()}
        tooltipName={`SMA(${ma2.options().windowSize})`}
        textFill={ma2.stroke()}
      />

      <Annotate
        with={SvgPathAnnotation}
        when={(d) => d.longShort === `LONG${indicatorName}`}
        usingProps={longAnnotationProps}
      />
      <Annotate
        with={SvgPathAnnotation}
        when={(d) => d.longShort === `SHORT${indicatorName}`}
        usingProps={shortAnnotationProps}
      />
    </>
  );
};

export default MACrossOverChart;
