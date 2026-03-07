import { useState, useEffect } from "react";
import Modal from "../TechnicalInfo/Modal";
import { getNSEData } from "../getIntervalData";
import foMapData from "../utils/FOmap.js";
import OptionDashboard from "./OptionDashboard";
import { transformData } from "./utils/transformData";

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
      let data = await getNSEData(apiName, symbol);
      if (apiName === "optionChain") {
        data = transformData(data);
      }
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
        <h1 className="title">Option Chain - {companyObj.label}</h1>
        {optionChainData.records ? (
          <>
            <h5 className="subtitle">
              Underlying Value: {optionChainData.records.underlyingValue} |
              Timestamp: {optionChainData.records.timestamp}
            </h5>
            <OptionDashboard
              optionChainData={optionChainData}
              selectedExpiry={selectedExpiry}
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
