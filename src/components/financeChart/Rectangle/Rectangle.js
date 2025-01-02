import React, { useState } from "react";
import { getMouseCanvas, GenericChartComponent } from "react-financial-charts";

const Rectangle = ({ rect, onDrag, onDragComplete, onMouseDownClick }) => {
  const [start, setStart] = useState([]);

  const handleMouseDown = (e, moreProps) => {
    if (onMouseDownClick !== undefined) {
      onMouseDownClick(rect.id, isHover(moreProps));
    }
  };

  const handleDragStart = (e, moreProps) => {
    const { mouseXY } = moreProps;

    setStart(mouseXY);
  };

  const handleDrag = (e, moreProps) => {
    const { mouseXY, xScale, chartConfig } = moreProps;
    const [mouseX, mouseY] = mouseXY;

    const xDiff = xScale.invert(mouseX) - xScale.invert(start[0]);
    const yDiff =
      chartConfig.yScale.invert(mouseY) - chartConfig.yScale.invert(start[1]);

    const newRect = {
      ...rect,
      x1: xDiff + rect.x1,
      x2: xDiff + rect.x2,
      y1: yDiff + rect.y1,
      y2: yDiff + rect.y2,
    };
    onDrag(newRect);
  };

  const handleDragComplete = () => {
    onDragComplete(rect.id);
  };

  const render = (ctx, moreProps) => {
    const { x1, x2, y1, y2 } = helpers(moreProps);

    ctx.beginPath();
    ctx.rect(
      Math.min(x1, x2),
      Math.min(y1, y2),
      Math.abs(x2 - x1),
      Math.abs(y2 - y1)
    );
    ctx.fillStyle = rect.color;
    ctx.fill();
    ctx.strokeStyle = rect.strokeStyle;
    ctx.stroke();
    ctx.closePath();
  };

  const isHover = (moreProps) => {
    const {
      mouseXY: [mouseX, mouseY],
    } = moreProps;

    const { x1, x2, y1, y2 } = helpers(moreProps);

    if (mouseX >= x1 && mouseX <= x2 && mouseY >= y1 && mouseY <= y2) {
      return true;
    }
    return false;
  };

  const helpers = (moreProps) => {
    const {
      chartConfig: { yScale },
      xScale,
    } = moreProps;

    const x1 = xScale(rect.x1);
    const y1 = yScale(rect.y1);
    const x2 = xScale(rect.x2);
    const y2 = yScale(rect.y2);

    return {
      x1,
      x2,
      y1,
      y2,
    };
  };

  return (
    <>
      <GenericChartComponent
        clip={false}
        isHover={isHover}
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragComplete={handleDragComplete}
        onMouseDown={handleMouseDown}
        canvasToDraw={getMouseCanvas}
        canvasDraw={render}
        enableDragOnHover
        drawOn={["pan", "mousemove", "click", "drag"]}
      />
    </>
  );
};

export default Rectangle;
