import React from "react";
import { getMouseCanvas, GenericChartComponent } from "react-financial-charts";

const CustomCircle = ({
  circle,
  onCircleDrag,
  onCircleDragComplete,
  isRadius,
  onMouseDownClick,
}) => {
  const handleDrag = (e, moreProps) => {
    const { mouseXY, xScale, chartConfig } = moreProps;
    const [mouseX, mouseY] = mouseXY;

    const xValue = xScale.invert(mouseX);
    const yValue = chartConfig.yScale.invert(mouseY);
    const newCircle = { ...circle, x: xValue, y: yValue };
    onCircleDrag(newCircle);
  };

  const handleDrag1 = (e, moreProps) => {
    const { mouseXY, xScale, chartConfig } = moreProps;
    const [mouseX, mouseY] = mouseXY;

    const x = xScale(circle.x);
    const y = chartConfig.yScale(circle.y);
    const newRadius = Math.sqrt((mouseX - x) ** 2 + (mouseY - y) ** 2);
    const newCircle = { ...circle, radius: newRadius };
    onCircleDrag(newCircle);
  };

  const handleDragComplete = () => {
    onCircleDragComplete(circle.id);
  };

  const draw = (ctx, moreProps, extraWidth, color, radius) => {
    const { xScale, chartConfig } = moreProps;
    const yScale = chartConfig.yScale;
    // Draw all circles
    const x = xScale(circle.x) + extraWidth;
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

  const getExtraWidth = () => {
    return circle.radius;
  };

  const render = (ctx, moreProps) => {
    draw(ctx, moreProps, 0, circle.color, circle.radius);
  };

  const render1 = (ctx, moreProps) => {
    draw(
      ctx,
      moreProps,
      getExtraWidth(),
      circle.radiusColor,
      circle.radiusDrag
    );
  };

  const isMouseInRange = (moreProps, radius, extraWidth) => {
    const {
      mouseXY: [mouseX, mouseY],
      chartConfig: { yScale },
      xScale,
    } = moreProps;

    const x = xScale(circle.x) + extraWidth;
    const y = yScale(circle.y);
    const distance = Math.sqrt((mouseX - x) ** 2 + (mouseY - y) ** 2);

    return distance <= radius;
  };

  const isHover = (moreProps) => {
    return isMouseInRange(moreProps, circle.radius, 0);
  };

  const isHover1 = (moreProps) => {
    return isMouseInRange(moreProps, circle.radiusDrag, getExtraWidth());
  };

  const handleMouseDown = (e, moreProps, hoverFunc, keyname) => {
    if (onMouseDownClick !== undefined) {
      onMouseDownClick(circle.id, keyname, hoverFunc(moreProps));
    }
  };

  return (
    <>
      <GenericChartComponent
        clip={false}
        // onDragStart={handleDragStart}
        isHover={isHover}
        onDrag={handleDrag}
        onDragComplete={handleDragComplete}
        onMouseDown={(e, moreProps) => {
          handleMouseDown(e, moreProps, isHover, "selected");
        }}
        canvasToDraw={getMouseCanvas}
        canvasDraw={render}
        enableDragOnHover
        drawOn={["pan", "mousemove", "click", "drag"]}
      />
      {circle.selected || circle.isCirlceselected ? (
        <GenericChartComponent
          clip={false}
          isHover={isHover1}
          onDrag={handleDrag1}
          // onDragStart={handleDragStart1}
          onDragComplete={handleDragComplete}
          onMouseDown={(e, moreProps) => {
            handleMouseDown(e, moreProps, isHover1, "isCirlceselected");
          }}
          canvasToDraw={getMouseCanvas}
          canvasDraw={render1}
          enableDragOnHover
          drawOn={["pan", "mousemove", "click", "drag"]}
        />
      ) : (
        ""
      )}
    </>
  );
};

export default CustomCircle;
