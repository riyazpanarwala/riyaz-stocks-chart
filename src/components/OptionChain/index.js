import { useState, useEffect } from "react";
import OptionChainTable from "./OptionChainTable";
import SummaryCard from "./SummaryCard";
import Modal from "../TechnicalInfo/Modal";
import { getNSEData } from "../getIntervalData";
import foMapData from "../utils/FOmap.js";

import "./index.css";

const App = ({ companyObj, indexObj, onClose }) => {
  const [optionChainData, setOptionChainData] = useState({});
  const [selectedExpiry, setSelectedExpiry] = useState("");
  const [isFOFetching, setIsFOFetching] = useState(false);

  const mapApiParams = () => {
    if (!companyObj?.nseIndex) {
      return { apiName: "optionChain", symbol: companyObj.symbol };
    }

    return {
      apiName: "F&O",
      symbol: foMapData[companyObj.symbol] ?? companyObj.symbol,
    };
  };

  const onFOClick = async () => {
    try {
      setIsFOFetching(true);
      const { apiName, symbol } = mapApiParams();
      const data = await getNSEData(apiName, symbol);
      setOptionChainData(data);
      if (data.records) {
        setSelectedExpiry(data.records.expiryDates[0]);
      }
    } catch (e) {
      console.error("Failed to fetch option chain", e);
    } finally {
      setIsFOFetching(false);
    }
  };

  useEffect(() => {
    if (companyObj.symbol) {
      onFOClick();
    }
  }, [companyObj.symbol]);

  return (
    <div className="container">
      <Modal isOpen={true} onClose={onClose}>
        {optionChainData.records ? (
          <>
            <h1 className="title">Option Chain - {companyObj.value}</h1>
            <h5 className="subtitle">
              Underlying Value: {optionChainData.records.underlyingValue} |
              Timestamp: {optionChainData.records.timestamp}
            </h5>

            <SummaryCard
              ceData={optionChainData.filtered?.CE}
              peData={optionChainData.filtered?.PE}
            />

            <ul className="tabs">
              {optionChainData.records.expiryDates.map((date) => (
                <li key={date}>
                  <button
                    className={`tab-button ${
                      selectedExpiry === date ? "active" : ""
                    }`}
                    onClick={() => setSelectedExpiry(date)}
                  >
                    {date}
                  </button>
                </li>
              ))}
            </ul>

            <OptionChainTable
              data={optionChainData}
              expiryDate={selectedExpiry}
            />
          </>
        ) : isFOFetching ? (
          "Please wait..."
        ) : (
          "No Data"
        )}
      </Modal>
    </div>
  );
};

export default App;
