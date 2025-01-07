import React, { useState, useEffect } from "react";
import { Annotate, SvgPathAnnotation } from "react-financial-charts";

const Breakout = ({ breakoutName, data }) => {
  const [breakouts, setBreakouts] = useState([]);

  const detectBreakouts = (stockData, windowSize = 20) => {
    const resistance = [];
    const support = [];
    const breakoutsArr = [];

    for (let i = 0; i < stockData.length; i++) {
      if (i >= windowSize) {
        const windowData = stockData.slice(i - windowSize, i);
        const highs = windowData.map((d) => d.high);
        const lows = windowData.map((d) => d.low);
        const avgVolume =
          windowData.reduce((sum, d) => sum + d.volume, 0) / windowSize;

        resistance[i] = Math.max(...highs);
        support[i] = Math.min(...lows);

        const price = stockData[i].close;
        const volume = stockData[i].volume;

        if (price > resistance[i] && volume > avgVolume) {
          breakoutsArr.push({ ...stockData[i], bull: true });
        } else if (price < support[i] && volume > avgVolume) {
          breakoutsArr.push({ ...stockData[i], bear: true });
        }
      } else {
        resistance[i] = null;
        support[i] = null;
      }
    }

    setBreakouts(breakoutsArr);
  };

  // Function to detect volume breakout
  const detectVolumeBreakout = (data, period = 20, multiplier = 1.5) => {
    let breakoutsArr = [];
    // Assuming a simple breakout detection based on volume being 1.5 times the average of the past 10 days
    data.forEach((d, i) => {
      if (i < period) return d;
      const past10DaysVol =
        data.slice(i - period, i).reduce((acc, curr) => acc + curr.volume, 0) /
        period;

      if (d.volume > multiplier * past10DaysVol) {
        if (d.close > d.open) {
          breakoutsArr = [...breakoutsArr, { ...d, bull: true }];
        } else {
          breakoutsArr = [...breakoutsArr, { ...d, bear: true }];
        }
      }
    });
    setBreakouts(breakoutsArr);
  };

  useEffect(() => {
    console.log("heyyeeyey");
    if (breakoutName === "support") {
      detectBreakouts([...data]);
    } else if (breakoutName === "volume") {
      detectVolumeBreakout([...data]);
    } else {
      setBreakouts([]);
    }
  }, [breakoutName, data]);

  const breakoutPath = (breakoutObj) => {
    return {
      fill: breakoutObj.bull ? "Green" : "red",
      path: () =>
        "M12,11.5A2.5,2.5 0 0,1 9.5,9A2.5,2.5 0 0,1 12,6.5A2.5,2.5 0 0,1 14.5,9A2.5,2.5 0 0,1 12,11.5M12,2A7,7 0 0,0 5,9C5,14.25 12,22 12,22C12,22 19,14.25 19,9A7,7 0 0,0 12,2Z",
      pathWidth: 12,
      pathHeight: 12,
      tooltip: `(${breakoutObj.close}) ${breakoutObj.date}`,
      y: ({ yScale, datum }) => yScale(datum.close),
    };
  };

  return breakouts.map((breakout) => {
    return (
      <Annotate
        key={breakout.date}
        with={SvgPathAnnotation}
        when={(d) => d.date === breakout.date}
        usingProps={breakoutPath(breakout)}
      />
    );
  });
};

export default Breakout;
