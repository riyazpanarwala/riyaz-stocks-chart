import React, { useState, useEffect } from "react";
import { getMouseCanvas, GenericChartComponent } from "react-financial-charts";
import { emaAngleIndividual } from "./indicator";

const AngleCalculator = ({
  enabled,
  strokeStyle = "#000000",
  strokeOpacity = 1,
  textFillStyle = "#000000",
}) => {
  const [rect, setRect] = useState(null);
  const [x1y1, setX1y1] = useState(null);
  const [start, setStart] = useState(null);
  const [end, setEnd] = useState(null);
  const [isComplete, setComplete] = useState(false);

  const terminate = () => {
    setX1y1(null);
    setStart(null);
    setEnd(null);
    setRect(null);
  };

  const hexToRGBA = (inputHex, opacity) => {
    const hex = inputHex.replace("#", "");
    if (inputHex.indexOf("#") > -1 && (hex.length === 3 || hex.length === 6)) {
      const multiplier = hex.length === 3 ? 1 : 2;

      const r = parseInt(hex.substring(0, 1 * multiplier), 16);
      const g = parseInt(hex.substring(1 * multiplier, 2 * multiplier), 16);
      const b = parseInt(hex.substring(2 * multiplier, 3 * multiplier), 16);

      const result = `rgba(${r}, ${g}, ${b}, ${opacity})`;

      return result;
    }
    return inputHex;
  };

  const drawOnCanvas = (ctx, moreProps) => {
    if (rect === null) {
      return;
    }

    const { x1, x2, y1, y2 } = rect;

    ctx.strokeStyle = hexToRGBA(strokeStyle, strokeOpacity);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    const { plotData } = moreProps;
    const endIdx = end.item.idx.index;
    const startIdx = start.item.idx.index;
    const barCount = Math.abs(endIdx - startIdx);
    const angle = emaAngleIndividual(
      plotData,
      startIdx,
      endIdx,
      "ema12",
      "ema26"
    );

    ctx.fillStyle = textFillStyle;
    ctx.font = "16px sans serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
      `angle : ${angle.toFixed(2)} (${barCount} bars)`,
      (x1 + x2) / 2,
      (y1 + y2 + 30) / 2
    );
  };

  const handleZoomStart = (_, moreProps) => {
    const {
      mouseXY: [, mouseY],
      currentItem,
      xAccessor,
      xScale,
    } = moreProps;

    setX1y1([xScale(xAccessor(currentItem)), mouseY]);
    setStart({
      item: currentItem,
    });
  };

  const handleDrawSquare = (_, moreProps) => {
    if (x1y1 == null || isComplete) {
      return;
    }

    const {
      mouseXY: [, mouseY],
      currentItem,
      xAccessor,
      xScale,
    } = moreProps;

    const [x2, y2] = [xScale(xAccessor(currentItem)), mouseY];
    const [x1, y1] = x1y1;

    setEnd({
      item: currentItem,
    });
    setRect({
      x1,
      x2,
      y1,
      y2,
    });
  };

  const handleZoomComplete = (_, moreProps) => {
    setComplete((prevState) => !prevState);
  };

  useEffect(() => {
    if (!isComplete) {
      terminate();
    }
  }, [isComplete]);

  if (!enabled) {
    return null;
  }

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
