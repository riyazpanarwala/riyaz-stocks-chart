import ism from "@zero65tech/indian-stock-market";

export const isMarketOpen = () => {
  return ism.isOpen();
};

export const isHoliday = () => {
  return ism.isHoliday();
};

export const hasOpened = () => {
  return ism.hasOpened();
};
