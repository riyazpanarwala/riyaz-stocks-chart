import CandleStickChartClient from "./CandleStickChartClient";

export const dynamic = "force-static";

export default function Page() {
  return (
    <main className="page-container">
		
		{/* Interactive chart */}
      <CandleStickChartClient />
      
      {/* Visible SEO content */}
      <section className="page-intro">
        <h1>Live NSE & BSE Candlestick Charts</h1>
        <p>
          Analyze Indian stocks using candlestick charts with RSI, MACD,
          moving averages, breakout patterns, and trendlines.
          Supports both intraday and historical market data.
        </p>
      </section>
    </main>
  );
}