import React, { useState, useRef, useEffect } from "react";
import { format } from "d3-format";
import {
  withDeviceRatio,
  withSize,
  ema,
  discontinuousTimeScaleProviderBuilder,
  Chart,
  ChartCanvas,
  CurrentCoordinate,
  BarSeries,
  CandlestickSeries,
  LineSeries,
  MovingAverageTooltip,
  OHLCTooltip,
  lastVisibleItemBasedZoomAnchor,
  XAxis,
  YAxis,
  CrossHairCursor,
  EdgeIndicator,
  MouseCoordinateY,
  ZoomButtons,
  TrendLine,
  isDefined,
  isNotDefined,
  DrawingObjectSelector,
} from "react-financial-charts";
import toObject from "../utils/toObject";

const FinanceChart = ({
  initialData,
  trendLineEnable,
  disableAllTools,
  width,
  height,
}) => {
  const [trendLines, setTrendLines] = useState([]);
  const trendLineRef = useRef(trendLines);
  const ScaleProvider = discontinuousTimeScaleProviderBuilder().inputDateAccessor(
    (d) => new Date(d.date)
  );

  const margin = { left: 0, right: 48, top: 0, bottom: 24 };
  let interactiveNodes = {};

  console.log(width, height);

  const ema12 = ema()
    .id(1)
    .options({ windowSize: 12 })
    .merge((d, c) => {
      d.ema12 = c;
    })
    .accessor((d) => d.ema12);

  const ema26 = ema()
    .id(2)
    .options({ windowSize: 26 })
    .merge((d, c) => {
      d.ema26 = c;
    })
    .accessor((d) => d.ema26);

  const calculatedData = ema26(ema12(initialData));

  const { data, xScale, xAccessor, displayXAccessor } = ScaleProvider(
    calculatedData
  );
  const pricesDisplayFormat = format(".2f");
  const max = xAccessor(data[data.length - 1]);
  const min = xAccessor(data[Math.max(0, data.length - 100)]);
  const xExtents = [min, max + 5];

  const gridHeight = height - margin.top - margin.bottom;

  const elderRayHeight = 0;
  const barChartHeight = gridHeight / 4;
  const barChartOrigin = (_, h) => [0, h - barChartHeight - elderRayHeight];
  const chartHeight = gridHeight - elderRayHeight;

  const barChartExtents = (data) => {
    return data.volume;
  };

  const candleChartExtents = (data) => {
    return [data.high, data.low];
  };

  const yEdgeIndicator = (data) => {
    return data.close;
  };

  const volumeColor = (data) => {
    return data.close > data.open
      ? "rgba(38, 166, 154, 0.3)"
      : "rgba(239, 83, 80, 0.3)";
  };

  const volumeSeries = (data) => {
    return data.volume;
  };

  const openCloseColor = (data) => {
    return data.close > data.open ? "#26a69a" : "#ef5350";
  };

  const handleSelection = (e, interactives, moreProps) => {
    const state = toObject(interactives, (each) => {
      return [each.type, each.objects];
    });

    if ("Trendline" in state && state["Trendline"].length > 0) {
      trendLineRef.current = state["Trendline"];
      setTrendLines(state.Trendline);
      // updateTrendLine(state.Trendline);
    }
  };

  const saveInteractiveNode = (type, chartId) => {
    return (node) => {
      const key = `${type}_${chartId}`;
      if (isDefined(node) || isNotDefined(interactiveNodes[key])) {
        interactiveNodes = {
          ...interactiveNodes,
          [key]: { type, chartId, node },
        };
      }
      return interactiveNodes;
    };
  };

  const handleDelete = () => {
    if (trendLineRef.current) {
      const newTrendlines = trendLineRef?.current?.filter(
        (each) => !each.selected
      );

      trendLineRef.current = newTrendlines;
      setTrendLines(newTrendlines);
      // updateTrendLine(newTrendlines)
    }
  };

  const onKeyPress = (e) => {
    const keyCode = e.which;

    switch (keyCode) {
      case 46:
        // DEL
        handleDelete();
        break;

      case 27:
        // ESC
        disableAllTools();
        break;
    }
  };

  useEffect(() => {
    document.addEventListener("keyup", onKeyPress);
    return () => {
      document.removeEventListener("keyup", onKeyPress);
    };
  }, []);

  return (
    <ChartCanvas
      height={height}
      ratio={3}
      width={width}
      margin={margin}
      data={data}
      displayXAccessor={displayXAccessor}
      seriesName="Data"
      xScale={xScale}
      xAccessor={xAccessor}
      xExtents={xExtents}
      zoomAnchor={lastVisibleItemBasedZoomAnchor}
    >
      <Chart
        id={2}
        height={barChartHeight}
        origin={barChartOrigin}
        yExtents={barChartExtents}
      >
        <BarSeries fillStyle={volumeColor} yAccessor={volumeSeries} />
      </Chart>
      <Chart id={3} height={chartHeight} yExtents={candleChartExtents}>
        <XAxis showGridLines gridLinesStrokeStyle="#e0e3eb" />
        <YAxis showGridLines tickFormat={pricesDisplayFormat} />
        <CandlestickSeries />
        <LineSeries yAccessor={ema26.accessor()} strokeStyle={ema26.stroke()} />
        <CurrentCoordinate
          yAccessor={ema26.accessor()}
          fillStyle={ema26.stroke()}
        />
        <LineSeries yAccessor={ema12.accessor()} strokeStyle={ema12.stroke()} />
        <CurrentCoordinate
          yAccessor={ema12.accessor()}
          fillStyle={ema12.stroke()}
        />
        <MouseCoordinateY
          rectWidth={margin.right}
          displayFormat={pricesDisplayFormat}
        />
        <EdgeIndicator
          itemType="last"
          rectWidth={margin.right}
          fill={openCloseColor}
          lineStroke={openCloseColor}
          displayFormat={pricesDisplayFormat}
          yAccessor={yEdgeIndicator}
        />
        <MovingAverageTooltip
          origin={[8, 24]}
          options={[
            {
              yAccessor: ema26.accessor(),
              type: "EMA",
              stroke: ema26.stroke(),
              windowSize: ema26.options().windowSize,
            },
            {
              yAccessor: ema12.accessor(),
              type: "EMA",
              stroke: ema12.stroke(),
              windowSize: ema12.options().windowSize,
            },
          ]}
        />

        <TrendLine
          ref={saveInteractiveNode("Trendline", 3)}
          trends={trendLines}
          enabled={trendLineEnable}
          type="LINE"
          snap={false}
          onComplete={(e, newTrends, moreProps) => {
            trendLineRef.current = newTrends;
            setTrendLines([...newTrends]);
            // updateTrendLine(newTrends);
            disableAllTools();
          }}
          appearance={{
            strokeStyle: "#FFF",
            strokeWidth: 1,
            strokeDasharray: "Solid",
            edgeStrokeWidth: 1,
            edgeFill: "#FFFFFF",
            edgeStroke: "#FFF",
          }}
        />

        <ZoomButtons />
        <OHLCTooltip origin={[8, 16]} />
      </Chart>

      <CrossHairCursor />
      <DrawingObjectSelector
        enabled={true}
        getInteractiveNodes={() => interactiveNodes}
        drawingObjectMap={{
          Trendline: "trends",
          Interactive: "textList",
        }}
        onSelect={handleSelection}
      />
    </ChartCanvas>
  );
};

// export default FinanceChart;

export default withSize({
  style: {
    minHeight: 450,
  },
})(withDeviceRatio()(FinanceChart));
