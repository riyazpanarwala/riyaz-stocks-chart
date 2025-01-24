import React from "react";
import {
  getMouseCanvas,
  GenericChartComponent,
} from "@riyazpanarwala/react-financial-charts";

const Circle = ({
  circle,
  onCircleDrag,
  onCircleDragComplete,
  onMouseDownClick,
}) => {
  const handleDrag = (e, moreProps) => {
    const { mouseXY, xScale, chartConfig } = moreProps;
    const [mouseX, mouseY] = mouseXY;

    const xValue = xScale.invert(mouseX);
    const yValue = chartConfig.yScale.invert(mouseY);
    const x1Value = xScale.invert(mouseX + circle.radius);
    const newCircle = { ...circle, x: xValue, y: yValue, x1: x1Value };
    onCircleDrag(newCircle);
  };

  const handleDragComplete = () => {
    onCircleDragComplete(circle.id);
  };

  const draw = (ctx, moreProps, color, radius) => {
    const { xScale, chartConfig } = moreProps;
    const yScale = chartConfig.yScale;
    // Draw all circles
    const x = xScale(circle.x);
    const y = yScale(circle.y);

    ctx.lineWidth = circle.lineWidth;
    ctx.fillStyle = color;
    ctx.strokeStyle = circle.strokeStyle;

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2, false);
    ctx.fill();
    ctx.closePath();
    ctx.stroke();
  };

  const render = (ctx, moreProps) => {
    draw(ctx, moreProps, circle.color, circle.radius);
  };

  const isHover = (moreProps) => {
    const {
      mouseXY: [mouseX, mouseY],
      chartConfig: { yScale },
      xScale,
    } = moreProps;

    const x = xScale(circle.x);
    const y = yScale(circle.y);
    const distance = Math.sqrt((mouseX - x) ** 2 + (mouseY - y) ** 2);

    return distance <= circle.radius;
  };

  const handleMouseDown = (e, moreProps) => {
    if (onMouseDownClick !== undefined) {
      onMouseDownClick(circle.id, isHover(moreProps));
    }
  };

  return (
    <GenericChartComponent
      clip={false}
      selected
      interactiveCursorClass={"react-financial-charts-move-cursor"}
      isHover={isHover}
      onDrag={handleDrag}
      onDragComplete={handleDragComplete}
      onMouseDown={handleMouseDown}
      canvasToDraw={getMouseCanvas}
      canvasDraw={render}
      enableDragOnHover
      drawOn={["pan", "mousemove", "click", "drag"]}
    />
  );
};

export default Circle;
