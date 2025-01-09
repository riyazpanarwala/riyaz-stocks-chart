import React from "react";
import {
  LineSeries,
  MouseCoordinateY,
  CurrentCoordinate,
  EdgeIndicator,
} from "react-financial-charts";
import { format } from "d3-format";
import CustomTooltip from "./CustomTooltip";

const DMI = () => {
  const adxColor = "red";
  const plusDIColor = "blue";
  const minusDIColor = "orange";
  return (
    <>
      <MouseCoordinateY rectWidth={60} displayFormat={format(".2f")} />

      <CurrentCoordinate yAccessor={(d) => d.plusDI} fillStyle={plusDIColor} />
      <CurrentCoordinate
        yAccessor={(d) => d.minusDI}
        fillStyle={minusDIColor}
      />
      <CurrentCoordinate yAccessor={(d) => d.adx} fillStyle={adxColor} />

      <LineSeries yAccessor={(d) => d.plusDI} strokeStyle={plusDIColor} />
      <LineSeries yAccessor={(d) => d.minusDI} strokeStyle={minusDIColor} />
      <LineSeries yAccessor={(d) => d.adx} strokeStyle={adxColor} />

      <CustomTooltip
        origin={[8, 16]}
        yAccessor={(d) => d.adx}
        tooltipName="ADX"
        textFill={adxColor}
      />
      <CustomTooltip
        origin={[8, 32]}
        yAccessor={(d) => d.plusDI}
        tooltipName="DI+"
        textFill={plusDIColor}
      />
      <CustomTooltip
        origin={[8, 48]}
        yAccessor={(d) => d.minusDI}
        tooltipName="DI-"
        textFill={minusDIColor}
      />

      <EdgeIndicator
        itemType="last" // Show edge for the last visible item
        orient="right" // Place on the right side of the chart
        edgeAt="right" // Align to the right axis
        yAccessor={(d) => d.adx} // Use the closing price
        fill={adxColor} // Color based on price movement
        textFill="#FFFFFF" // Text color inside the edge
      />
      <EdgeIndicator
        itemType="last" // Show edge for the last visible item
        orient="right" // Place on the right side of the chart
        edgeAt="right" // Align to the right axis
        yAccessor={(d) => d.plusDI} // Use the closing price
        fill={plusDIColor} // Color based on price movement
        textFill="#FFFFFF" // Text color inside the edge
      />
      <EdgeIndicator
        itemType="last" // Show edge for the last visible item
        orient="right" // Place on the right side of the chart
        edgeAt="right" // Align to the right axis
        yAccessor={(d) => d.minusDI} // Use the closing price
        fill={minusDIColor} // Color based on price movement
        textFill="#FFFFFF" // Text color inside the edge
      />
    </>
  );
};

export default DMI;
