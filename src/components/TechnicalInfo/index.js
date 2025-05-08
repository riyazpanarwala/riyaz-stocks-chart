import React, { useEffect, useState } from "react";
import SummaryCard from "./SummaryCard";
import Table from "./Table";
import Modal from "./Modal";
import { fetchHistoricData } from "../common";
import getStockAnalysis from "../StockAnalysis/getStockAnalysis";
import {
  getRSIIndication,
  getMACDIndication,
  getCCIIndication,
  getWilliamsonIndication,
  getROC20Indication,
  getStochasticIndication,
  getMFIIndication,
  getADXIndication,
  getATRIndication,
} from "../StockAnalysis/indication";
import "./App.css";

const TechnicalInfo = ({ companyObj, indexName, onClose }) => {
  const [technicalIndicators, setTechnicalIndicators] = useState([]);
  const [movingAverages, setMovingAvg] = useState([]);
  const [maCrossOvers, setMACrossOvers] = useState([]);
  const summaryData = [];

  const fetchData = async () => {
    const { candles } = await fetchHistoricData(
      false,
      "days",
      "1d",
      indexName || companyObj.indexName,
      "1y",
      companyObj
    );

    const {
      lastClose,
      rsi,
      mfi,
      cci,
      willR,
      sto,
      adx,
      macdLine,
      signalLine,
      atr,
      atrSma,
      roc20,
      roc125,
      sma5,
      sma10,
      sma20,
      sma50,
      sma100,
      sma200,
      bb,
      shortTermMACross,
      mediumTermMACross,
      longTermMACross,
    } = getStockAnalysis(candles);

    setTechnicalIndicators([
      {
        Indicator: "RSI(14)",
        Level: rsi,
        Indication: getRSIIndication(rsi),
      },
      {
        Indicator: "MACD(12,26,9)",
        Level: macdLine,
        Indication: getMACDIndication(macdLine, signalLine),
      },
      {
        Indicator: "Stochastic(20,3)",
        Level: sto,
        Indication: getStochasticIndication(sto),
      },
      {
        Indicator: "ROC(20)",
        Level: roc20,
        Indication: getROC20Indication(roc20),
      },
      { Indicator: "ROC(125)", Level: roc125, Indication: "" },
      {
        Indicator: "CCI(20)",
        Level: cci,
        Indication: getCCIIndication(cci),
      },
      {
        Indicator: "Williamson%R(14) ",
        Level: willR,
        Indication: getWilliamsonIndication(willR),
      },
      {
        Indicator: "MFI(14)",
        Level: mfi,
        Indication: getMFIIndication(mfi),
      },
      {
        Indicator: "ATR(14)",
        Level: atr,
        Indication: getATRIndication(atr, atrSma),
      },
      {
        Indicator: "ADX(14)",
        Level: adx,
        Indication: getADXIndication(adx),
      },
      {
        Indicator: "Bolinger Band(20,2)",
        Level: `UB:${bb.UB}, LB:${bb.LB}, SMA20:${bb.SMA20}`,
        Indication: "",
      },
    ]);

    setMovingAvg([
      {
        Period: 5,
        SMA: sma5,
        Indication: lastClose < sma5 ? "Bearish" : "Bullish",
      },
      {
        Period: 10,
        SMA: sma10,
        Indication: lastClose < sma10 ? "Bearish" : "Bullish",
      },
      {
        Period: 20,
        SMA: sma20,
        Indication: lastClose < sma20 ? "Bearish" : "Bullish",
      },
      {
        Period: 50,
        SMA: sma50,
        Indication: lastClose < sma50 ? "Bearish" : "Bullish",
      },
      {
        Period: 100,
        SMA: sma100,
        Indication: lastClose < sma100 ? "Bearish" : "Bullish",
      },
      {
        Period: 200,
        SMA: sma200,
        Indication: lastClose < sma200 ? "Bearish" : "Bullish",
      },
    ]);

    setMACrossOvers([
      {
        Period: "Short Term",
        "Moving Average Crossover": "5 & 20 DMA Crossover",
        Indication: shortTermMACross,
      },
      {
        Period: "Medium Term",
        "Moving Average Crossover": "20 & 50 DMA Crossover",
        Indication: mediumTermMACross,
      },
      {
        Period: "Long Term",
        "Moving Average Crossover": "50 & 200 DMA Crossover",
        Indication: longTermMACross,
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
        <Table
          title="Moving Averages Crossovers"
          columns={["Period", "Moving Average Crossover", "Indication"]}
          data={maCrossOvers}
        />
      </Modal>
    </div>
  );
};

export default TechnicalInfo;
