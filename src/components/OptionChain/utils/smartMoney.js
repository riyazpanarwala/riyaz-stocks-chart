export const detectSmartMoney = (data) => {
  if (!data?.length) return null;

  let largeCallChange = 0;
  let largePutChange = 0;

  data.forEach((d) => {
    if (d.callChangeOI > largeCallChange) {
      largeCallChange = d.callChangeOI;
    }

    if (d.putChangeOI > largePutChange) {
      largePutChange = d.putChangeOI;
    }
  });

  if (largePutChange > largeCallChange) {
    return "SMART MONEY BUYING";
  }

  if (largeCallChange > largePutChange) {
    return "SMART MONEY SELLING";
  }

  return "NEUTRAL";
};
