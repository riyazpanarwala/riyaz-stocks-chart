export const intraArr = [
  { label: "Intraday", value: "intraday" },
  { label: "historical", value: "historical" },
];

export const intervalArr = [
  { label: "1 Minute", value: "1minute" },
  { label: "5 Minute", value: "5minute", val: 5 },
  { label: "15 Minute", value: "15minute", val: 15 },
  { label: "30 Minute", value: "30minute" },
];

export const intervalArr1 = [
  { label: "Daily", value: "day" },
  { label: "Weekly", value: "week" },
  { label: "Monthly", value: "month" },
];

export const periods = ["6m", "1y", "2y", "5y"];

export const dateObj = {
  // "1m": () => new Date(new Date().setDate(new Date().getDate() - 30)),
  // "3m": () => new Date(new Date().setDate(new Date().getDate() - 30 * 3)),
  "6m": () => new Date(new Date().setDate(new Date().getDate() - 30 * 6)),
  "1y": () => new Date(new Date().setFullYear(new Date().getFullYear() - 1)),
  "2y": () => new Date(new Date().setFullYear(new Date().getFullYear() - 2)),
  "5y": () => new Date(new Date().setFullYear(new Date().getFullYear() - 5)),
};

export const indexArr = [
  { label: "NSE", value: "NSE_EQ" },
  { label: "BSE", value: "BSE_EQ" },
];

export const index1Arr = [
  { label: "NSE INDEX", value: "NSE_INDEX" },
  { label: "BSE INDEX", value: "BSE_INDEX" },
];
