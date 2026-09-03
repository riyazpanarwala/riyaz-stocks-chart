import React, { useEffect, useState } from "react";
import Modal from "../TechnicalInfo/Modal";
import { getFinanceDataAction } from "../../app/actions/finance";
import "./Fundamentals.css";

const Fundamentals = ({ companyObj, indexObj, onClose }) => {
  const [fundamentals, setFundamentals] = useState([]);

  const extractFinancials = async () => {
    let symbol =
      companyObj.yahooSymbol ||
      `${companyObj.symbol}.${indexObj.value === "BSE_EQ" ? "BO" : "NS"}`;

    try {
      const response = await getFinanceDataAction({
        symbol,
        isQuote: true,
      });

      const data = [];
      for (const prop in response) {
        if (prop !== "error") {
          data.push({ name: prop, value: response[prop] });
        }
      }

      setFundamentals(data);
    } catch (error) {
      console.error(
        `Error extracting financials:`, error
      );
      setFundamentals([]);
    }
  };


  useEffect(() => {
    setFundamentals([]);

    if (indexObj.value === "NSE_EQ" || indexObj.value === "BSE_EQ") {
      extractFinancials();
    }
  }, [companyObj, indexObj]);

  return (
    <div className="container">
      <Modal isOpen={true} onClose={onClose}>
        <div className="fundamentals-card">
          <div className="fundamentals-grid">
            {fundamentals.map((item, idx) => (
              <div key={idx} className="fundamentals-item">
                <span className="fundamentals-name">{item.name}</span>
                <span className="fundamentals-value">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Fundamentals;
