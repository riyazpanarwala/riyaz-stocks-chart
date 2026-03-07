import React from "react";
import Slider from "rc-slider";
import "rc-slider/assets/index.css";

const StrikeSlider = ({ value, setValue }) => {
  return (
    <div style={{ width: 300 }}>
      <Slider min={3} max={20} value={value} onChange={setValue} />

      <p>Strike Range: ±{value}</p>
    </div>
  );
};

export default StrikeSlider;
