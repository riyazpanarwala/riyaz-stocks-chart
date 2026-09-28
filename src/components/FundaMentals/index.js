import React, { useEffect, useState } from "react";
import Modal from "../TechnicalInfo/Modal";
import { getFinanceDataAction } from "../../app/actions/finance";
import HistoricalTrends from "./HistoricalTrends";
import "./Fundamentals.css";

const Fundamentals = ({ companyObj, indexObj, onClose }) => {
  const [activeTab, setActiveTab] = useState("trends"); // "trends" | "ratios"
  const [fundamentals, setFundamentals] = useState([]);
  const [loadingSnapshot, setLoadingSnapshot] = useState(false);

  const symbol =
    companyObj?.yahooSymbol ||
    (companyObj?.symbol
      ? `${companyObj.symbol}.${indexObj?.value === "BSE_EQ" ? "BO" : "NS"}`
      : "");

  useEffect(() => {
    let isCancelled = false;
    setFundamentals([]);

    const fetchSnapshot = async () => {
      if (!symbol) return;
      if (indexObj?.value !== "NSE_EQ" && indexObj?.value !== "BSE_EQ") return;

      setLoadingSnapshot(true);
      try {
        const response = await getFinanceDataAction({
          symbol,
          isQuote: true,
        });

        if (isCancelled) return;

        const data = [];
        for (const prop in response) {
          if (prop !== "error") {
            data.push({ name: prop, value: response[prop] });
          }
        }

        setFundamentals(data);
      } catch (error) {
        if (isCancelled) return;
        console.error(`Error extracting financials:`, error);
        setFundamentals([]);
      } finally {
        if (!isCancelled) {
          setLoadingSnapshot(false);
        }
      }
    };

    fetchSnapshot();

    return () => {
      isCancelled = true;
    };
  }, [companyObj, indexObj, symbol]);

  return (
    <div className="container">
      <Modal isOpen={true} onClose={onClose}>
        <div className="fundamentals-card">
          {/* Header with Stock Name & Tabs */}
          <div className="fundamentals-header">
            <div className="fundamentals-header-left">
              <h2 className="fundamentals-title">
                {companyObj?.name || companyObj?.symbol || "Stock Fundamentals"}
              </h2>
              {symbol && (
                <span className="fundamentals-symbol-badge">{symbol}</span>
              )}
            </div>

            <div className="fundamentals-tabs">
              <button
                type="button"
                className={`fundamentals-tab-btn ${
                  activeTab === "trends" ? "active" : ""
                }`}
                onClick={() => setActiveTab("trends")}
              >
                Historical Trends
              </button>
              <button
                type="button"
                className={`fundamentals-tab-btn ${
                  activeTab === "ratios" ? "active" : ""
                }`}
                onClick={() => setActiveTab("ratios")}
              >
                Key Ratios
              </button>
            </div>
          </div>

          {/* Tab 1: Historical Financial Trends */}
          {activeTab === "trends" && <HistoricalTrends symbol={symbol} />}

          {/* Tab 2: Snapshot Key Ratios Grid */}
          {activeTab === "ratios" && (
            <div className="fundamentals-grid">
              {loadingSnapshot ? (
                <div
                  className="trends-loader"
                  style={{ gridColumn: "1 / -1", padding: "40px" }}
                >
                  <div className="spinner" />
                  <span>Loading snapshot ratios...</span>
                </div>
              ) : fundamentals.length === 0 ? (
                <div
                  className="trends-empty"
                  style={{ gridColumn: "1 / -1", padding: "40px" }}
                >
                  No snapshot data available for this symbol.
                </div>
              ) : (
                fundamentals.map((item, idx) => (
                  <div key={idx} className="fundamentals-item">
                    <span className="fundamentals-name">{item.name}</span>
                    <span className="fundamentals-value">{item.value}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default Fundamentals;
