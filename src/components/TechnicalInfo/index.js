import React, { useEffect, useState } from "react";
import SummaryCard from "./SummaryCard";
import Table from "./Table";
import Modal from "./Modal";
import { stockAnalysis } from "../StockAnalysis";
import "./App.css";

const TechnicalInfo = ({ companyObj, indexName, onClose }) => {
  const [technicalIndicators, setTechnicalIndicators] = useState([]);
  const [movingAverages, setMovingAvg] = useState([]);
  const summaryData = [];

  const fetchData = async () => {
    const data = await stockAnalysis(
      "day",
      companyObj.value,
      indexName || companyObj.indexName,
      "1y",
      companyObj.symbol
    );

    data.name = companyObj.label;

    const bb = data["Bolinger Band(20,2)"];
    const sto = data["Stochastic(20,3)"];

    setTechnicalIndicators([
      { Indicator: "RSI(14)", Level: data["RSI(14)"], Indication: "" },
      {
        Indicator: "MACD(12,26,9)",
        Level: data["DAY MACD(12,26,9)"],
        Indication: "",
      },
      {
        Indicator: "Stochastic(20,3)",
        Level: `K:${sto.K}, D:${sto.D}`,
        Indication: "",
      },
      { Indicator: "ROC(21)", Level: data["Day ROC(21)"], Indication: "" },
      { Indicator: "CCI(20)", Level: data["CCI(20)"], Indication: "" },
      {
        Indicator: "Williamson%R(14) ",
        Level: data["Williamson%R(14)"],
        Indication: "",
      },
      { Indicator: "MFI(14)", Level: data["MFI(14)"] || "", Indication: "" },
      { Indicator: "ATR(14)", Level: data["Day ATR"], Indication: "" },
      { Indicator: "ADX(14)", Level: data["DAY ADX"], Indication: "" },
      {
        Indicator: "Bolinger Band(20,2)",
        Level: `UB:${bb.UB}, LB:${bb.LB}, SMA20:${bb.SMA20}`,
        Indication: "",
      },
    ]);

    setMovingAvg([
      {
        Period: 5,
        SMA: data["SMA(5)"],
        Indication: data.lastClose < data["SMA(5)"] ? "Bearish" : "Bullish",
      },
      {
        Period: 10,
        SMA: data["SMA(10)"],
        Indication: data.lastClose < data["SMA(10)"] ? "Bearish" : "Bullish",
      },
      {
        Period: 20,
        SMA: data["SMA(20)"],
        Indication: data.lastClose < data["SMA(20)"] ? "Bearish" : "Bullish",
      },
      {
        Period: 50,
        SMA: data["SMA(50)"],
        Indication: data.lastClose < data["SMA(50)"] ? "Bearish" : "Bullish",
      },
      {
        Period: 100,
        SMA: data["SMA(100)"],
        Indication: data.lastClose < data["SMA(100)"] ? "Bearish" : "Bullish",
      },
      {
        Period: 200,
        SMA: data["SMA(200)"],
        Indication: data.lastClose < data["SMA(200)"] ? "Bearish" : "Bullish",
      },
    ]);
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="container">
      <Modal isOpen={true} onClose={onClose}>
        <div className="summary-grid">
          {summaryData.map((item, index) => (
            <SummaryCard
              key={index}
              title={item.title}
              value={item.value}
              status={item.status}
            />
          ))}
        </div>
        <Table
          title="Moving Averages"
          columns={["Period", "SMA", "Indication"]}
          data={movingAverages}
        />
        <Table
          title="Technical Indicators"
          columns={["Indicator", "Level", "Indication"]}
          data={technicalIndicators}
        />
      </Modal>
    </div>
  );
};

export default TechnicalInfo;
