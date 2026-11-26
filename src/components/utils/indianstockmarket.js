import ism from "@zero65tech/indian-stock-market";

export const isMarketOpen = () => {
  return ism.isOpen();
};

export const isHoliday = (date) => {
  return ism.isHoliday(date);
};

export const isMcxMarketOpen = (now = Date.now()) => {
  const date = new Date(now);
  if (ism.isHoliday(date)) return false;
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
  }).format(date);
  if (weekday === "Sat" || weekday === "Sun") return false;
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
  return time >= "09:00" && time <= "23:30";
};
