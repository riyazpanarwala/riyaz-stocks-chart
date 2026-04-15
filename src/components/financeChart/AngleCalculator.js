import React, { useState, useEffect } from "react";
import { getMouseCanvas, GenericChartComponent } from "@riyazpanarwala/core";
import { emaAngleIndividual } from "./indicator";
import { useThemeColors } from "./useThemeColors";

const AngleCalculator = ({ enabled }) => {
  const [rect, setRect] = useState(null);
  const [x1y1, setX1y1] = useState(null);
  const [start, setStart] = useState(null);
  const [end, setEnd] = useState(null);
  const [isComplete, setComplete] = useState(false);
  const DARK = useThemeColors();

  const terminate = () => {
    setX1y1(null);
    setStart(null);
    setEnd(null);
    setRect(null);
  };

  const drawOnCanvas = (ctx, moreProps) => {
    if (rect === null) return;

    const { x1, x2, y1, y2 } = rect;

    ctx.strokeStyle = DARK.angleStroke;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    const { plotData } = moreProps;
    const endIdx = end.item.idx.index;
    const startIdx = start.item.idx.index;
    const barCount = Math.abs(endIdx - startIdx);
    const angle = emaAngleIndividual(plotData, startIdx, endIdx, "ema12", "ema26");

    ctx.fillStyle = DARK.angleText;
    ctx.font = "13px 'DM Mono', monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
      `angle : ${angle.toFixed(2)} (${barCount} bars)`,
      (x1 + x2) / 2,
      (y1 + y2 + 30) / 2
    );
  };

  const handleZoomStart = (_, moreProps) => {
    const { mouseXY: [, mouseY], currentItem, xAccessor, xScale } = moreProps;
    setX1y1([xScale(xAccessor(currentItem)), mouseY]);
    setStart({ item: currentItem });
  };

  const handleDrawSquare = (_, moreProps) => {
    if (x1y1 == null || isComplete) return;

    const { mouseXY: [, mouseY], currentItem, xAccessor, xScale } = moreProps;
    const [x2, y2] = [xScale(xAccessor(currentItem)), mouseY];
    const [x1, y1] = x1y1;

    setEnd({ item: currentItem });
    setRect({ x1, x2, y1, y2 });
  };

  const handleZoomComplete = () => {
    setComplete((prev) => !prev);
  };

  useEffect(() => {
    if (!isComplete) terminate();
  }, [isComplete]);

  if (!enabled) return null;

  return (
    <GenericChartComponent
      disablePan={enabled}
      canvasToDraw={getMouseCanvas}
      canvasDraw={drawOnCanvas}
      onMouseDown={handleZoomStart}
      onMouseMove={handleDrawSquare}
      onClick={handleZoomComplete}
      drawOn={["mousemove", "pan", "drag"]}
    />
  );
};

export default AngleCalculator;
