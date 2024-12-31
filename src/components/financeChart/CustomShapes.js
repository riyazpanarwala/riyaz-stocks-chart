import React, { useState } from "react";
import CustomCircle from "./CustomCircle";

const CustomShapes = ({ circles, onCircleWholeDragComplete }) => {
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
          <React.Fragment key={v.id}>
            <CustomCircle
              circle={v}
              onCircleDrag={onCircleDrag}
              onCircleDragComplete={onCircleDragComplete}
            />
            {/* radius drag */}
            <CustomCircle
              circle={{
                ...v,
                x: v.x,
                y: v.y,
                radius: 5,
                color: "white",
              }}
              onCircleDrag={onCircleDrag}
              onCircleDragComplete={onCircleDragComplete}
              isRadius
            />
          </React.Fragment>
        );
      })}
    </>
  );
};

export default CustomShapes;
