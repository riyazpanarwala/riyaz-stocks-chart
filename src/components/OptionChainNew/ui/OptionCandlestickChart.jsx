"use client";

import React, { useMemo, useState, useEffect } from "react";
import { format } from "d3-format";
import { timeFormat } from "d3-time-format";
import { withDeviceRatio, withSize } from "@riyazpanarwala/utils";
import { discontinuousTimeScaleProviderBuilder } from "@riyazpanarwala/scales";
import {
  lastVisibleItemBasedZoomAnchor,
  Chart,
  ChartCanvas,
} from "@riyazpanarwala/core";
import {
  BarSeries,
  CandlestickSeries,
} from "@riyazpanarwala/series";
import {
  MouseCoordinateY,
  MouseCoordinateX,
  EdgeIndicator,
  CrossHairCursor,
} from "@riyazpanarwala/coordinates";
import { XAxis, YAxis } from "@riyazpanarwala/axes";
import { OHLCTooltip } from "@riyazpanarwala/tooltip";
import { C } from "../constants.js";

const pricesDisplayFormat = (val) => {
  if (val == null || !Number.isFinite(val)) return "";
  return `₹${val.toFixed(2)}`;
};

const volumeDisplayFormat = format(".2s");
const timeDisplayFormat = timeFormat("%d %b %H:%M");

function OptionCandlestickChartInner({
  candles = [],
  width,
  height,
  ratio = 1,
  optionType = "CE",
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Filter and sanitize candle data
  const cleanedData = useMemo(() => {
    if (!Array.isArray(candles) || candles.length === 0) return [];
    return candles
      .filter(
        (c) =>
          c &&
          c.date &&
          Number.isFinite(c.open) &&
          Number.isFinite(c.high) &&
          Number.isFinite(c.low) &&
          Number.isFinite(c.close) &&
          c.close > 0,
      )
      .map((c) => ({
        ...c,
        date: c.date instanceof Date ? c.date : new Date(c.date),
        open: Number(c.open),
        high: Number(c.high),
        low: Number(c.low),
        close: Number(c.close),
        volume: Number(c.volume || 0),
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [candles]);

  const { data, xScale, xAccessor, displayXAccessor } = useMemo(() => {
    if (!cleanedData.length) {
      return { data: [], xScale: null, xAccessor: null, displayXAccessor: null };
    }
    const scaleProvider = discontinuousTimeScaleProviderBuilder()
      .inputDateAccessor((d) => d.date);
    return scaleProvider(cleanedData);
  }, [cleanedData]);

  if (!mounted || !width || !height || width < 100 || height < 100 || !data || data.length === 0) {
    return (
      <div
        style={{
          width: "100%",
          height: height || 320,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: C.blue,
          fontSize: 12,
        }}
      >
        Initializing candlestick chart…
      </div>
    );
  }

  const margin = { left: 0, right: 65, top: 10, bottom: 24 };
  const gridHeight = Math.max(160, height - margin.top - margin.bottom);
  const volumeHeight = Math.round(gridHeight * 0.18);
  const candleHeight = gridHeight - volumeHeight;

  const max = xAccessor(data[data.length - 1]);
  const min = xAccessor(data[Math.max(0, data.length - Math.min(80, data.length))]);
  const xExtents = [min - 1, max + 4];

  const candleColor = (d) => (d.close >= d.open ? C.green : C.red);
  const volumeColor = (d) => (d.close >= d.open ? `${C.green}44` : `${C.red}44`);

  return (
    <ChartCanvas
      height={height}
      ratio={ratio}
      width={width}
      margin={margin}
      data={data}
      displayXAccessor={displayXAccessor}
      seriesName={`OptionPremium-${optionType}`}
      xScale={xScale}
      xAccessor={xAccessor}
      xExtents={xExtents}
      zoomAnchor={lastVisibleItemBasedZoomAnchor}
      style={{ background: "transparent" }}
    >
      {/* ── Sub-Chart 1: Volume BarSeries ── */}
      <Chart
        id={1}
        height={volumeHeight}
        origin={(w, h) => [0, h - volumeHeight]}
        yExtents={(d) => [0, d.volume || 1]}
        padding={{ top: 10, bottom: 0 }}
      >
        <YAxis
          axisAt="right"
          orient="right"
          ticks={2}
          tickFormat={volumeDisplayFormat}
          strokeStyle="transparent"
          tickStrokeStyle="transparent"
          tickLabelFill={`${C.muted}88`}
          fontSize={9}
          fontFamily="'IBM Plex Mono', monospace"
        />
        <BarSeries yAccessor={(d) => d.volume} fillStyle={volumeColor} />
      </Chart>

      {/* ── Sub-Chart 2: Main Candlestick Chart ── */}
      <Chart
        id={2}
        height={candleHeight}
        yExtents={(d) => [d.high * 1.008, d.low * 0.992]}
      >
        <XAxis
          showGridLines
          gridLinesStrokeStyle={`${C.border}66`}
          strokeStyle={C.border}
          tickStrokeStyle={C.border}
          tickLabelFill={C.muted}
          fontSize={10}
          fontFamily="'IBM Plex Mono', monospace"
        />
        <YAxis
          showGridLines
          gridLinesStrokeStyle={`${C.border}66`}
          strokeStyle={C.border}
          tickStrokeStyle={C.border}
          tickLabelFill={C.muted}
          tickFormat={pricesDisplayFormat}
          fontSize={10}
          fontFamily="'IBM Plex Mono', monospace"
        />

        <CandlestickSeries
          wickStroke={candleColor}
          fill={candleColor}
          stroke={candleColor}
          candleStrokeWidth={1}
        />

        <EdgeIndicator
          itemType="last"
          rectWidth={margin.right - 5}
          fill={candleColor}
          lineStroke={candleColor}
          displayFormat={pricesDisplayFormat}
          yAccessor={(d) => d.close}
          textFill="#ffffff"
          fontSize={10}
          fontFamily="'IBM Plex Mono', monospace"
        />

        <MouseCoordinateY
          rectWidth={margin.right - 5}
          displayFormat={pricesDisplayFormat}
          fill={C.surface}
          stroke={C.blue}
          textFill={C.text}
          fontSize={10}
          fontFamily="'IBM Plex Mono', monospace"
        />

        <MouseCoordinateX
          displayFormat={timeDisplayFormat}
          fill={C.surface}
          stroke={C.blue}
          textFill={C.text}
          fontSize={10}
          fontFamily="'IBM Plex Mono', monospace"
        />

        <OHLCTooltip
          origin={[8, 12]}
          textFill={C.text}
          labelFill={C.muted}
          fontSize={11}
          fontFamily="'IBM Plex Mono', monospace"
          ohlcFormat={pricesDisplayFormat}
        />
      </Chart>

      {/* ── CrossHair Cursor ── */}
      <CrossHairCursor
        strokeStyle={`${C.muted}99`}
        strokeDasharray="ShortDash"
      />
    </ChartCanvas>
  );
}

const OptionCandlestickChart = withSize({
  style: { minHeight: 330, width: "100%", height: "100%" },
})(withDeviceRatio()(OptionCandlestickChartInner));

export default OptionCandlestickChart;
