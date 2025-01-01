import React, { useState } from "react";
import CustomCircle from "./CustomCircle";

const CustomShapes = ({
  circles,
  onCircleWholeDragComplete,
  onClickWhenHover,
  onClickOutside,
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
          <React.Fragment key={v.id}>
            <CustomCircle
              circle={v}
              onCircleDrag={onCircleDrag}
              onCircleDragComplete={onCircleDragComplete}
              onClickWhenHover={onClickWhenHover}
              onClickOutside={onClickOutside}
            />
            {/* radius drag */}
            {v.selected ? (
              <CustomCircle
                circle={v}
                onCircleDrag={onCircleDrag}
                onCircleDragComplete={onCircleDragComplete}
                isRadius
              />
            ) : (
              ""
            )}
          </React.Fragment>
        );
      })}
    </>
  );
};

export default CustomShapes;
