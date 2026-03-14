export const detectSmartMoney = (data) => {
  if (!data?.length) return null;

  let largeCallChange = 0;
  let largePutChange = 0;

  data.forEach((d) => {
    if (d.callChange > largeCallChange) {
      largeCallChange = d.callChange;
    }

    if (d.putChange > largePutChange) {
      largePutChange = d.putChange;
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
