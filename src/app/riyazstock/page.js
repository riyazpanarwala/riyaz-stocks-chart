"use client";
import React from "react";
import stocksAnalysis from "../../components/StockAnalysis";

const App = () => {
  const onClick = () => {
    stocksAnalysis();
  };

  return (
    <div>
      <button onClick={onClick} className="custom-button">
        Click
      </button>
    </div>
  );
};

export default App;
