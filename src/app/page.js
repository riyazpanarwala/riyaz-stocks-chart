import CandleStickChartClient from "./CandleStickChartClient";

export const dynamic = "force-static";

export const metadata = {
  title: "Live NSE & BSE Stock Candlestick Charts | Riyaz Stocks",
  description: "Free interactive candlestick charts for Indian stocks. Analyze NSE/BSE data with RSI, MACD, and technical indicators.",
  keywords: ["NSE", "BSE", "Stock Charts", "Candlestick", "Technical Analysis"],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

const headerStyle = {
  padding: '5px',
  textAlign: 'center',
};

const h1Style = {
  fontSize: '20px',
};

export default function Page() {
  return (
    <main>
      <section style={headerStyle}>
        <h1 style={h1Style}>Indian Stock Market Live Charts</h1>
      </section>
      <CandleStickChartClient />
    </main>
  );
}