import { detectStrikeStep } from "./strikeUtils";

export const processOptionData = (json) => {
  const spot = json.records.underlyingValue;
  const rows = json.records.data;

  const expirySet = new Set();

  const formatted = rows.map((r) => {
    const CE = r.CE || {};
    const PE = r.PE || {};

    const expiry = r.expiryDates;
    if (expiry) {
      expirySet.add(expiry);
    }

    return {
      strike: r.strikePrice,
      expiry,

      callOI: CE.openInterest || 0,
      putOI: PE.openInterest || 0,

      callChange: CE.changeinOpenInterest || 0,
      putChange: PE.changeinOpenInterest || 0,

      callPriceChange: CE.pChange || 0,
      putPriceChange: PE.pChange || 0,
    };
  });

  const expiries = Array.from(expirySet);

  const atmStrike = formatted.reduce((prev, curr) =>
    Math.abs(curr.strike - spot) < Math.abs(prev.strike - spot) ? curr : prev,
  ).strike;

  const totalCall = formatted.reduce((a, b) => a + b.callOI, 0);
  const totalPut = formatted.reduce((a, b) => a + b.putOI, 0);

  const PCR = totalPut / totalCall;

  // consider strikes near ATM
  const range = 10; // number of strikes around ATM
  const step = detectStrikeStep(formatted);

  const nearStrikes = formatted
    .sort((a, b) => a.strike - b.strike)
    .filter((d) => Math.abs(d.strike - spot) <= range * step);

  // Resistance (Call writers)
  const resistance = [...nearStrikes]
    .sort((a, b) => {
      const aScore = a.callOI + Math.max(a.callChange, 0);
      const bScore = b.callOI + Math.max(b.callChange, 0);

      return bScore - aScore;
    })
    .slice(0, 2)
    .map((d) => d.strike);

  // Support (Put writers)
  const support = [...nearStrikes]
    .sort((a, b) => {
      const aScore = a.putOI + Math.max(a.putChange, 0);
      const bScore = b.putOI + Math.max(b.putChange, 0);

      return bScore - aScore;
    })
    .slice(0, 2)
    .map((d) => d.strike);

  const buildUp = (price, oi) => {
    if (price > 0 && oi > 0) return "Long Build-up";
    if (price < 0 && oi > 0) return "Short Build-up";
    if (price > 0 && oi < 0) return "Short Covering";
    if (price < 0 && oi < 0) return "Long Unwinding";

    return "Neutral";
  };

  const buildUpData = formatted.map((d) => ({
    strike: d.strike,
    callBuildUp: buildUp(d.callPriceChange, d.callChange),
    putBuildUp: buildUp(d.putPriceChange, d.putChange),
  }));

  return {
    data: formatted,
    expiries,
    atmStrike,
    spot,
    PCR,
    resistance,
    support,
    buildUpData,
    step,
  };
};
