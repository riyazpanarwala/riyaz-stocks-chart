import React from "react";
import { getMouseCanvas, GenericChartComponent } from "react-financial-charts";

const ClickableCircle = ({
  interactiveCursorClass,
  onDragStart,
  onDrag,
  onDragComplete,
  onHover,
  onUnHover,
  show = false,
  strokeStyle,
  strokeWidth,
  fillStyle,
  r,
  cx,
  cy,
}) => {
  const drawOnCanvas = (ctx, moreProps) => {
    ctx.lineWidth = strokeWidth;
    ctx.fillStyle = fillStyle;
    ctx.strokeStyle = strokeStyle;

    const [x, y] = helper(moreProps);

    ctx.beginPath();
    ctx.arc(x, y, r, 0, 2 * Math.PI, false);
    ctx.fill();
    ctx.stroke();
  };

  const helper = (moreProps) => {
    const {
      xScale,
      chartConfig: { yScale },
    } = moreProps;

    const x = xScale(cx);
    const y = yScale(cy);
    return [x, y];
  };

  const isHover = (moreProps) => {
    const { mouseXY } = moreProps;
    const r1 = r + 7;
    const [x, y] = helper(moreProps);

    const [mx, my] = mouseXY;
    const hover = x - r1 < mx && mx < x + r1 && y - r1 < my && my < y + r1;

    return hover;
  };

  if (!show) {
    return null;
  }

  return (
    <GenericChartComponent
      interactiveCursorClass={interactiveCursorClass}
      selected
      isHover={isHover}
      onDragStart={onDragStart}
      onDrag={onDrag}
      onDragComplete={onDragComplete}
      onHover={onHover}
      onUnHover={onUnHover}
      canvasDraw={drawOnCanvas}
      canvasToDraw={getMouseCanvas}
      drawOn={["pan", "mousemove", "drag"]}
    />
  );
};

export default ClickableCircle;
