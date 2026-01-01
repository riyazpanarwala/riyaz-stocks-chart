import CandleStickChartClient from "./CandleStickChartClient";

export const dynamic = "force-static";

export default function Page() {
  return (
    <>
      <section className="seo-content">
        <h2>Live NSE & BSE Candlestick Charts</h2>
        <p>
          Analyze Indian stocks using RSI, MACD, moving averages, breakout patterns,
          and trendlines. Supports intraday and historical data.
        </p>
      </section>

      <CandleStickChartClient />
    </>
  );
}