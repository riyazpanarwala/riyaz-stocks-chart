import React from "react";
import { format } from "d3-format";
import { ToolTipText, ToolTipTSpanLabel } from "@riyazpanarwala/tooltip";
import { functor, GenericChartComponent, last } from "@riyazpanarwala/core";

const displayTextsDefault = {
  o: "O: ",
  h: " H: ",
  l: " L: ",
  c: " C: ",
  v: " V: ",
  na: "n/a",
};

export class OHLCTooltip extends React.Component {
  static defaultProps = {
    accessor: (d) => d,
    changeFormat: format("+.2f"),
    volumeFormat: format(".4s"),
    className: "react-financial-charts-tooltip-hover",
    displayTexts: displayTextsDefault,
    displayValuesFor: (_, props) => props.currentItem,
    fontFamily:
      "-apple-system, system-ui, 'Helvetica Neue', Ubuntu, sans-serif",
    ohlcFormat: format(".2f"),
    origin: [0, 0],
    percentFormat: format("+.2%"),
  };

  render() {
    return (
      <GenericChartComponent
        clip={false}
        svgDraw={this.renderSVG}
        drawOn={["mousemove"]}
      />
    );
  }

  renderSVG = (moreProps) => {
    const {
      accessor,
      changeFormat = OHLCTooltip.defaultProps.changeFormat,
      volumeFormat = OHLCTooltip.defaultProps.volumeFormat,
      className,
      displayTexts = OHLCTooltip.defaultProps.displayTexts,
      displayValuesFor = OHLCTooltip.defaultProps.displayValuesFor,
      fontFamily,
      fontSize,
      fontWeight,
      labelFill,
      labelFontWeight,
      ohlcFormat = OHLCTooltip.defaultProps.ohlcFormat,
      onClick,
      percentFormat = OHLCTooltip.defaultProps.percentFormat,
      textFill,
    } = this.props;

    const {
      chartConfig: { width, height },
      fullData,
    } = moreProps;

    const currentItem =
      displayValuesFor(this.props, moreProps) ?? last(fullData);

    let open = displayTexts.na;
    let high = displayTexts.na;
    let low = displayTexts.na;
    let close = displayTexts.na;
    let volume = displayTexts.na;
    let change = displayTexts.na;

    if (currentItem !== undefined && accessor !== undefined) {
      const item = accessor(currentItem);
      if (item !== undefined) {
        open = ohlcFormat(item.open);
        high = ohlcFormat(item.high);
        low = ohlcFormat(item.low);
        close = ohlcFormat(item.close);
        volume = volumeFormat(item.volume);

        const prevItem = fullData[currentItem.idx.index - 1];
        const prevClose = prevItem?.close || item.open;
        change = `${changeFormat(item.close - prevClose)} (${percentFormat(
          (item.close - prevClose) / prevClose
        )})`;
      }
    }

    const { origin: originProp } = this.props;
    const [x, y] = functor(originProp)(width, height);
    const valueFill = functor(textFill)(currentItem);

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
          <ToolTipTSpanLabel
            fill={labelFill}
            fontWeight={labelFontWeight}
            key="label_O"
          >
            {displayTexts.o}
          </ToolTipTSpanLabel>
          <tspan key="value_O" fill={valueFill}>
            {open}
          </tspan>
          <ToolTipTSpanLabel
            fill={labelFill}
            fontWeight={labelFontWeight}
            key="label_H"
          >
            {displayTexts.h}
          </ToolTipTSpanLabel>
          <tspan key="value_H" fill={valueFill}>
            {high}
          </tspan>
          <ToolTipTSpanLabel
            fill={labelFill}
            fontWeight={labelFontWeight}
            key="label_L"
          >
            {displayTexts.l}
          </ToolTipTSpanLabel>
          <tspan key="value_L" fill={valueFill}>
            {low}
          </tspan>
          <ToolTipTSpanLabel
            fill={labelFill}
            fontWeight={labelFontWeight}
            key="label_C"
          >
            {displayTexts.c}
          </ToolTipTSpanLabel>
          <tspan key="value_C" fill={valueFill}>
            {close}
          </tspan>
          <ToolTipTSpanLabel
            fill={labelFill}
            fontWeight={labelFontWeight}
            key="label_V"
          >
            {displayTexts.v}
          </ToolTipTSpanLabel>
          <tspan key="value_V" fill={valueFill}>
            {volume}
          </tspan>
          <tspan key="value_Change" fill={valueFill}>
            {` ${change}`}
          </tspan>
        </ToolTipText>
      </g>
    );
  };
}
