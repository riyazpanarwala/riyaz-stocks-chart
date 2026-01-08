import CandleStickChartClient from "./CandleStickChartClient";

export const dynamic = "force-static";

export const metadata = {
  title: "Live NSE & BSE Stock Candlestick Charts | Riyaz Stocks",
  description: "Free interactive candlestick charts for Indian stocks. Analyze NSE/BSE data with RSI, MACD, and technical indicators.",
  keywords: ["NSE", "BSE", "Stock Charts", "Candlestick", "Technical Analysis"],
  robots: {
    index: true,
    follow: true,
  },
};

export default function Page() {
  return (
    <main>
      <section style={{ padding: '5px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '20px' }}>Indian Stock Market Live Charts</h1>
      </section>
      <CandleStickChartClient />
    </main>
  );
}