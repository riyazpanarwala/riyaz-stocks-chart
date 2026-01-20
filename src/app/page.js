import CandleStickChartClient from "./CandleStickChartClient";

export const dynamic = "force-static";

export const metadata = {
  title: "Live NSE & BSE Stock Candlestick Charts | Riyaz Panarwala Stocks",
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

export default function Page() {
  return (
    <main>
      <CandleStickChartClient />
    </main>
  );
}