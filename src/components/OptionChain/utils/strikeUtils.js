export const detectStrikeStep = (data) => {
  if (!data?.length) return 50;

  const strikes = data.map((d) => d.strike).sort((a, b) => a - b);

  let minDiff = Infinity;

  for (let i = 1; i < strikes.length; i++) {
    const diff = strikes[i] - strikes[i - 1];

    if (diff > 0 && diff < minDiff) {
      minDiff = diff;
    }
  }

  return minDiff === Infinity ? 50 : minDiff;
};
