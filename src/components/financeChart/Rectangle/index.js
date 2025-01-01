import React, { useState } from "react";
import Rectangle from "./Rectangle";

const CustomShapeRectangle = ({ rectangles, onWholeDragCompleteRect }) => {
  const [newRect, setNewRect] = useState({});

  const onDrag = (newObj) => {
    setNewRect(newObj);
  };

  const onDragComplete = () => {
    onWholeDragCompleteRect(newRect);
    setNewRect({});
  };

  return (
    <>
      {newRect.x1 ? <Rectangle rect={newRect} /> : ""}
      {rectangles.map((rect) => {
        return (
          <Rectangle
            rect={rect}
            key={rect.id}
            onDrag={onDrag}
            onDragComplete={onDragComplete}
          />
        );
      })}
    </>
  );
};

export default CustomShapeRectangle;
