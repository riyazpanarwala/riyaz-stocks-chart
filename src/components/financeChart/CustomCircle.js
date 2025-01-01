import React from "react";
import { getMouseCanvas, GenericChartComponent } from "react-financial-charts";

const CustomCircle = ({
  circle,
  onCircleDrag,
  onCircleDragComplete,
  isRadius,
  onClickWhenHover,
  onClickOutside,
}) => {
  const handleDragStart = (e, moreProps) => {};

  const handleDrag = (e, moreProps) => {
    const { mouseXY, xScale, chartConfig } = moreProps;
    const [mouseX, mouseY] = mouseXY;

    let newCircle;
    if (isRadius) {
      const x = xScale(circle.x);
      const y = chartConfig.yScale(circle.y);
      const newRadius = Math.sqrt((mouseX - x) ** 2 + (mouseY - y) ** 2);
      newCircle = { ...circle, radius: newRadius };
    } else {
      const xValue = xScale.invert(mouseX);
      const yValue = chartConfig.yScale.invert(mouseY);
      newCircle = { ...circle, x: xValue, y: yValue };
    }
    onCircleDrag(newCircle);
  };

  const handleDragComplete = () => {
    onCircleDragComplete(circle.id);
  };

  const getExtraWidth = () => {
    if (isRadius) {
      return circle.radius - circle.radiusDrag;
    }
    return 0;
  };

  // Render method for GenericChartComponent
  const render = (ctx, moreProps) => {
    const { xScale, chartConfig } = moreProps;
    const yScale = chartConfig.yScale;

    let color = circle.color;
    let radius = circle.radius;
    if (isRadius) {
      color = circle.radiusColor;
      radius = circle.radiusDrag;
    }
    // Draw all circles
    const x = xScale(circle.x) + getExtraWidth();
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

  const isHover = (moreProps) => {
    const {
      mouseXY: [mouseX, mouseY],
      chartConfig: { yScale },
      xScale,
    } = moreProps;

    const x = xScale(circle.x) + getExtraWidth();
    const y = yScale(circle.y);
    const distance = Math.sqrt((mouseX - x) ** 2 + (mouseY - y) ** 2);

    if (isRadius) {
      return distance <= circle.radiusDrag;
    }
    return distance <= circle.radius;
  };

  const handleMouseDown = (e, moreProps) => {
    if (onClickWhenHover !== undefined && onClickOutside !== undefined) {
      if (isHover(moreProps)) {
        onClickWhenHover({ ...circle, selected: true });
      } else {
        onClickOutside({ ...circle, selected: false });
      }
    }
  };

  return (
    <GenericChartComponent
      clip={false}
      onDragStart={handleDragStart}
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

export default CustomCircle;
