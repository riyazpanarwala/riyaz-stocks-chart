// Function to detect Cup and Handle pattern
export const cupandhandle = (
  ohlcData,
  cupDepthThreshold = 0.1,
  handleDepthThreshold = 0.05
) => {
  const n = ohlcData.length;
  if (n < 20) return null; // Not enough data to form a pattern

  // Extract high and low prices
  const highs = ohlcData.map((candle) => candle.high);
  const lows = ohlcData.map((candle) => candle.low);

  // Step 1: Find the cup
  let cupStart = -1;
  let cupEnd = -1;
  let cupBottom = Infinity;

  for (let i = 1; i < n; i++) {
    if (lows[i] < lows[i - 1]) {
      if (lows[i] < cupBottom) {
        cupBottom = lows[i];
      }
    } else if (highs[i] > highs[i - 1]) {
      if (cupBottom !== Infinity && highs[i] >= highs[cupStart]) {
        cupEnd = i;
        break;
      }
    }
    if (cupStart === -1 && lows[i] < lows[i - 1]) {
      cupStart = i - 1; // Cup starts when the price starts to decline
    }
  }

  if (cupEnd === -1) {
    console.log("No cup found");
    return null; // No cup found
  }

  // Step 2: Calculate cup depth
  const cupDepth = (highs[cupStart] - cupBottom) / highs[cupStart];
  if (cupDepth < cupDepthThreshold) {
    console.log("Cup is not deep enough");
    return null; // Cup is not deep enough
  }

  // Step 3: Find the handle
  let handleStart = cupEnd;
  let handleEnd = n - 1;
  let handleBottom = Infinity;

  for (let i = handleStart + 1; i < n; i++) {
    if (lows[i] < lows[i - 1]) {
      if (lows[i] < handleBottom) {
        handleBottom = lows[i];
      }
    } else if (highs[i] > highs[i - 1]) {
      if (handleBottom !== Infinity && highs[i] >= highs[handleStart]) {
        handleEnd = i;
        break;
      }
    }
  }

  if (handleEnd === n - 1) {
    console.log("No handle found");
    return null; // No handle found
  }

  // Step 4: Calculate handle depth
  const handleDepth = (highs[handleStart] - handleBottom) / highs[handleStart];
  if (handleDepth > handleDepthThreshold) {
    console.log("Handle is too deep");
    return null; // Handle is too deep
  }

  // Step 5: Validate the pattern
  const cupHeight = highs[cupStart] - cupBottom;
  const handleHeight = highs[handleStart] - handleBottom;

  if (handleHeight > cupHeight * 0.5) {
    console.log("Handle is too large compared to the cup");
    return null; // Handle is too large compared to the cup
  }

  return {
    cupStart,
    cupEnd,
    handleStart,
    handleEnd,
    cupBottom,
    handleBottom,
  };
};
