"use client";

import { useState, useEffect } from "react";
import { usePapaParse } from "react-papaparse";

// Global cache (persists across hook calls)
const csvCache = {};

const FO_MONTHS = {
  JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
  JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11,
};

function parseFoMonthKey(key) {
  const parts = String(key || "").trim().toUpperCase().split("-");
  const month = FO_MONTHS[parts[0]] ?? 0;
  const year = 2000 + Number(parts[1] || 0);
  return year * 12 + month;
}

export function useFOSymbols(csvUrl = "/fo_mktlots.csv") {
  const { readRemoteFile } = usePapaParse();
  const [symbols, setSymbols] = useState([]);
  const [symbolList, setSymbolList] = useState([]);
  const [symbolSet, setSymbolSet] = useState(new Set());
  const [isFOLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!csvUrl) return;

    // If cached, use it immediately
    if (csvCache[csvUrl]) {
      const data = csvCache[csvUrl];
      setSymbols(data);
      const list = data.map((item) => item.symbol);
      setSymbolList(list);
      setSymbolSet(new Set(list));
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
                return symbol && symbol !== "Symbol" && symbol !== "UNDERLYING";
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
                  .sort((a, b) => parseFoMonthKey(a) - parseFoMonthKey(b))
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

            // Save to cache
            csvCache[csvUrl] = foSymbols;

            const list = foSymbols.map((item) => item.symbol);
            setSymbols(foSymbols);
            setSymbolList(list);
            setSymbolSet(new Set(list));
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

  const isFOSymbol = (symbol) => symbolSet.has(symbol);

  return { symbols, symbolList, isFOSymbol, isFOLoading, error };
}


