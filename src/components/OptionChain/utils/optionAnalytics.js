import { detectStrikeStep } from "./strikeUtils";

/**
 * Helper to calculate Max Pain
 * Iterates through all strikes to find the one with the minimum total value loss for buyers
 */
const calculateMaxPain = (data) => {
  let minPain = Infinity;
  let maxPainStrike = 0;

  // We use the full formatted list to find the "pain" at each possible strike
  data.forEach((potentialExpiry) => {
    const expiryStrike = potentialExpiry.strike;
    let totalPain = 0;

    data.forEach((strikeData) => {
      const strike = strikeData.strike;

      // Call Pain: If market expires ABOVE strike, buyers gain (expiry - strike)
      // Sellers lose that amount * Open Interest
      if (expiryStrike > strike) {
        totalPain += (expiryStrike - strike) * strikeData.callOI;
      }
      // Put Pain: If market expires BELOW strike
      else if (expiryStrike < strike) {
        totalPain += (strike - expiryStrike) * strikeData.putOI;
      }
    });

    if (totalPain < minPain) {
      minPain = totalPain;
      maxPainStrike = expiryStrike;
    }
  });

  return maxPainStrike;
};

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

  const maxPainStrike = calculateMaxPain(formatted);

  const expiries = Array.from(expirySet);

  const atmStrike = formatted.reduce((prev, curr) =>
    Math.abs(curr.strike - spot) < Math.abs(prev.strike - spot) ? curr : prev,
  ).strike;

  const totalCall = formatted.reduce((a, b) => a + b.callOI, 0);
  const totalPut = formatted.reduce((a, b) => a + b.putOI, 0);
  const PCR = totalCall > 0 ? totalPut / totalCall : 0;

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
    maxPainStrike,
    spotPrice: spot,
  };
};
