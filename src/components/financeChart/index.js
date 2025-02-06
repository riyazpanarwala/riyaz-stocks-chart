import React, { useState, useRef, useEffect } from "react";
import { format } from "d3-format";
import { timeFormat } from "d3-time-format";
import { withDeviceRatio, withSize } from "@riyazpanarwala/utils";
import { discontinuousTimeScaleProviderBuilder } from "@riyazpanarwala/scales";
import {
  isDefined,
  isNotDefined,
  lastVisibleItemBasedZoomAnchor,
  Chart,
  ChartCanvas,
} from "@riyazpanarwala/core";
import {
  BarSeries,
  LineSeries,
  CandlestickSeries,
} from "@riyazpanarwala/series";
import {
  CurrentCoordinate,
  MouseCoordinateY,
  MouseCoordinateX,
  EdgeIndicator,
  CrossHairCursor,
} from "@riyazpanarwala/coordinates";
import { XAxis, YAxis } from "@riyazpanarwala/axes";
import { OHLCTooltip } from "@riyazpanarwala/tooltip";
import {
  TrendLine,
  Measurement,
  InteractiveText,
  DrawingObjectSelector,
  ClickCallback,
  //  ZoomButtons,
} from "@riyazpanarwala/interactive";
import HighLowTooltip from "./HighLowTooltip";
import EMAChart from "./ema";
import RSIChart from "./RSI";
import useData from "./useData";
import toObject from "../utils/toObject";
import LongPosition from "./LongPosition";
import CustomShapeCircle from "./Circle/index";
import CustomShapeRectangle from "./Rectangle/index";
import AngleCalculator from "./AngleCalculator";
import CustomTooltip from "./CustomTooltip";
import Breakout from "./Breakout";
import DMI from "./DMI";
import MACDChart from "./MACDChart";
import SMAChart from "./SMAChart";
import PatternChart from "./PatternChart";
import SuperTrendChart from "./SuperTrendChart";
import IndicatorChart from "./IndicatorChart";
import STOChart from "./STOChart";

const indicatorYExtentsObj = {
  sma: (d) => [d.high, d.low],
  ema: (d) => [d.high, d.low],
  rsi: (d) => [0, 100],
  sto: (d) => [0, 100],
  obv: (d) => [0, d.obv],
  dmi: (d) => [d.plusDI + 10, d.minusDI - 10, d.adx + 10],
  macd: (d) => [d.high, d.low],
  supertrend: (d) => [d.high, d.low],
  mfi: (d) => [0, 100],
};

