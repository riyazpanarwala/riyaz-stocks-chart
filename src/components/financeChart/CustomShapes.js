import React, { useState } from "react";
import CustomCircle from "./CustomCircle";

const CustomShapes = ({
  circles,
  onCircleWholeDragComplete,
  onMouseDownClick,
}) => {
  const [newCircle, setNewCircle] = useState({});

  const onCircleDrag = (newCircleObj) => {
    setNewCircle(newCircleObj);
  };

  const onCircleDragComplete = () => {
    onCircleWholeDragComplete(newCircle);
    setNewCircle({});
  };

  return (
    <>
      {newCircle.x ? <CustomCircle circle={newCircle} /> : ""}
      {circles.map((v) => {
        return (
          <CustomCircle
            circle={v}
            key={v.id}
            onCircleDrag={onCircleDrag}
            onCircleDragComplete={onCircleDragComplete}
            onMouseDownClick={onMouseDownClick}
          />
        );
      })}
    </>
  );
};

export default CustomShapes;
