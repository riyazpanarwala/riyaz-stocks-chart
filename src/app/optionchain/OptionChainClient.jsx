"use client";

import OptionChain from "../../components/OptionChainNew/index.jsx";

export default function OptionChainClient() {
  return (
    <div>
      <h1 className="sr-only" style={{
        position: "absolute",
        width: "1px",
        height: "1px",
        padding: "0",
        margin: "-1px",
        overflow: "hidden",
        clip: "rect(0, 0, 0, 0)",
        whiteSpace: "nowrap",
        borderWidth: "0"
      }}>
        Live NSE Option Chain Analysis &amp; Open Interest Data
      </h1>
      <OptionChain />
    </div>
  );
}