const FinanceChart = ({
  isIntraday,
  initialData,
  trendLineEnable,
  measurementEnable,
  textEnable,
  disableAllTools,
  width,
  height,
  ratio,
  indicatorName,
  positionName,
  shapeName,
  isAngleEnabled,
  breakoutName,
  patternName,
}) => {
  const [trendLines, setTrendLines] = useState([]);
  const [textList, setTextList] = useState([]);
  const [longPositionArr, setLongPositionArr] = useState([]);
  const [circles, setCircles] = useState([]);
  const [rectangles, setRectangles] = useState([]);
  const trendLineRef = useRef(trendLines);
  const textListRef = useRef(textList);
  const {
    calculatedData,
    ema12,
    ema26,
    rsiCalculator,
    rsiYAccessor,
    angles,
    macdCalculator,
    sma20,
    sma50,
    sma200,
  } = useData(initialData, indicatorName);
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
  const min = 0; // xAccessor(data[Math.max(0, data.length - 100)]);
  const xExtents = [min - 5, max + 5];

  const gridHeight = height - margin.top - margin.bottom;

  const elderRayHeight = 0;
  const barChartHeight = gridHeight / 4;
  const barChartOrigin = (_, h) => [0, h - barChartHeight - elderRayHeight];
  const chartHeight = gridHeight - barChartHeight - elderRayHeight;

  const barChartExtents = (data) => {
    return data.volume;
  };

  const candleChartExtents = (data) => {
    return [data.high + (data.high * 0.1) / 100, data.low];
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

    handleRiskRewardDelete();

    handleCircleDelete();

    handleRectDelete();
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

  const onDelete = (id) => {
    // dont use prevState here
    setLongPositionArr(longPositionArr.filter((v) => v.id !== id));
  };

  const handleRiskRewardDelete = () => {
    setLongPositionArr((prevState) => prevState.filter((v) => !v.selected));
  };

  const handleCircleDelete = () => {
    setCircles((prevState) => prevState.filter((v) => !v.selected));
  };

  const handleRectDelete = () => {
    setRectangles((prevState) => prevState.filter((v) => !v.selected));
  };

  const onChangeCircle = (newCircle) => {
    setCircles((prevCircles) =>
      prevCircles.map((circle) => {
        if (newCircle.id === circle.id) {
          return newCircle;
        }
        return circle;
      })
    );
  };

  const onChangeCircle1 = (id, isEnable) => {
    setCircles((prevCircles) =>
      prevCircles.map((circle) => {
        if (id === circle.id) {
          return { ...circle, selected: isEnable };
        }
        return circle;
      })
    );
  };

  const onChangeRectangles = (id, isEnable) => {
    setRectangles((rects) =>
      rects.map((rect) => {
        if (rect.id === id) {
          return { ...rect, selected: isEnable };
        }
        return rect;
      })
    );
  };

  const onWholeDragCompleteRect = (newRect) => {
    setRectangles((rects) =>
      rects.map((rect) => {
        if (rect.id === newRect.id) {
          return newRect;
        }
        return rect;
      })
    );
  };

  const onSelected = (isSelected, mainId) => {
    setLongPositionArr((prevState) =>
      prevState.map((v) => {
        if (v.id === mainId) {
          return { ...v, selected: isSelected };
        }
        return v;
      })
    );
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
      ratio={ratio}
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

        {breakoutName ? (
          <Breakout
            patternName={breakoutName}
            data={initialData}
            isIntraday={isIntraday}
          />
        ) : (
          ""
        )}

        {patternName ? (
          <PatternChart
            patternName={patternName}
            data={initialData}
            isIntraday={isIntraday}
          />
        ) : (
          ""
        )}

        <MouseCoordinateY
          rectWidth={margin.right}
          displayFormat={pricesDisplayFormat}
        />
        <MouseCoordinateX
          rectWidth={margin.top}
          displayFormat={timeFormat(isIntraday ? "%Y-%m-%d %H:%M" : "%Y-%m-%d")}
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

        {positionName && (
          <>
            <ClickCallback
              onClick={(e, moreProps) => {
                const { mouseXY, chartConfig, xScale } = moreProps;
                const [mouseX, mouseY] = mouseXY; // Extract the Y-coordinate of the mouse
                const yValue = chartConfig.yScale.invert(mouseY); // Convert pixel value to data value

                let percent = 2;
                let targetValue = yValue + (yValue * percent) / 100;
                let stopLossValue = yValue - (yValue * percent) / 100;
                const width = 200;

                const [yMin, yHigh] = chartConfig.realYDomain;
                if (targetValue > yHigh || stopLossValue < yMin) {
                  if (yHigh - yValue > yValue - yMin) {
                    stopLossValue = yMin;
                    percent = (
                      ((yValue - stopLossValue) * 100) /
                      yValue
                    ).toFixed(2);
                    targetValue = yValue + (yValue * percent) / 100;
                  } else {
                    targetValue = yHigh;
                    percent = (((targetValue - yValue) * 100) / yValue).toFixed(
                      2
                    );
                    stopLossValue = yValue - (yValue * percent) / 100;
                  }
                }

                setLongPositionArr((prevState) => [
                  ...prevState,
                  {
                    currentVal: yValue,
                    targetVal: targetValue,
                    stopLossVal: stopLossValue,
                    xValue: xScale.invert(mouseX),
                    x1Value: xScale.invert(mouseX),
                    x2Value: xScale.invert(mouseX + width),
                    percent,
                    id: Math.random().toString(16).slice(2),
                    isShortPosition: positionName === "short",
                    selected: true,
                  },
                ]);
                disableAllTools();
              }}
            />
          </>
        )}

        {longPositionArr.map((v) => {
          return (
            <LongPosition
              saveInteractiveNode={saveInteractiveNode}
              currentObj={v}
              key={v.id}
              onDeleteMain={onDelete}
              isPriceObj={true}
              isEnabled={!!positionName}
              onSelected={onSelected}
            />
          );
        })}

        {shapeName && (
          <ClickCallback
            onClick={(e, moreProps) => {
              const { mouseXY, xScale, chartConfig } = moreProps;
              const [mouseX, mouseY] = mouseXY;
              const xValue = xScale.invert(mouseX); // Convert pixel to date
              const yValue = chartConfig.yScale.invert(mouseY); // Convert pixel to value

              if (shapeName === "circle") {
                const radius = 50;
                setCircles((prevCircles) => [
                  ...prevCircles,
                  {
                    id: Math.random().toString(16).slice(2),
                    x: xValue,
                    y: yValue,
                    x1: xScale.invert(mouseX + radius),
                    radius: radius,
                    color: "rgb(0, 0, 0, 0.3)",
                    strokeStyle: "#000",
                    lineWidth: 1,
                    selected: true,
                  },
                ]);
              } else if (shapeName === "rectangle") {
                const width = 200;
                const height = 100;
                setRectangles((prevRec) => [
                  ...prevRec,
                  {
                    id: Math.random().toString(16).slice(2),
                    x1: xValue,
                    y1: yValue,
                    x2: xScale.invert(mouseX + width),
                    y2: chartConfig.yScale.invert(mouseY + height),
                    color: "rgba(70, 130, 180, 0.5)",
                    lineWidth: 1,
                    selected: true,
                    strokeStyle: "steelblue",
                  },
                ]);
              }

              disableAllTools();
            }}
          />
        )}

        <CustomShapeCircle
          circles={circles}
          onCircleWholeDragComplete={onChangeCircle}
          onMouseDownClick={onChangeCircle1}
        />

        <CustomShapeRectangle
          rectangles={rectangles}
          onWholeDragCompleteRect={onWholeDragCompleteRect}
          onMouseDownClick={onChangeRectangles}
        />

        {indicatorName === "ema" && isAngleEnabled ? (
          <AngleCalculator enabled />
        ) : (
          ""
        )}

        {indicatorName === "macd" || indicatorName === "zerolagmacd" ? (
          <EMAChart ema26={ema26} ema12={ema12} />
        ) : (
          ""
        )}

        {indicatorName === "sma" ? (
          <SMAChart
            smaArr={[
              { id: "sma50", val: sma50 },
              { id: "sma200", val: sma200 },
            ]}
            isIntraday={isIntraday}
          />
        ) : (
          ""
        )}

        {indicatorName === "ema" ? (
          <EMAChart ema26={ema26} ema12={ema12} angles={angles} />
        ) : (
          ""
        )}

        {indicatorName === "supertrend" ? <SuperTrendChart /> : ""}

        {/* <ZoomButtons /> */}
        <OHLCTooltip origin={[8, 16]} />
        {isIntraday ? (
          <HighLowTooltip origin={[8, 32]} ohlcData={initialData} />
        ) : (
          ""
        )}
      </Chart>

      {indicatorName ? (
        <Chart
          id={4}
          yExtents={
            indicatorName === "macd" || indicatorName === "zerolagmacd"
              ? (d) => d.macd
              : indicatorYExtentsObj[indicatorName]
          }
          height={barChartHeight}
          origin={barChartOrigin}
        >
          <XAxis />

          {indicatorName === "rsi" ? (
            <YAxis tickValues={[30, 50, 70]} />
          ) : indicatorName === "mfi" ? (
            <YAxis tickValues={[20, 50, 80]} />
          ) : (
            <YAxis />
          )}

          {indicatorName === "rsi" ? (
            <RSIChart
              rsiYAccessor={rsiYAccessor}
              rsiCalculator={rsiCalculator}
            />
          ) : (
            ""
          )}

          {indicatorName === "sto" ? <STOChart /> : ""}

          {indicatorName === "mfi" ? (
            <IndicatorChart keyVal="mfi" tooltipName={indicatorName} />
          ) : (
            ""
          )}

          {indicatorName === "obv" ? (
            <>
              <LineSeries yAccessor={(d) => d.obv} stroke="#4682B4" />
              <CurrentCoordinate
                yAccessor={(d) => d.obv}
                fillStyle={"#4682B4"}
              />

              <CustomTooltip
                origin={[8, 32]}
                yAccessor={(d) => d.obv}
                displayFormat={format(".2s")}
                tooltipName="OBV"
              />
            </>
          ) : (
            ""
          )}

          {indicatorName === "dmi" ? <DMI /> : ""}

          {indicatorName === "macd" || indicatorName === "zerolagmacd" ? (
            <MACDChart macdCalculator={macdCalculator} />
          ) : (
            ""
          )}
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
    minHeight: 550,
  },
})(withDeviceRatio()(FinanceChart));
