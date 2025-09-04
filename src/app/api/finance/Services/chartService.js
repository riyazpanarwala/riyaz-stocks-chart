import yahooFinance from "yahoo-finance2";

export async function getChartData(symbol, { interval, fromDate, toDate }) {
  const queryObj = { interval, period1: fromDate };

  if (toDate) {
    queryObj.period2 = toDate;
  }

  const result = await yahooFinance.chart(symbol, queryObj);
  return result.quotes.filter((v) => v.close !== null);
}
