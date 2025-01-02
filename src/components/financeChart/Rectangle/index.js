import React, { useState } from "react";
import Rectangle from "./Rectangle";
import ClickableCircle from "../ClickableCircle";

const CustomShapeRectangle = ({
  rectangles,
  onWholeDragCompleteRect,
  onMouseDownClick,
}) => {
  const [newRect, setNewRect] = useState({});

  const onDrag = (newObj) => {
    setNewRect(newObj);
  };

  const onDragComplete = () => {
    onWholeDragCompleteRect(newRect);
    setNewRect({});
  };

  const getNewY = (moreProps) => {
    const { mouseXY, chartConfig } = moreProps;
    const [, mouseY] = mouseXY;

    return chartConfig.yScale.invert(mouseY);
  };

  const getNewX = (moreProps) => {
    const { mouseXY, xScale } = moreProps;
    const [mouseX] = mouseXY;

    return xScale.invert(mouseX);
  };

  const handleEdgeDrag = (moreProps, rect, xKey, yKey) => {
    let newobj = { ...rect };
    if (xKey) {
      newobj[xKey] = getNewX(moreProps);
    }
    if (yKey) {
      newobj[yKey] = getNewY(moreProps);
    }
    setNewRect(newobj);
  };

  return (
    <>
      {newRect.x1 ? <Rectangle rect={newRect} /> : ""}
      {rectangles.map((rect) => {
        const strokeWidth = 1;
        const circleRadius = 5;
        const circlefillStyle = "#fff";
        const stroke = "#000";

        const circleArr = [
          { cx: rect.x1, cy: rect.y1, xKey: "x1", yKey: "y1" },
          { cx: rect.x1, cy: rect.y2, xKey: "x1", yKey: "y2" },
          { cx: rect.x2, cy: rect.y1, xKey: "x2", yKey: "y1" },
          { cx: rect.x2, cy: rect.y2, xKey: "x2", yKey: "y2" },
          {
            cx: rect.x1,
            cy: (rect.y1 + rect.y2) / 2,
            xKey: "x1",
            yKey: "",
            className: "react-financial-charts-ew-resize-cursor",
          },
          {
            cx: rect.x2,
            cy: (rect.y1 + rect.y2) / 2,
            xKey: "x2",
            yKey: "",
            className: "react-financial-charts-ew-resize-cursor",
          },
          {
            cx: (rect.x1 + rect.x2) / 2,
            cy: rect.y1,
            xKey: "",
            yKey: "y1",
            className: "react-financial-charts-ns-resize-cursor",
          },
          {
            cx: (rect.x1 + rect.x2) / 2,
            cy: rect.y2,
            xKey: "",
            yKey: "y2",
            className: "react-financial-charts-ns-resize-cursor",
          },
        ];

        return (
          <React.Fragment key={rect.id}>
            <Rectangle
              rect={rect}
              onDrag={onDrag}
              onDragComplete={onDragComplete}
              onMouseDownClick={onMouseDownClick}
            />
            <ClickableCircle
              show={rect.selected}
              cx={(rect.x1 + rect.x2) / 2}
              cy={(rect.y1 + rect.y2) / 2}
              r={3}
              fillStyle={circlefillStyle}
              strokeStyle={stroke}
              strokeWidth={strokeWidth}
              interactiveCursorClass={"react-financial-charts-move-cursor"}
            />
            {circleArr.map((v) => {
              return (
                <ClickableCircle
                  show
                  key={v.cx + v.cy}
                  cx={v.cx}
                  cy={v.cy}
                  r={circleRadius}
                  fillStyle={circlefillStyle}
                  strokeStyle={stroke}
                  strokeWidth={strokeWidth}
                  interactiveCursorClass={
                    v.className || "react-financial-charts-move-cursor"
                  }
                  onDrag={(e, moreProps) => {
                    handleEdgeDrag(moreProps, rect, v.xKey, v.yKey);
                  }}
                  onDragComplete={onDragComplete}
                />
              );
            })}
          </React.Fragment>
        );
      })}
    </>
  );
};

export default CustomShapeRectangle;
