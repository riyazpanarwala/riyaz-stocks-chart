import React, { useEffect, useState } from "react";
import axios from "axios";
import Modal from "../TechnicalInfo/Modal";
import "./Fundamentals.css";

const Fundamentals = ({ companyObj, indexObj, onClose }) => {
  const [fundamentals, setFundamentals] = useState([]);

  const extractFinancials = async () => {
    const headers = { Accept: "application/json" };
    let symbol =
      companyObj.yahooSymbol ||
      `${companyObj.symbol}.${indexObj.value === "BSE_EQ" ? "BO" : "NS"}`;

    try {
      const response = await axios.get(
        `/api/finance?symbol=${symbol}&isQuote=true`,
        { headers }
      );

      const data = [];
      for (const prop in response.data) {
        data.push({ name: prop, value: response.data[prop] });
      }

      setFundamentals(data);
    } catch (error) {
      console.error(
        `Error: ${error.response?.status} - ${error.response?.data}`
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

  if (!fundamentals.length) {
    return "";
  }

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
