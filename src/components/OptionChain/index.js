import { useState, useEffect } from "react";
import OptionChainTable from "./OptionChainTable";
import SummaryCard from "./SummaryCard";
import { getOptionChainData } from "../getIntervalData";
import Modal from "../TechnicalInfo/Modal";
import "./index.css";

const App = ({ companyObj, onClose }) => {
  const [optionChainData, setOptionChainData] = useState({});
  const [selectedExpiry, setSelectedExpiry] = useState([]);

  const onFOClick = async () => {
    try {
      // setIsFOFetching(true);
      const data = await getOptionChainData(companyObj.symbol);
      setOptionChainData(data);
      if (data.records) {
        setSelectedExpiry(data.records.expiryDates[0]);
      }
    } catch (e) {
      console.error("Failed to fetch option chain", e);
    } finally {
      // setIsFOFetching(false);
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
            <h1 className="title">Option Chain - MAZDOCK</h1>
            <h5 className="subtitle">
              Underlying Value: {optionChainData.records.underlyingValue} |
              Timestamp: {optionChainData.records.timestamp}
            </h5>

            <SummaryCard
              ceData={optionChainData.filtered.CE}
              peData={optionChainData.filtered.PE}
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
        ) : (
          "Please wait..."
        )}
      </Modal>
    </div>
  );
};

export default App;
