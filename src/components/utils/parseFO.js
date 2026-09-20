"use client";

import { useState, useEffect } from "react";
import { usePapaParse } from "react-papaparse";

// Global cache (persists across hook calls)
let globalFoCache = null;

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
  const [symbols, setSymbols] = useState(() => globalFoCache?.symbols || []);
  const [symbolList, setSymbolList] = useState(() => globalFoCache?.symbolList || []);
  const [symbolSet, setSymbolSet] = useState(() => globalFoCache?.symbolSet || new Set());
  const [isFOLoading, setIsLoading] = useState(!globalFoCache);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (globalFoCache) {
      setSymbols(globalFoCache.symbols);
      setSymbolList(globalFoCache.symbolList);
      setSymbolSet(globalFoCache.symbolSet);
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    async function fetchFromApi() {
      try {
        const res = await fetch("/api/instruments");
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.foSymbols) && data.foSymbols.length > 0) {
            const list = data.foSymbols;
            const lots = data.foLots || {};
            const foObjects = list.map((sym) => ({
              symbol: sym,
              underlying: sym,
              lotSize: lots[sym],
            }));
            const set = new Set(list);

            globalFoCache = {
              symbols: foObjects,
              symbolList: list,
              symbolSet: set,
            };

            if (isMounted) {
              setSymbols(foObjects);
              setSymbolList(list);
              setSymbolSet(set);
              setIsLoading(false);
            }
            return true;
          }
        }
      } catch {
        // Continue to CSV fallback
      }
      return false;
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
                  /^(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)-\d{2}$/i.test(k)
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

            const list = foSymbols.map((item) => item.symbol);
            const set = new Set(list);

            globalFoCache = {
              symbols: foSymbols,
              symbolList: list,
              symbolSet: set,
            };

            if (isMounted) {
              setSymbols(foSymbols);
              setSymbolList(list);
              setSymbolSet(set);
              setIsLoading(false);
            }
          },
        });
      } catch (err) {
        console.error("Error parsing F&O symbols:", err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Failed to parse CSV data");
          setIsLoading(false);
        }
      }
    };

    fetchFromApi().then((success) => {
      if (!success && csvUrl) {
        parseCSV();
      }
    });

    return () => {
      isMounted = false;
    };
  }, [csvUrl, readRemoteFile]);

  const isFOSymbol = (symbol) => symbolSet.has(symbol);

  return { symbols, symbolList, isFOSymbol, isFOLoading, error };
}
