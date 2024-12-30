import React, { useState, useRef, useEffect } from "react";
import { format } from "d3-format";
import {
  withDeviceRatio,
  withSize,
  discontinuousTimeScaleProviderBuilder,
  Chart,
  ChartCanvas,
  BarSeries,
  CandlestickSeries,
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
  Measurement,
  InteractiveText,
} from "react-financial-charts";
import EMAChart from "./ema";
import RSIChart from "./RSI";
import useData from "./useData";
import toObject from "../utils/toObject";

const FinanceChart = ({
  initialData,
  trendLineEnable,
  measurementEnable,
  textEnable,
  disableAllTools,
  width,
  height,
  indicatorName,
}) => {
  const [trendLines, setTrendLines] = useState([]);
  const [textList, setTextList] = useState([]);
  const trendLineRef = useRef(trendLines);
  const textListRef = useRef(textList);
  const { calculatedData, ema12, ema26, rsiCalculator, rsiYAccessor } = useData(
    initialData,
    indicatorName
  );
  const ScaleProvider = discontinuousTimeScaleProviderBuilder().inputDateAccessor(
    (d) => new Date(d.date)
  );

  const margin = { left: 0, right: 48, top: 0, bottom: 24 };
  let interactiveNodes = {};

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
  const chartHeight = gridHeight - barChartHeight - elderRayHeight;

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

    if ("Interactive" in state && state["Interactive"].length > 0) {
      textListRef.current = state["Interactive"];
      setTextList(state.Interactive);
      // updateTextList(state.Interactive)
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

    if (textListRef.current) {
      const newTextList = textListRef?.current?.filter((each) => {
        if (!("selected" in each)) return each;
        else if (!each.selected) {
          return each;
        }
      });

      textListRef.current = newTextList;
      setTextList(newTextList);
      // updateTextList(newTextList);
    }
  };

  const handleChoosePosition = (event, interactives, moreProps) => {
    const userInput = prompt("Enter text:");
    if (userInput !== null) {
      interactives["text"] = userInput;
      textListRef.current = [...textList, interactives];
      setTextList((prevState) => [...prevState, interactives]);
      // updateTextList([...textList, interactives]);
    }
  };

  const onDragComplete = (event, textList, moreProps) => {
    textListRef.current = textList;
    setTextList(textList);
  };

  const handleEditText = (node) => {
    const userInput = prompt("Enter text:", node["text"]);
    if (userInput !== null) {
      return userInput;
    }
    return node["text"];
  };

  const handleDoubleClick = (event, textList, moreProps) => {
    if (textListRef.current) {
      const newTextList = textListRef?.current?.filter((each) => {
        if (!("selected" in each) || !each.selected) return each;
        else {
          each["text"] = handleEditText(each);
          return each;
        }
      });

      textListRef.current = newTextList;
      setTextList(newTextList);
      // updateTextList(newTextList);
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

        {indicatorName === "ema" ? (
          <EMAChart ema26={ema26} ema12={ema12} />
        ) : (
          ""
        )}

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

        <InteractiveText
          ref={saveInteractiveNode("Interactive", 3)}
          enabled={textEnable}
          textList={textList}
          onChoosePosition={(e, interactiveText, moreProps) => {
            handleChoosePosition(e, interactiveText, moreProps);
            disableAllTools();
          }}
          onDoubleClick={handleDoubleClick}
          onDragComplete={onDragComplete}
          defaultText={{
            bgFill: "#FFF",
            bgOpacity: 1,
            bgStrokeWidth: 1,
            textFill: "#000",
            fontFamily:
              "-apple-system, system-ui, Roboto, 'Helvetica Neue', Ubuntu, sans-serif",
            fontSize: 12,
            fontStyle: "normal",
            fontWeight: "normal",
            text: "Dummy Text",
          }}
        />

        <Measurement
          ref={saveInteractiveNode("Measurement", 3)}
          enabled={measurementEnable}
          type={"2D"}
          onBrush={() => {}}
          fillStyle="#d9d9d9"
          interactiveState={{}}
        />

        <ZoomButtons />
        <OHLCTooltip origin={[8, 16]} />
      </Chart>

      {indicatorName === "rsi" ? (
        <Chart
          id={4}
          yExtents={[0, 100]}
          height={barChartHeight}
          origin={barChartOrigin}
        >
          <XAxis />
          <YAxis tickValues={[30, 50, 70]} />

          <RSIChart rsiYAccessor={rsiYAccessor} rsiCalculator={rsiCalculator} />
        </Chart>
      ) : (
        ""
      )}

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
    minHeight: 500,
  },
})(withDeviceRatio()(FinanceChart));
