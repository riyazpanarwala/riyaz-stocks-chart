export const intraArr = [
  { label: "Intraday", value: "intraday" },
  { label: "historical", value: "historical" },
];

export const intervalArr = [
  { label: "1 Minute", value: "1minute", apiInterval: 1, apiUnit: "minutes" },
  {
    label: "5 Minute",
    value: "5minute",
    apiInterval: 5,
    apiUnit: "minutes",
  },
  {
    label: "15 Minute",
    value: "15minute",
    apiInterval: 15,
    apiUnit: "minutes",
  },
  {
    label: "30 Minute",
    value: "30minute",
    apiInterval: 30,
    apiUnit: "minutes",
  },
];

export const intervalArr1 = [
  {
    label: "1 Minute",
    value: "1min",
    interval: "1m",
    apiInterval: 1,
    apiUnit: "minutes",
  },
  {
    label: "3 Minute",
    value: "3min",
    interval: "3m",
    apiInterval: 3,
    apiUnit: "minutes",
  },
  {
    label: "5 Minute",
    value: "5min",
    interval: "5m",
    apiInterval: 5,
    apiUnit: "minutes",
  },
  {
    label: "15 Minute",
    value: "15min",
    interval: "15m",
    apiInterval: 15,
    apiUnit: "minutes",
  },
  {
    label: "30 Minute",
    value: "30min",
    interval: "30m",
    apiInterval: 30,
    apiUnit: "minutes",
  },
  {
    label: "1 Hour",
    value: "1hr",
    interval: "1h",
    apiInterval: 1,
    apiUnit: "hours",
  },
  {
    label: "Daily",
    value: "1d",
    interval: "1d",
    apiInterval: 1,
    apiUnit: "days",
  },
  {
    label: "Weekly",
    value: "1wk",
    interval: "1wk",
    apiInterval: 1,
    apiUnit: "weeks",
  },
  {
    label: "Monthly",
    value: "1mo",
    interval: "1mo",
    apiInterval: 1,
    apiUnit: "months",
  },
];

export const periodDays = ["6m", "1y", "2y", "5y", "10y"];
export const periodMinutes = ["1d", "5d", "1m"];
export const periodHours = ["5d", "1m", "2m"];
export const periodMax = ["6m", "1y", "2y", "5y", "10y", "Max"];

export const dateObj = {
  "1d": () => new Date(new Date().setDate(new Date().getDate() - 1)),
  "5d": () => new Date(new Date().setDate(new Date().getDate() - 5)),
  "1m": () => new Date(new Date().setDate(new Date().getDate() - 30)),
  "2m": () => new Date(new Date().setDate(new Date().getDate() - 30 * 2)),
  "3m": () => new Date(new Date().setDate(new Date().getDate() - 30 * 3)),
  "6m": () => new Date(new Date().setDate(new Date().getDate() - 30 * 6)),
  "1y": () => new Date(new Date().setFullYear(new Date().getFullYear() - 1)),
  "2y": () => new Date(new Date().setFullYear(new Date().getFullYear() - 2)),
  "5y": () => new Date(new Date().setFullYear(new Date().getFullYear() - 5)),
  "10y": () => new Date(new Date().setFullYear(new Date().getFullYear() - 10)),
  "20y": () => new Date(new Date().setFullYear(new Date().getFullYear() - 20)),
  Max: () => new Date("2000-01-01"),
};

export const indexArr = [
  { label: "NSE", value: "NSE_EQ" },
  { label: "BSE", value: "BSE_EQ" },
];

export const index1Arr = [
  { label: "NSE INDEX", value: "NSE_INDEX" },
  { label: "BSE INDEX", value: "BSE_INDEX" },
];
