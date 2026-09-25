import YahooFinance from "yahoo-finance2";
const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

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
          quotes[idx].dividend = {
            amount: Number(div.amount),
            date: div.date instanceof Date ? div.date.toISOString() : String(div.date),
          };
        }
      }
    }

    if (Array.isArray(rawEvents.splits)) {
      for (const sp of rawEvents.splits) {
        const idx = findQuoteIndex(sp.date);
        if (idx !== -1) {
          quotes[idx].split = {
            splitRatio: String(sp.splitRatio),
            numerator: Number(sp.numerator),
            denominator: Number(sp.denominator),
            date: sp.date instanceof Date ? sp.date.toISOString() : String(sp.date),
          };
        }
      }
    }
  }

  return quotes;
}

export async function getOptionData(symbol) {
  const result = await yahooFinance.options("" + symbol);
  return result;
}

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
