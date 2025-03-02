import ism from "@zero65tech/indian-stock-market";

export const isMarketOpen = () => {
  return ism.isOpen();
};
