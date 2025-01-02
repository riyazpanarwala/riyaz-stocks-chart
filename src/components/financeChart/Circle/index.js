import React, { useState } from "react";
import Circle from "./Circle";
import ClickableCircle from "../ClickableCircle";

const CustomShapeCircle = ({
  circles,
  onCircleWholeDragComplete,
  onMouseDownClick,
}) => {
  const [newCircle, setNewCircle] = useState({});

  const onCircleDrag = (newCircleObj) => {
    setNewCircle(newCircleObj);
  };

  const onCircleDragComplete = () => {
    onCircleWholeDragComplete({ ...newCircle, selected: true });
    setNewCircle({});
  };

  const handleEdgeDrag = (moreProps, circle) => {
    const { mouseXY, xScale, chartConfig } = moreProps;
    const [mouseX, mouseY] = mouseXY;

    const x = xScale(circle.x);
    const y = chartConfig.yScale(circle.y);
    const newRadius = Math.sqrt((mouseX - x) ** 2 + (mouseY - y) ** 2);
    const newCircle = {
      ...circle,
      radius: newRadius,
      x1: xScale.invert(x + newRadius),
    };
    onCircleDrag(newCircle);
  };

  return (
    <>
      {newCircle.x ? <Circle circle={newCircle} /> : ""}
      {circles.map((v) => {
        const strokeWidth = 1;
        const circleRadius = 5;
        const circlefillStyle = "#fff";
        const stroke = "#000";

        return (
          <React.Fragment key={v.id}>
            <Circle
              circle={v}
              onCircleDrag={onCircleDrag}
              onCircleDragComplete={onCircleDragComplete}
              onMouseDownClick={onMouseDownClick}
            />
            <ClickableCircle
              show={v.hover || v.selected}
              cx={v.x1}
              cy={v.y}
              r={circleRadius}
              fillStyle={circlefillStyle}
              strokeStyle={stroke}
              strokeWidth={strokeWidth}
              interactiveCursorClass={"react-financial-charts-ew-resize-cursor"}
              onDrag={(e, moreProps) => {
                handleEdgeDrag(moreProps, v);
              }}
              onDragComplete={onCircleDragComplete}
              onHover={() => {
                onCircleWholeDragComplete({ ...v, hover: true });
              }}
              onUnHover={() => {
                onCircleWholeDragComplete({ ...v, hover: false });
              }}
            />
          </React.Fragment>
        );
      })}
    </>
  );
};

export default CustomShapeCircle;
