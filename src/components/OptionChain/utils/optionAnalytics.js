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

  const nearStrikes = formatted
    .sort((a, b) => a.strike - b.strike)
    .filter((d) => Math.abs(d.strike - spot) <= range * 50);
  // 50 for NIFTY strike step

  // Resistance (Call writers)
  const resistance = [...nearStrikes]
    .sort((a, b) => b.callOI + b.callChange - (a.callOI + a.callChange))
    .slice(0, 2)
    .map((d) => d.strike);

  // Support (Put writers)
  const support = [...nearStrikes]
    .sort((a, b) => b.putOI + b.putChange - (a.putOI + a.putChange))
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
  };
};
