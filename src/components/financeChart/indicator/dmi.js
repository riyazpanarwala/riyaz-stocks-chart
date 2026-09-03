// Function to smooth the values
const smooth = (data, period) => {
  const smoothed = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period) {
      smoothed.push(null); // Not enough data to smooth
    } else {
      if (smoothed[i - 1]) {
        smoothed.push((smoothed[i - 1] * (period - 1) + data[i]) / period);
      } else {
        const sum = data
          .slice(i - period + 1, i + 1)
          .reduce((a, b) => a + b, 0);
        smoothed.push(sum / period);
      }
    }
  }
  return smoothed;
};

// Function to calculate ADX
const calculateADX = (plusDI, minusDI, period) => {
  const adx = [];
  for (let i = 0; i < plusDI.length; i++) {
    if (i < period || plusDI[i] == null || minusDI[i] == null) {
      adx.push(null); // Not enough data to calculate ADX
    } else {
      const sum = plusDI[i] + minusDI[i];
      const dx = sum === 0 ? 0 : (Math.abs(plusDI[i] - minusDI[i]) / sum) * 100;
      adx.push(dx);
    }
  }
  return smooth(adx, period);
};

// Function to calculate DMI
export const dmi = (data, period = 14) => {
  if (!Array.isArray(data) || data.length === 0) {
    return { plusDI: [], minusDI: [], adx: [] };
  }

  const high = data.map((d) => d.high);
  const low = data.map((d) => d.low);
  const close = data.map((d) => d.close);

  const plusDM = [];
  const minusDM = [];
  const tr = [];

  for (let i = 1; i < data.length; i++) {
    const currentHigh = high[i];
    const currentLow = low[i];
    const previousHigh = high[i - 1];
    const previousLow = low[i - 1];

    const upMove = currentHigh - previousHigh;
    const downMove = previousLow - currentLow;

    const currentPlusDM = upMove > downMove && upMove > 0 ? upMove : 0;
    const currentMinusDM = downMove > upMove && downMove > 0 ? downMove : 0;

    plusDM.push(currentPlusDM);
    minusDM.push(currentMinusDM);

    const currentTR = Math.max(
      currentHigh - currentLow,
      Math.abs(currentHigh - close[i - 1]),
      Math.abs(currentLow - close[i - 1])
    );

    tr.push(currentTR);
  }

  // Calculate the smoothed values
  const smoothedPlusDM = smooth(plusDM, period);
  const smoothedMinusDM = smooth(minusDM, period);
  const smoothedTR = smooth(tr, period);

  const plusDI = smoothedPlusDM.map(
    (dm, index) => (smoothedTR[index] && dm != null ? (dm / smoothedTR[index]) * 100 : 0)
  );
  const minusDI = smoothedMinusDM.map(
    (dm, index) => (smoothedTR[index] && dm != null ? (dm / smoothedTR[index]) * 100 : 0)
  );

  const adx = calculateADX(plusDI, minusDI, period);

  return { plusDI, minusDI, adx };
};
