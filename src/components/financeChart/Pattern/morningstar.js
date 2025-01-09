export const detectMorningStar = (candles, index) => {
  if (index < 2) {
    return { candle: {}, isVolume: false };
  }

  const firstCandle = candles[index - 2];
  const secondCandle = candles[index - 1];
  const thirdCandle = candles[index];

  // Criteria for the first candle (long bearish)
  const firstCandleBody = Math.abs(firstCandle.close - firstCandle.open);
  const firstCandleCondition =
    firstCandle.close < firstCandle.open &&
    firstCandleBody > (firstCandle.high - firstCandle.low) * 0.6;

  // Criteria for the second candle (small candle)
  const secondCandleBody = Math.abs(secondCandle.close - secondCandle.open);
  const secondCandleCondition = secondCandleBody < firstCandleBody * 0.5;

  // Criteria for the third candle (long bullish)
  const thirdCandleBody = Math.abs(thirdCandle.close - thirdCandle.open);
  const thirdCandleCondition =
    thirdCandle.close > thirdCandle.open &&
    thirdCandleBody > (thirdCandle.high - thirdCandle.low) * 0.6 &&
    thirdCandle.close > (firstCandle.open + firstCandle.close) / 2; // Closes above midpoint of the first candle

  // Calculate average volume of previous candles (excluding the current candle)
  const totalVolume = candles
    .slice(0, index)
    .reduce((sum, c) => sum + (c.volume || 0), 0);
  const averageVolume = totalVolume / index;

  // Check if the third candle's volume is higher than average
  const volumeCondition =
    thirdCandle.volume && thirdCandle.volume > averageVolume;

  // Check if the pattern matches
  if (firstCandleCondition && secondCandleCondition && thirdCandleCondition) {
    return { candle: thirdCandle, isVolume: volumeCondition };
  }

  return { candle: {}, isVolume: false };
};

export const morningstar = (candles) => {
  let arr = [];
  candles.forEach((data, index) => {
    const { candle, isVolume } = detectMorningStar(candles, index);
    if (candle.date) {
      arr = [...arr, { ...candle, isVolume }];
    }
  });
  return arr;
};
