import React, { useEffect, useState } from "react";
import SummaryCard from "./SummaryCard";
import Table from "./Table";
import Modal from "./Modal";
import { fetchHistoricData } from "../common";
import getStockAnalysis from "../StockAnalysis/getStockAnalysis";
import "./App.css";

const TechnicalInfo = ({ companyObj, indexName, onClose }) => {
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

  const getStochasticIndication = (val) => {
    if (val < 20) {
      return "Oversold";
    } else if (val >= 20 && val < 45) {
      return "Bearish";
    } else if (val >= 45 && val < 55) {
      return "Neutral";
    } else if (val >= 55 && val < 80) {
      return "Bullish";
    } else {
      return "Overbought";
    }
  };

  const getMFIIndication = (val) => {
    if (val < 20) {
      return "Oversold";
    } else if (val >= 20 && val < 40) {
      return "Bearish";
    } else if (val >= 40 && val < 60) {
      return "Neutral";
    } else if (val >= 60 && val < 80) {
      return "Bullish";
    } else if (val >= 80) {
      return "Overbought";
    }
  };

  const getADXIndication = (val) => {
    if (val < 20) {
      return "Weak Trend";
    } else if (val >= 20 && val < 25) {
      return "Moderate Trend";
    } else {
      return "Strong Trend";
    }
  };

  const fetchData = async () => {
    const { candles } = await fetchHistoricData(
      false,
      "day",
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
        Indication: atr > atrSma ? "High Volatility" : "Low Volatility",
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
