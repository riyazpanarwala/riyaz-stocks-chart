import StockAnalysisClient from "./StockAnalysisClient";

export const metadata = {
  title: "Batch Stock Technical Analysis Tool",
  robots: {
    index: false,
    follow: false,
  },
};

export default function StockAnalysisPage() {
  return <StockAnalysisClient />;
}
