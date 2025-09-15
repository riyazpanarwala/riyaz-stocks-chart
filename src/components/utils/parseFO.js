"use client";

import { useState, useEffect } from "react";
import { usePapaParse } from "react-papaparse";

// Global cache (persists across hook calls)
const csvCache = {};

export function useFOSymbols(csvUrl = "/fo_mktlots.csv") {
  const { readRemoteFile } = usePapaParse();
  const [symbols, setSymbols] = useState([]);
  const [symbolList, setSymbolList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
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

            const foSymbols = results.data
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
              .map((row) => ({
                symbol: (row.SYMBOL || row.Symbol)?.trim(),
                underlying: (row.UNDERLYING || row.underlying)?.trim(),
                lotSize: row["SEP-25"] || row["OCT-25"] || row["NOV-25"],
              }))
              .filter((item) => item.symbol && item.symbol !== "");

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

  return { symbols, symbolList, isFOSymbol, isLoading, error };
}
