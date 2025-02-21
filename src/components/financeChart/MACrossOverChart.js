import React from "react";
import { LineSeries } from "@riyazpanarwala/series";
import { CurrentCoordinate } from "@riyazpanarwala/coordinates";
import { Annotate, SvgPathAnnotation } from "@riyazpanarwala/annotations";
import CustomTooltip from "./CustomTooltip";

const MACrossOverChart = ({ ma1, ma2, indicatorName, isIntraday }) => {
  const defaultAnnotationProps = {
    onClick: console.log.bind(console),
  };

  const longAnnotationProps = {
    ...defaultAnnotationProps,
    y: ({ yScale, datum }) => yScale(datum.low),
    fill: "#006517",
    path: () => "M12 4L6 10H10V20H14V10H18L12 4Z",
    pathWidth: 12,
    pathHeight: 12,
    tooltip: (datum) => `Go long (Close:${datum.close} date:${datum.date})`,
  };

  const shortAnnotationProps = {
    ...defaultAnnotationProps,
    y: ({ yScale, datum }) => yScale(datum.high),
    fill: "#FF0000",
    path: () => "M12 20L18 14H14V4H10V14H6L12 20Z",
    pathWidth: 12,
    pathHeight: 12,
    tooltip: (datum) => `Go short (Close:${datum.close} date:${datum.date})`,
  };

  const yVal = isIntraday ? 48 : 32;

  return (
    <>
      <LineSeries yAccessor={ma1.accessor()} strokeStyle={ma1.stroke()} />
      <LineSeries yAccessor={ma2.accessor()} strokeStyle={ma2.stroke()} />

      <CurrentCoordinate yAccessor={ma1.accessor()} fillStyle={ma1.stroke()} />
      <CurrentCoordinate yAccessor={ma2.accessor()} fillStyle={ma2.stroke()} />

      <CustomTooltip
        origin={[8, yVal]}
        yAccessor={ma1.accessor()}
        tooltipName={`SMA(${ma1.options().windowSize})`}
        textFill={ma1.stroke()}
      />
      <CustomTooltip
        origin={[8, yVal + 16]}
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
