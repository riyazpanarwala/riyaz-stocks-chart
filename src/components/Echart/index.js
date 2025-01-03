import React from "react";
import ReactECharts from "echarts-for-react";

const Echart = ({ timeData, candleData, companyObj }) => {
  const getCompanyName = () => {
    return companyObj?.label;
  };

  const getOptions = () => {
    return {
      title: {
        text: getCompanyName(),
        left: "center",
      },
      tooltip: {
        trigger: "axis",
        axisPointer: {
          type: "cross",
        },
      },
      xAxis: {
        type: "category",
        data: timeData, // Dates for the x-axis
        boundaryGap: true,
      },
      yAxis: {
        type: "value",
        scale: true,
        splitArea: {
          show: true,
        },
      },
      series: [
        {
          type: "candlestick",
          data: candleData, // Candlestick data: [Open, Close, Low, High]
          itemStyle: {
            color: "#00ff00", // Upward color
            color0: "#ff0000", // Downward color
            borderColor: "#00ff00",
            borderColor0: "#ff0000",
          },
        },
      ],
    };
  };

  return (
    <ReactECharts
      option={getOptions()}
      style={{ height: 400, width: "100%" }}
    />
  );
};

export default Echart;
