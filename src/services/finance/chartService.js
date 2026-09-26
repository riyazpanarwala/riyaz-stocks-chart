import YahooFinance from "yahoo-finance2";
const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

// Corporate actions are independent of the provider used for chart prices.
export async function getCorporateActions(symbol, { fromDate, toDate } = {}) {
  const result = await yahooFinance.chart(symbol, {
    interval: "1d",
    period1: fromDate,
    ...(toDate ? { period2: toDate } : {}),
    events: "div|split",
  });
  return result?.events ?? {};
}

/**
 * Fetches chart candle data and corporate action events (dividends and splits)
 * for a given symbol from Yahoo Finance.
 *
 * Each mapped quote contains:
 * - `dividends`: Array of dividend events mapped to this candle
 * - `dividend`: First dividend event (for backwards compatibility)
 * - `splits`: Array of stock split events mapped to this candle
 * - `split`: First split event (for backwards compatibility)
 *
 * @param {string} symbol - Equity ticker (e.g. "TCS.NS", "^NSEI")
 * @param {object} [options] - Query options
 * @param {string} [options.interval] - Granularity ("1d", "1wk", "1mo", etc.)
 * @param {string|Date} [options.fromDate] - Start date
 * @param {string|Date} [options.toDate] - End date
 * @returns {Promise<Array<object>>} Filtered quote candles with corporate actions
 */
export async function getChartData(symbol, { interval, fromDate, toDate } = {}) {
  const queryObj = {
    interval,
    period1: fromDate,
    events: "capitalGain|div|split",
  };

  if (toDate) {
    queryObj.period2 = toDate;
  }

  const result = await yahooFinance.chart(symbol, queryObj);
  const quotes = (result?.quotes ?? []).filter((v) => v.close !== null);
  const rawEvents = result?.events ?? {};

  if (quotes.length > 0 && (rawEvents.dividends?.length || rawEvents.splits?.length)) {
    const toDateKey = (d) => {
      try {
        return new Date(d).toISOString().slice(0, 10);
      } catch {
        return String(d).slice(0, 10);
      }
    };

    const quoteDateMap = new Map();
    quotes.forEach((q, idx) => {
      quoteDateMap.set(toDateKey(q.date), idx);
    });

    const findQuoteIndex = (eventDate) => {
      const key = toDateKey(eventDate);
      if (quoteDateMap.has(key)) return quoteDateMap.get(key);
      return quotes.findIndex((q) => toDateKey(q.date) >= key);
    };

    if (Array.isArray(rawEvents.dividends)) {
      for (const div of rawEvents.dividends) {
        const idx = findQuoteIndex(div.date);
        if (idx !== -1) {
          const divObj = {
            amount: Number(div.amount),
            date: div.date instanceof Date ? div.date.toISOString() : String(div.date),
          };
          quotes[idx].dividends = quotes[idx].dividends || [];
          quotes[idx].dividends.push(divObj);
          quotes[idx].dividend = quotes[idx].dividends[0];
        }
      }
    }

    if (Array.isArray(rawEvents.splits)) {
      for (const sp of rawEvents.splits) {
        const idx = findQuoteIndex(sp.date);
        if (idx !== -1) {
          const splitObj = {
            splitRatio: String(sp.splitRatio),
            numerator: Number(sp.numerator),
            denominator: Number(sp.denominator),
            date: sp.date instanceof Date ? sp.date.toISOString() : String(sp.date),
          };
          quotes[idx].splits = quotes[idx].splits || [];
          quotes[idx].splits.push(splitObj);
          quotes[idx].split = quotes[idx].splits[0];
        }
      }
    }
  }

  return quotes;
}

/**
 * Fetches current option chain data for a symbol from Yahoo Finance.
 *
 * @param {string|number} symbol - Equity ticker or symbol identifier
 * @returns {Promise<object>} Raw option chain payload
 */
export async function getOptionData(symbol) {
  const result = await yahooFinance.options("" + symbol);
  return result;
}

/**
 * Fetches historical quote records for a symbol from Yahoo Finance.
 *
 * @param {string} symbol - Equity ticker
 * @param {object} [options] - Query options
 * @param {string} [options.interval] - Candle interval
 * @param {string|Date} [options.fromDate] - Start date
 * @param {string|Date} [options.toDate] - End date (defaults to now)
 * @returns {Promise<Array<object>>} Historical quotes array
 */
export async function getHistoricalData(symbol, { interval, fromDate, toDate } = {}) {
  const queryObj = { interval, period1: fromDate };

  if (toDate) {
    queryObj.period2 = toDate;
  } else {
    queryObj.period2 = new Date().toJSON();
  }

  const result = await yahooFinance.historical(symbol, queryObj);
  return result;
}
