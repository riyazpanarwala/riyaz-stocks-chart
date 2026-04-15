"use client";
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
  ZoomButtons,
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
import BolingerChart from "./BolingerChart";
import MACrossOverChart from "./MACrossOverChart";
import technicalAnalysis from "../technical-analysis/index.js";
import { useThemeColors } from "./useThemeColors";
const { analyzeMarketStructure } = technicalAnalysis;

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
  bolinger: (d) => [d.high, d.low],
  cci: (d) => [0, d.cci + 20],
  "5-20-sma": (d) => [d.high, d.low],
  "20-50-sma": (d) => [d.high, d.low],
  "50-200-sma": (d) => [d.high, d.low],
};

const FinanceChart = ({
  isDisplayHrAndTime,
  isHistoricalMinutes,
  isHistoricalHours,
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
  const [isMobile, setIsMobile] = useState(false);
  const trendLineRef = useRef(trendLines);
  const textListRef = useRef(textList);
  const DARK = useThemeColors();
  const {
    calculatedData, ema12, ema26, rsiCalculator, rsiYAccessor,
    angles, macdCalculator, sma20, sma50, sma200, bb, ema5, ema8, ema13, ma1, ma2,
  } = useData(initialData, indicatorName, isIntraday);

  // Fix: never read window during render — that crashes SSR/static export.
  // Initialise to false and update after the component mounts in the browser.
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const ScaleProvider = discontinuousTimeScaleProviderBuilder()
    .inputDateAccessor((d) => new Date(d.date));

  const margin = { left: 0, right: 52, top: 0, bottom: 24 };
  let interactiveNodes = {};

  const { data, xScale, xAccessor, displayXAccessor } = ScaleProvider(calculatedData);

  const pricesDisplayFormat = format(".2f");
  const max = xAccessor(data[data.length - 1]);
  let min = 0;
  if (isHistoricalMinutes) {
    min = xAccessor(data[Math.max(0, data.length - 100)]);
  } else if (isHistoricalHours) {
    min = xAccessor(data[Math.max(0, data.length - 200)]);
  }
  const xExtents = [min - 5, max + 5];

  const gridHeight = height - margin.top - margin.bottom;
  const elderRayHeight = 0;
  const barChartHeight = gridHeight / 4;
  const barChartOrigin = (_, h) => [0, h - barChartHeight - elderRayHeight];
  const chartHeight = gridHeight - barChartHeight - elderRayHeight;

  /* ── Accessors ── */
  const barChartExtents = (d) => d.volume;
  const candleChartExtents = (d) => {
    let high = d.high, low = d.low;
    if (d.bb && indicatorName === "bolinger") { high = d.bb.top; low = d.bb.bottom; }
    else if (d.trend && indicatorName === "supertrend") {
      high = Math.max(high, d.trend);
      low = Math.min(low, d.trend);
    }
    return [high + (high * 0.1) / 100, low - (low * 0.1) / 100];
  };
  const yEdgeIndicator = (d) => d.close;
  const volumeColor = (d) => d.close > d.open ? DARK.volBull : DARK.volBear;
  const volumeSeries = (d) => d.volume;
  const openCloseColor = (d) => d.close > d.open ? DARK.bull : DARK.bear;

  /* ── Interaction handlers ── */
  const handleSelection = (e, interactives, moreProps) => {
    const state = toObject(interactives, (each) => [each.type, each.objects]);
    if ("Trendline" in state && state["Trendline"].length > 0) {
      trendLineRef.current = state["Trendline"];
      setTrendLines(state.Trendline);
    }
    if ("Interactive" in state && state["Interactive"].length > 0) {
      textListRef.current = state["Interactive"];
      setTextList(state.Interactive);
    }
  };

  const saveInteractiveNode = (type, chartId) => (node) => {
    const key = `${type}_${chartId}`;
    if (isDefined(node) || isNotDefined(interactiveNodes[key])) {
      interactiveNodes = { ...interactiveNodes, [key]: { type, chartId, node } };
    }
    return interactiveNodes;
  };

  const handleDelete = () => {
    if (trendLineRef.current) {
      const n = trendLineRef.current.filter((e) => !e.selected);
      trendLineRef.current = n;
      setTrendLines(n);
    }
    if (textListRef.current) {
      const n = textListRef.current.filter((e) => !("selected" in e) || !e.selected);
      textListRef.current = n;
      setTextList(n);
    }
    handleRiskRewardDelete();
    handleCircleDelete();
    handleRectDelete();
  };

  const handleChoosePosition = (event, interactives) => {
    const userInput = prompt("Enter text:");
    if (userInput !== null) {
      interactives["text"] = userInput;
      textListRef.current = [...textList, interactives];
      setTextList((p) => [...p, interactives]);
    }
  };

  const onDragComplete = (event, tl) => { textListRef.current = tl; setTextList(tl); };
  const handleDoubleClick = (event, tl) => {
    if (textListRef.current) {
      const n = textListRef.current.map((e) => {
        if ("selected" in e && e.selected) {
          const v = prompt("Enter text:", e["text"]);
          if (v !== null) e["text"] = v;
        }
        return e;
      });
      textListRef.current = n; setTextList(n);
    }
  };

  const onDelete = (id) => setLongPositionArr(longPositionArr.filter((v) => v.id !== id));
  const handleRiskRewardDelete = () => setLongPositionArr((p) => p.filter((v) => !v.selected));
  const handleCircleDelete = () => setCircles((p) => p.filter((v) => !v.selected));
  const handleRectDelete = () => setRectangles((p) => p.filter((v) => !v.selected));

  const onChangeCircle = (c) => setCircles((p) => p.map((x) => (x.id === c.id ? c : x)));
  const onChangeCircle1 = (id, e) => setCircles((p) => p.map((x) => (x.id === id ? { ...x, selected: e } : x)));
  const onChangeRectangles = (id, e) => setRectangles((p) => p.map((x) => (x.id === id ? { ...x, selected: e } : x)));
  const onWholeDragCompleteRect = (r) => setRectangles((p) => p.map((x) => (x.id === r.id ? r : x)));

  const onSelected = (isSel, mainId) =>
    setLongPositionArr((p) => p.map((v) => (v.id === mainId ? { ...v, selected: isSel } : v)));

  const onKeyPress = (e) => {
    if (e.which === 46) handleDelete();
    if (e.which === 27) disableAllTools();
  };

  useEffect(() => {
    document.addEventListener("keyup", onKeyPress);
    return () => document.removeEventListener("keyup", onKeyPress);
  }, []);

  useEffect(() => {
    if (breakoutName && Array.isArray(initialData) && initialData.length > 0) {
      const d = analyzeMarketStructure(initialData);
      console.log(d);
    }
  }, [initialData, breakoutName]);

  /* ── Mouse coordinate edge style ── */
  const mouseEdge = {
    textFill: DARK.mouseText,
    stroke: DARK.edgeStroke,
    strokeOpacity: 1,
    strokeWidth: 1,
    arrowWidth: 4,
    fill: DARK.edgeFill,
  };

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
      style={{ background: DARK.bg }}
    >
      {/* ── Volume bars ── */}
      <Chart
        id={2}
        height={barChartHeight}
        origin={barChartOrigin}
        yExtents={barChartExtents}
      >
        <BarSeries fillStyle={volumeColor} yAccessor={volumeSeries} />
      </Chart>

      {/* ── Main candle chart ── */}
      <Chart id={3} height={chartHeight} yExtents={candleChartExtents}>

        <XAxis
          showGridLines
          gridLinesStrokeStyle={DARK.gridLine}
          strokeStyle={DARK.axis}
          tickStrokeStyle={DARK.axis}
          tickLabelFill={DARK.axisLabel}
          fontFamily="DM Mono, JetBrains Mono, monospace"
          fontSize={10}
        />
        <YAxis
          showGridLines
          gridLinesStrokeStyle={DARK.gridLine}
          strokeStyle={DARK.axis}
          tickStrokeStyle={DARK.axis}
          tickLabelFill={DARK.axisLabel}
          tickFormat={pricesDisplayFormat}
          fontFamily="DM Mono, JetBrains Mono, monospace"
          fontSize={10}
        />

        <CandlestickSeries
          wickStroke={openCloseColor}
          fill={openCloseColor}
          stroke={openCloseColor}
          candleStrokeWidth={0.5}
        />

        {breakoutName ? (
          <Breakout patternName={breakoutName} data={initialData} isIntraday={isIntraday} />
        ) : ""}

        {patternName ? (
          <PatternChart patternName={patternName} data={initialData} isIntraday={isIntraday} />
        ) : ""}

        <MouseCoordinateY
          rectWidth={margin.right}
          displayFormat={pricesDisplayFormat}
          fill={DARK.edgeFill}
          stroke={DARK.edgeStroke}
          textFill={DARK.edgeText}
          fontSize={10}
        />
        <MouseCoordinateX
          rectWidth={margin.top}
          displayFormat={timeFormat(
            isIntraday || isDisplayHrAndTime ? "%Y-%m-%d %H:%M" : "%Y-%m-%d"
          )}
          fill={DARK.edgeFill}
          stroke={DARK.edgeStroke}
          textFill={DARK.edgeText}
          fontSize={10}
        />

        <EdgeIndicator
          itemType="last"
          rectWidth={margin.right}
          fill={openCloseColor}
          lineStroke={openCloseColor}
          displayFormat={pricesDisplayFormat}
          yAccessor={yEdgeIndicator}
          textFill="#ffffff"
          fontSize={10}
          fontFamily="DM Mono, monospace"
        />

        <TrendLine
          ref={saveInteractiveNode("Trendline", 3)}
          trends={trendLines}
          enabled={trendLineEnable}
          type="LINE"
          snap={false}
          onComplete={(e, newTrends) => {
            trendLineRef.current = newTrends;
            setTrendLines([...newTrends]);
            disableAllTools();
          }}
          appearance={{
            strokeStyle: DARK.edgeStroke,           // was "#00cff7"
            strokeWidth: 1.5,
            strokeDasharray: "Solid",
            edgeStrokeWidth: 1,
            edgeFill: DARK.surface3,            // was "#1f2436"
            edgeStroke: DARK.edgeStroke,            // was "#00cff7"
          }}
        />

        <InteractiveText
          ref={saveInteractiveNode("Interactive", 3)}
          enabled={textEnable}
          textList={textList}
          onChoosePosition={(e, it) => { handleChoosePosition(e, it); disableAllTools(); }}
          onDoubleClick={handleDoubleClick}
          onDragComplete={onDragComplete}
          defaultText={{
            bgFill: DARK.surface3,               // was "#1f2436"
            bgOpacity: 0.92,
            bgStrokeWidth: 1,
            textFill: DARK.tx_primary,          // was "#d8dce8"
            fontFamily: "DM Sans, system-ui, sans-serif",
            fontSize: 12,
            fontStyle: "normal",
            fontWeight: "normal",
            text: "Label",
          }}
        />

        <Measurement
          ref={saveInteractiveNode("Measurement", 3)}
          enabled={measurementEnable}
          type={"2D"}
          onBrush={() => { }}
          fillStyle={DARK.accentSoft}           // was "rgba(0,207,247,0.08)"
          interactiveState={{}}
        />

        {positionName && (
          <ClickCallback
            onClick={(e, moreProps) => {
              const { mouseXY, chartConfig, xScale } = moreProps;
              const [mouseX, mouseY] = mouseXY;
              const yValue = chartConfig.yScale.invert(mouseY);
              let percent = 2;
              let targetVal = yValue + (yValue * percent) / 100;
              let stopLoss = yValue - (yValue * percent) / 100;
              const width = 200;
              const [yMin, yHigh] = chartConfig.realYDomain;
              if (targetVal > yHigh || stopLoss < yMin) {
                if (yHigh - yValue > yValue - yMin) {
                  stopLoss = yMin;
                  percent = (((yValue - stopLoss) * 100) / yValue).toFixed(2);
                  targetVal = yValue + (yValue * percent) / 100;
                } else {
                  targetVal = yHigh;
                  percent = (((targetVal - yValue) * 100) / yValue).toFixed(2);
                  stopLoss = yValue - (yValue * percent) / 100;
                }
              }
              setLongPositionArr((p) => [
                ...p,
                {
                  currentVal: yValue, targetVal, stopLossVal: stopLoss,
                  xValue: xScale.invert(mouseX), x1Value: xScale.invert(mouseX),
                  x2Value: xScale.invert(mouseX + width), percent,
                  id: Math.random().toString(16).slice(2),
                  isShortPosition: positionName === "short",
                  selected: true,
                },
              ]);
              disableAllTools();
            }}
          />
        )}

        {longPositionArr.map((v) => (
          <LongPosition
            key={v.id}
            saveInteractiveNode={saveInteractiveNode}
            currentObj={v}
            onDeleteMain={onDelete}
            isPriceObj={true}
            isEnabled={!!positionName}
            onSelected={onSelected}
          />
        ))}

        {shapeName && (
          <ClickCallback
            onClick={(e, moreProps) => {
              const { mouseXY, xScale, chartConfig } = moreProps;
              const [mouseX, mouseY] = mouseXY;
              const xValue = xScale.invert(mouseX);
              const yValue = chartConfig.yScale.invert(mouseY);
              if (shapeName === "circle") {
                const radius = 50;
                setCircles((p) => [
                  ...p,
                  {
                    id: Math.random().toString(16).slice(2),
                    x: xValue, y: yValue, x1: xScale.invert(mouseX + radius),
                    radius,
                    color: DARK.accentSoft,              // was "rgba(0,207,247,0.18)"
                    strokeStyle: DARK.edgeStroke,            // was "#00cff7"
                    lineWidth: 1, selected: true,
                  },
                ]);
              } else if (shapeName === "rectangle") {
                const w = 200, h = 100;
                setRectangles((p) => [
                  ...p,
                  {
                    id: Math.random().toString(16).slice(2),
                    x1: xValue, y1: yValue,
                    x2: xScale.invert(mouseX + w),
                    y2: chartConfig.yScale.invert(mouseY + h),
                    color: DARK.accentSoft,               // was "rgba(0,207,247,0.12)"
                    lineWidth: 1,
                    selected: true,
                    strokeStyle: DARK.edgeStroke,             // was "#00cff7"
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

        {indicatorName === "ema" && isAngleEnabled ? <AngleCalculator enabled /> : ""}

        {(indicatorName === "macd" || indicatorName === "zerolagmacd") ? (
          <EMAChart emaArr={[{ id: "ema12", val: ema12 }, { id: "ema26", val: ema26 }]} isIntraday={isIntraday} />
        ) : ""}

        {indicatorName === "sma" ? (
          <SMAChart smaArr={[{ id: "sma50", val: sma50 }, { id: "sma200", val: sma200 }]} isIntraday={isIntraday} />
        ) : ""}

        {indicatorName === "ema" ? (
          <EMAChart
            emaArr={isIntraday
              ? [{ id: "ema5", val: ema5 }, { id: "ema13", val: ema13 }]
              : [{ id: "ema12", val: ema12 }, { id: "ema26", val: ema26 }]
            }
            angles={angles}
            isIntraday={isIntraday}
          />
        ) : ""}

        {indicatorName === "supertrend" ? <SuperTrendChart /> : ""}
        {indicatorName === "bolinger" ? <BolingerChart bb={bb} sma20={sma20} /> : ""}

        {["5-20-sma", "20-50-sma", "50-200-sma"].includes(indicatorName) ? (
          <MACrossOverChart ma1={ma1} ma2={ma2} indicatorName={indicatorName} isIntraday={isIntraday} />
        ) : ""}

        {/* Fix: isMobile state (set after mount) replaces the direct
            window.innerWidth call that crashed Next.js SSR/static builds */}
        {isMobile ? <ZoomButtons /> : ""}

        <OHLCTooltip
          origin={[8, 16]}
          labelFill={DARK.axisLabel}
          textFill={DARK.tx_primary}
          fontSize={11}
          fontFamily="DM Mono, monospace"
        />
        {isIntraday ? <HighLowTooltip origin={[8, 32]} ohlcData={initialData} /> : ""}
      </Chart>

      {/* ── Sub-chart (indicator panel) ── */}
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
          <XAxis
            strokeStyle={DARK.axis}
            tickStrokeStyle={DARK.axis}
            tickLabelFill={DARK.axisLabel}
            fontFamily="DM Mono, monospace"
            fontSize={10}
          />

          {indicatorName === "rsi" ? (
            <YAxis tickValues={[30, 50, 70]} tickLabelFill={DARK.axisLabel} tickStrokeStyle={DARK.axis} strokeStyle={DARK.axis} fontSize={10} fontFamily="DM Mono, monospace" />
          ) : indicatorName === "mfi" ? (
            <YAxis tickValues={[20, 50, 80]} tickLabelFill={DARK.axisLabel} tickStrokeStyle={DARK.axis} strokeStyle={DARK.axis} fontSize={10} fontFamily="DM Mono, monospace" />
          ) : (
            <YAxis tickLabelFill={DARK.axisLabel} tickStrokeStyle={DARK.axis} strokeStyle={DARK.axis} fontSize={10} fontFamily="DM Mono, monospace" />
          )}

          {indicatorName === "rsi" ? <RSIChart data={initialData} rsiYAccessor={rsiYAccessor} rsiCalculator={rsiCalculator} /> : ""}
          {indicatorName === "sto" ? <STOChart /> : ""}
          {indicatorName === "mfi" ? <IndicatorChart keyVal="mfi" tooltipName={indicatorName} /> : ""}
          {indicatorName === "cci" ? <IndicatorChart keyVal="cci" tooltipName={indicatorName} /> : ""}
          {indicatorName === "obv" ? (
            <>
              <LineSeries yAccessor={(d) => d.obv} stroke={DARK.indicator} />
              <CurrentCoordinate yAccessor={(d) => d.obv} fillStyle={DARK.indicator} />
              <CustomTooltip origin={[8, 32]} yAccessor={(d) => d.obv} displayFormat={format(".2s")} tooltipName="OBV" />
            </>
          ) : ""}
          {indicatorName === "dmi" ? <DMI /> : ""}
          {indicatorName === "macd" || indicatorName === "zerolagmacd"
            ? <MACDChart macdCalculator={macdCalculator} /> : ""}
        </Chart>
      ) : ""}

      {/* ── Crosshair ── */}
      <CrossHairCursor
        strokeStyle={DARK.crosshair}
        strokeDasharray="ShortDash"
      />

      <DrawingObjectSelector
        enabled={true}
        getInteractiveNodes={() => interactiveNodes}
        drawingObjectMap={{ Trendline: "trends", Interactive: "textList" }}
        onSelect={handleSelection}
      />
    </ChartCanvas>
  );
};

export default withSize({ style: { minHeight: 600 } })(withDeviceRatio()(FinanceChart));
