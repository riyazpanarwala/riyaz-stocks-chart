import React, { useEffect, useState } from "react";
import SummaryCard from "./SummaryCard";
import Table from "./Table";
import Modal from "./Modal";
import { stockAnalysis } from "../StockAnalysis";
import "./App.css";

const TechnicalInfo = ({ companyObj, indexName, onClose, isMarketOpen }) => {
  const [technicalIndicators, setTechnicalIndicators] = useState([]);
  const [movingAverages, setMovingAvg] = useState([]);
  const [maCrossOvers, setMACrossOvers] = useState([]);
  const summaryData = [];

  const getRSIIndication = (val) => {
    if (val < 25) {
      return "Oversold";
    } else if (val >= 25 && val < 45) {
      return "Bearish";
    } else if (val >= 45 && val < 55) {
      return "Neutral";
    } else if (val >= 55 && val < 75) {
      return "Bullish";
    } else if (val >= 75) {
      return "Overbought";
    }
  };

  const getMACDIndication = (macdLine, signalLine) => {
    if (macdLine > 0) {
      if (macdLine >= signalLine) {
        return "Bullish";
      }
    } else {
      if (macdLine <= signalLine) {
        return "Bearish";
      }
    }
    return "Neutral";
  };

  const getCCIIndication = (val) => {
    if (val < -200) {
      return "Oversold";
    } else if (val >= -200 && val < -50) {
      return "Bearish";
    } else if (val >= -50 && val < 50) {
      return "Neutral";
    } else if (val >= 50 && val < 200) {
      return "Bullish";
    } else if (val >= 200) {
      return "Overbought";
    }
  };

  const getWilliamsonIndication = (val) => {
    if (val >= -100 && val < -80) {
      return "Oversold";
    } else if (val >= -80 && val < -50) {
      return "Bearish";
    } else if (val >= -50 && val < -20) {
      return "Bullish";
    } else {
      return "Overbought";
    }
  };

  const getROC20Indication = (val) => {
    if (val > 0) {
      return "Bullish";
    } else if (val < 0) {
      return "Bearish";
    }
    return "Neutral";
  };

  const fetchData = async () => {
    const data = await stockAnalysis(
      "day",
      companyObj.value,
      indexName || companyObj.indexName,
      "1y",
      companyObj.symbol,
      "",
      "",
      "",
      isMarketOpen
    );

    data.name = companyObj.label;

    const bb = data["Bolinger Band(20,2)"];
    const sto = data["Stochastic(20,3)"];
    const rsiValue = data["RSI(14)"];
    const cciValue = data["CCI(20)"];
    const macdLine = data["DAY MACD(12,26,9)"];
    const signalLine = data["DAY MACD SIGNAL"];
    const willValue = data["Williamson%R(14)"];
    const roc20Val = data["Day ROC(20)"];

    setTechnicalIndicators([
      {
        Indicator: "RSI(14)",
        Level: rsiValue,
        Indication: getRSIIndication(rsiValue),
      },
      {
        Indicator: "MACD(12,26,9)",
        Level: macdLine,
        Indication: getMACDIndication(macdLine, signalLine),
      },
      {
        Indicator: "Stochastic(20,3)",
        Level: `K:${sto.K}, D:${sto.D}`,
        Indication: "",
      },
      {
        Indicator: "ROC(20)",
        Level: roc20Val,
        Indication: getROC20Indication(roc20Val),
      },
      { Indicator: "ROC(125)", Level: data["Day ROC(125)"], Indication: "" },
      {
        Indicator: "CCI(20)",
        Level: cciValue,
        Indication: getCCIIndication(cciValue),
      },
      {
        Indicator: "Williamson%R(14) ",
        Level: willValue,
        Indication: getWilliamsonIndication(willValue),
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

    setMACrossOvers([
      {
        Period: "Short Term",
        "Moving Average Crossover": "5 & 20 DMA Crossover",
        Indication: data["shortTermMACross(5,20)"],
      },
      {
        Period: "Medium Term",
        "Moving Average Crossover": "20 & 50 DMA Crossover",
        Indication: data["mediumTermMACross(20,50)"],
      },
      {
        Period: "Long Term",
        "Moving Average Crossover": "50 & 200 DMA Crossover",
        Indication: data["longTermMACross(50,200)"],
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
