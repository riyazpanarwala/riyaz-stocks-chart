import React from "react";
import "./Table.css";

const Table = ({ title, columns, data }) => {
  return (
    <div className="table-container">
      <h2 className="table-title">{title}</h2>
      <table>
        <thead>
          <tr>
            {columns.map((col, index) => (
              <th key={index}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr key={index}>
              {Object.values(row).map((value, idx) => {
                let newVal = "";
                if (idx === 1) {
                  newVal = value.split(",");
                }

                return (
                  <td
                    key={idx}
                    className={value === "Bearish" ? "red-text" : "blue"}
                  >
                    {newVal ? newVal.map((v, i) => <p key={i}>{v}</p>) : value}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Table;
