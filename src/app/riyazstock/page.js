"use client";
import React from "react";
import stocksAnalysis from "../../components/StockAnalysis";

const App = () => {
  const onClick = () => {
    stocksAnalysis();
  };

  return (
    <div>
      <button onClick={onClick} style={{ fontSize: "40px" }}>
        Click
      </button>
    </div>
  );
};

export default App;
