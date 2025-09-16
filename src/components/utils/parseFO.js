"use client";

import { useState, useEffect } from "react";
import { usePapaParse } from "react-papaparse";

// Global cache (persists across hook calls)
const csvCache = {};

export const FO_INDEX_SYMBOLS = [
  { symbol: "NIFTY 50", underlying: "NIFTY", lotSize: 75 },
  { symbol: "NIFTY BANK", underlying: "BANKNIFTY", lotSize: 35 },
  { symbol: "NIFTY NEXT 50", underlying: "NIFTYNXT50", lotSize: 25 },
  { symbol: "NIFTY FINANCIAL SERVICES", underlying: "FINNIFTY", lotSize: 65 },
];

export function useFOSymbols(csvUrl = "/fo_mktlots.csv") {
  const { readRemoteFile } = usePapaParse();
  const [symbols, setSymbols] = useState([]);
  const [symbolList, setSymbolList] = useState([]);
  const [isFOLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!csvUrl) return;

    // If cached, use it immediately
    if (csvCache[csvUrl]) {
      setSymbols(csvCache[csvUrl]);
      setSymbolList(csvCache[csvUrl].map((item) => item.symbol));
      setIsLoading(false);
      return;
    }

    const parseCSV = () => {
      try {
        setIsLoading(true);
        setError(null);

        readRemoteFile(csvUrl, {
          download: true,
          header: true,
          skipEmptyLines: true,
          transformHeader: (header) => header.trim(),
          transform: (value) => value.trim(),
          complete: (results) => {
            if (results.errors && results.errors.length > 0) {
              setError(`CSV parsing errors: ${JSON.stringify(results.errors)}`);
              setIsLoading(false);
              return;
            }

            let foSymbols = results.data
              .filter((row) => {
                const symbol = row.SYMBOL || row.Symbol;
                return (
                  symbol &&
                  !symbol.includes("NIFTY") &&
                  !symbol.includes("BANKNIFTY") &&
                  !symbol.includes("FINNIFTY") &&
                  !symbol.includes("MIDCPNIFTY") &&
                  symbol !== "Symbol" &&
                  symbol !== "UNDERLYING"
                );
              })
              .map((row) => {
                const symbol = (row.SYMBOL || row.Symbol)?.trim();
                const underlying = (row.UNDERLYING || row.underlying)?.trim();
                const monthKeys = Object.keys(row).filter((k) =>
                  /^(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)-\d{2}$/i.test(
                    k
                  )
                );
                const lastMonth = monthKeys
                  .sort((a, b) => a.localeCompare(b))
                  .pop();
                const lotSize =
                  Number(
                    row["LOT_SIZE"] ??
                      row["LOT SIZE"] ??
                      (lastMonth ? row[lastMonth] : undefined)
                  ) || undefined;
                return { symbol, underlying, lotSize };
              })
              .filter((item) => item.symbol && item.symbol !== "");

            foSymbols = [...foSymbols, ...FO_INDEX_SYMBOLS];
            // Save to cache
            csvCache[csvUrl] = foSymbols;

            setSymbols(foSymbols);
            setSymbolList(foSymbols.map((item) => item.symbol));
            setIsLoading(false);
          },
        });
      } catch (err) {
        console.error("Error parsing F&O symbols:", err);
        setError(
          err instanceof Error ? err.message : "Failed to parse CSV data"
        );
        setIsLoading(false);
      }
    };

    parseCSV();
  }, [csvUrl, readRemoteFile]);

  const isFOSymbol = (symbol) => symbolList.includes(symbol);

  return { symbols, symbolList, isFOSymbol, isFOLoading, error };
}
