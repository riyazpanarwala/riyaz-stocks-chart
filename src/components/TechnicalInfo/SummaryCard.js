import React from "react";
import "./SummaryCard.scss";

const SummaryCard = ({ title, value, status }) => {
  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">{title}</span>
        <span className={`status ${status === "Bearish" ? "red" : "green"}`}>
          {status} {value}
        </span>
      </div>
      <div className="progress-bar">
        <div
          className={`progress ${status === "Bearish" ? "red" : "green"}`}
          style={{ width: `${(value / 6) * 100}%` }}
        ></div>
      </div>
    </div>
  );
};

export default SummaryCard;
