export const transformData = (equityFO) => {
  const rawData = equityFO.data;

  // 1. Extract unique expiry dates and strike prices for the records object
  const expiryDates = [
    ...new Set(rawData.map((item) => item.expiryDate)),
  ].sort();
  const strikePrices = [
    ...new Set(
      rawData
        .filter((item) => item.strikePrice !== null)
        .map((item) => parseFloat(item.strikePrice).toString()),
    ),
  ].sort((a, b) => a - b);

  // 2. Group instruments by strikePrice
  const groupedData = rawData.reduce((acc, item) => {
    // Skip futures (FUTSTK) or entries without a valid strike price if only options are needed
    if (item.instrumentType === "FUTSTK") return acc;

    const strike = parseFloat(item.strikePrice);

    if (!acc[strike]) {
      acc[strike] = {
        expiryDates: item.expiryDate, // Current entry's expiry
        CE: null,
        PE: null,
        strikePrice: strike,
      };
    }

    // Assign the object to either CE or PE
    if (item.optionType === "CE") {
      acc[strike].CE = { ...item, strikePrice: strike };
    } else if (item.optionType === "PE") {
      acc[strike].PE = { ...item, strikePrice: strike };
    }

    return acc;
  }, {});

  // 3. Construct the final FO.json structure
  return {
    records: {
      timestamp: new Date()
        .toLocaleString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
        .replace(/\//g, "-"),
      underlyingValue: rawData[0]?.underlyingValue || 0,
      data: Object.values(groupedData),
      expiryDates: expiryDates,
      strikePrices: strikePrices,
    },
  };
};

// Usage in your React Component:
// const foData = transformToFOFormat(equityFOData);
