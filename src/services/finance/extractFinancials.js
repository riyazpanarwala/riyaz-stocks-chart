export function extractFinancials(data) {
  const { price, defaultKeyStatistics, financialData, summaryDetail } =
    data || {};
  const { regularMarketPrice, marketCap } = price || {};
  const { netIncomeToCommon, sharesOutstanding, trailingEps, bookValue } =
    defaultKeyStatistics || {};
  const { totalDebt, debtToEquity, ebitda } = financialData || {};
  const { fiftyTwoWeekHigh, fiftyTwoWeekLow } = summaryDetail || {};

  // Market Cap in Crores (1 Cr = 1e7)
  const marketCapCr = marketCap ? marketCap / 1e7 : null;

  // EPS Calculation
  const eps =
    netIncomeToCommon && sharesOutstanding
      ? netIncomeToCommon / sharesOutstanding
      : trailingEps;

  // PE Ratio
  const peRatio = eps && eps > 0 ? regularMarketPrice / eps : null;

  // Equity from Book Value
  const equity =
    bookValue && sharesOutstanding ? bookValue * sharesOutstanding : null;

  // Recalculate Book Value (if debt + D/E available)
  let recalculatedBookValue = null;
  if (sharesOutstanding && totalDebt && debtToEquity) {
    const equityFromDE = totalDebt / debtToEquity;
    recalculatedBookValue = (equityFromDE * 100) / sharesOutstanding;
  }

  // ROE = Net Income / Equity
  const roe =
    netIncomeToCommon && equity && equity > 0
      ? (netIncomeToCommon / equity) * 100
      : null;

  // ROCE = EBIT / (Debt + Equity)
  // Approximate EBIT = EBITDA (since depreciation is not in JSON)
  const capitalEmployed =
    equity && totalDebt ? equity + totalDebt : equity || null;

  const roce =
    ebitda && capitalEmployed && capitalEmployed > 0
      ? (ebitda / capitalEmployed) * 100
      : null;

  // 52 Week Range calculations
  let rangeDisplay = "N/A";
  let rangePercentages = "N/A";

  if (fiftyTwoWeekLow && fiftyTwoWeekHigh && regularMarketPrice) {
    rangeDisplay = `${fiftyTwoWeekLow.toFixed(2)} / ${fiftyTwoWeekHigh.toFixed(
      2
    )}`;

    const fromLowPct =
      ((regularMarketPrice - fiftyTwoWeekLow) / fiftyTwoWeekLow) * 100;

    const fromHighPct =
      ((fiftyTwoWeekHigh - regularMarketPrice) / fiftyTwoWeekHigh) * 100;

    rangePercentages = `↑${fromLowPct.toFixed(2)}% | ↓${fromHighPct.toFixed(
      2
    )}%`;
  }

  // PEG Ratio Calculation
  let pegRatio = null;
  if (peRatio && financialData?.earningsGrowth) {
    const growthPct = financialData.earningsGrowth * 100; // convert -0.202 → -20.2%
    if (growthPct !== 0) {
      pegRatio = peRatio / growthPct;
    }
  }

  const format = (val, suffix = "") =>
    val !== null && val !== undefined ? `${val.toFixed(2)}${suffix}` : "N/A";

  return {
    "Current Price (₹)": format(regularMarketPrice),
    "Market Cap (Cr)": format(marketCapCr),
    "EPS (TTM)": format(eps),
    "PE (TTM)": format(peRatio),
    "Book Value (Reported)": format(bookValue),
    "Book Value (Using Debt)": format(recalculatedBookValue),
    "ROE (%)": format(roe, "%"),
    "ROCE (%)": format(roce, "%"),
    "52W Low/High (₹)": rangeDisplay,
    "52W % Change Low/High": rangePercentages,
    "PEG Ratio": format(pegRatio),
  };
}
