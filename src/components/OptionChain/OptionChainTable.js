import React, { useMemo } from "react";

const OptionChainTable = ({ data, expiryDate }) => {
  const filteredData = useMemo(
    () => data.records.data.filter((item) => item.expiryDate === expiryDate),
    [data, expiryDate]
  );

  return (
    <div className="table-container-optionchain">
      <table className="option-table">
        <thead>
          <tr>
            <th colSpan="6" className="section-header">
              Call Options
            </th>
            <th>Strike Price</th>
            <th colSpan="6" className="section-header">
              Put Options
            </th>
          </tr>
          <tr>
            <th>Last Price</th>
            <th>Change</th>
            <th>% Change</th>
            <th>Open Interest</th>
            <th>Volume</th>
            <th>Implied Volatility</th>
            <th></th>
            <th>Implied Volatility</th>
            <th>Volume</th>
            <th>Open Interest</th>
            <th>% Change</th>
            <th>Change</th>
            <th>Last Price</th>
          </tr>
        </thead>
        <tbody>
          {filteredData.map((item) => (
            <tr key={`${item.strikePrice}-${item.expiryDate}`}>
              <td>{item.CE?.lastPrice || "-"}</td>
              <td className={item.CE?.change >= 0 ? "positive" : "negative"}>
                {item.CE?.change?.toFixed(2) || "-"}
              </td>
              <td className={item.CE?.pChange >= 0 ? "positive" : "negative"}>
                {item.CE?.pChange?.toFixed(2) || "-"}%
              </td>
              <td>{item.CE?.openInterest || "-"}</td>
              <td>{item.CE?.totalTradedVolume || "-"}</td>
              <td>{item.CE?.impliedVolatility || "-"}</td>
              <td className="strike-price">{item.strikePrice}</td>
              <td>{item.PE?.impliedVolatility || "-"}</td>
              <td>{item.PE?.totalTradedVolume || "-"}</td>
              <td>{item.PE?.openInterest || "-"}</td>
              <td className={item.PE?.pChange >= 0 ? "positive" : "negative"}>
                {item.PE?.pChange?.toFixed(2) || "-"}%
              </td>
              <td className={item.PE?.change >= 0 ? "positive" : "negative"}>
                {item.PE?.change?.toFixed(2) || "-"}
              </td>
              <td>{item.PE?.lastPrice || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default OptionChainTable;
