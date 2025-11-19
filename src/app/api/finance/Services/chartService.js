import YahooFinance from "yahoo-finance2";
const yahooFinance = new YahooFinance()

export async function getChartData(symbol, { interval, fromDate, toDate }) {
  const queryObj = { interval, period1: fromDate };

  if (toDate) {
    queryObj.period2 = toDate;
  }

  const result = await yahooFinance.chart(symbol, queryObj);
  return result.quotes.filter((v) => v.close !== null);
}

export async function getOptionData(symbol) {
  const result = await yahooFinance.options('' + symbol);
  return result;
}

export async function getHistoricalData(symbol, { interval, fromDate, toDate }) {
  const queryObj = { interval, period1: fromDate };

  if (toDate) {
    queryObj.period2 = toDate;
  } else {
    queryObj.period2 = new Date().toJSON();
  }

  const result = await yahooFinance.historical(symbol, queryObj);
  return result;
}
