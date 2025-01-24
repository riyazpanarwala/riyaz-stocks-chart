import React from "react";
import {
  functor,
  isDefined,
  GenericChartComponent,
  ToolTipTSpanLabel,
  ToolTipText,
} from "@riyazpanarwala/react-financial-charts";
import { format } from "d3-format";

const CustomTooltip = ({
  displayFormat = format(".2f"),
  displayInit = "n/a",
  displayValuesFor = (_, props) => props.currentItem,
  origin = [0, 0],
  className = "react-financial-charts-tooltip",
  tooltipName = "Volume",
  onClick,
  fontFamily,
  fontSize,
  fontWeight,
  yAccessor,
  labelFill,
  labelFontWeight,
  textFill,
}) => {
  const renderSVG = (moreProps) => {
    const {
      chartConfig: { width, height },
    } = moreProps;

    const currentItem = displayValuesFor("", moreProps);
    const name = isDefined(currentItem) && yAccessor(currentItem);
    const value = (name && displayFormat(name)) || displayInit;

    const origin1 = functor(origin);
    const [x, y] = origin1(width, height);

    const tooltipLabel = `${tooltipName}: `;

    return (
      <g
        className={className}
        transform={`translate(${x}, ${y})`}
        onClick={onClick}
      >
        <ToolTipText
          x={0}
          y={0}
          fontFamily={fontFamily}
          fontSize={fontSize}
          fontWeight={fontWeight}
        >
          <ToolTipTSpanLabel fill={labelFill} fontWeight={labelFontWeight}>
            {tooltipLabel}
          </ToolTipTSpanLabel>
          <tspan fill={textFill}>{value}</tspan>
        </ToolTipText>
      </g>
    );
  };

  return (
    <GenericChartComponent
      clip={false}
      svgDraw={renderSVG}
      drawOn={["mousemove"]}
    />
  );
};

export default CustomTooltip;
