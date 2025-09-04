export function extractFinancials(data) {
  const { price, defaultKeyStatistics, financialData } = data || {};
  const { regularMarketPrice, marketCap } = price || {};
  const { netIncomeToCommon, sharesOutstanding, trailingEps, bookValue } =
    defaultKeyStatistics || {};
  const { totalDebt, debtToEquity } = financialData || {};

  // Market Cap in Crores (1 Cr = 1e7)
  const marketCapCr = marketCap ? marketCap / 1e7 : null;

  // EPS Calculation
  const eps =
    netIncomeToCommon && sharesOutstanding
      ? netIncomeToCommon / sharesOutstanding
      : trailingEps;

  // PE Ratio
  const peRatio = eps && eps > 0 ? regularMarketPrice / eps : null;

  // Recalculate Book Value
  let recalculatedBookValue = null;
  if (sharesOutstanding && totalDebt && debtToEquity) {
    const equity = totalDebt / debtToEquity;
    recalculatedBookValue = (equity * 100) / sharesOutstanding;
  }

  const format = (val) =>
    val !== null && val !== undefined ? val.toFixed(2) : "N/A";

  return {
    "Price (₹)": format(regularMarketPrice),
    "Market Cap (Cr)": format(marketCapCr),
    "EPS (TTM)": format(eps),
    "PE (TTM)": format(peRatio),
    "Book Value (Recalc)": format(recalculatedBookValue),
    "Book Value (Reported)": format(bookValue),
  };
}
