import { NseIndia } from "stock-nse-india";
const nseIndia = new NseIndia();

export const getAllStockSymbols = () => {
  // To get all symbols from NSE
  nseIndia.getAllStockSymbols().then((symbols) => {
    console.log(symbols);
  });
};
