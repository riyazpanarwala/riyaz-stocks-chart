// Function to smooth the values
const smooth = (data, period) => {
  const smoothed = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period) {
      smoothed.push(null); // Not enough data to smooth
    } else {
      const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      smoothed.push(sum / period);
    }
  }
  return smoothed;
};

// Function to calculate ADX
const calculateADX = (plusDI, minusDI, period) => {
  const adx = [];
  for (let i = 0; i < plusDI.length; i++) {
    if (i < period) {
      adx.push(null); // Not enough data to calculate ADX
    } else {
      const dx =
        (Math.abs(plusDI[i] - minusDI[i]) / (plusDI[i] + minusDI[i])) * 100;
      adx.push(dx);
    }
  }
  return smooth(adx, period);
};

// Function to calculate DMI
export const dmi = (data, period = 14) => {
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

    const currentPlusDM = Math.max(0, currentHigh - previousHigh);
    const currentMinusDM = Math.max(0, previousLow - currentLow);

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
    (dm, index) => (dm / smoothedTR[index]) * 100
  );
  const minusDI = smoothedMinusDM.map(
    (dm, index) => (dm / smoothedTR[index]) * 100
  );

  const adx = calculateADX(plusDI, minusDI, period);

  return { plusDI, minusDI, adx };
};

/*
const calculateDMI1 = (data, windowSize = 14) => {
  let adx = [];
  let tr = [];
  let plusDM = [];
  let minusDM = [];

  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      tr.push(0);
      plusDM.push(0);
      minusDM.push(0);
    } else {
      const highLow = data[i].high - data[i].low;
      const highClose = Math.abs(data[i].high - data[i - 1].close);
      const lowClose = Math.abs(data[i].low - data[i - 1].close);
      tr.push(Math.max(highLow, highClose, lowClose));

      const deltaHigh = data[i].high - data[i - 1].high;
      const deltaLow = data[i - 1].low - data[i].low;
      plusDM.push(deltaHigh > deltaLow && deltaHigh > 0 ? deltaHigh : 0);
      minusDM.push(deltaLow > deltaHigh && deltaLow > 0 ? deltaLow : 0);
    }

    if (i >= windowSize) {
      const sumTR = tr
        .slice(i - windowSize + 1, i + 1)
        .reduce((a, b) => a + b, 0);
      const sumPlusDM = plusDM
        .slice(i - windowSize + 1, i + 1)
        .reduce((a, b) => a + b, 0);
      const sumMinusDM = minusDM
        .slice(i - windowSize + 1, i + 1)
        .reduce((a, b) => a + b, 0);

      const plusDIVal = (sumPlusDM / sumTR) * 100;
      const minusDIVal = (sumMinusDM / sumTR) * 100;

      const dx =
        (Math.abs(plusDIVal - minusDIVal) / (plusDIVal + minusDIVal)) * 100;
      const adxVal =
        adx.length < windowSize
          ? dx
          : (adx[adx.length - 1].value * (windowSize - 1) + dx) / windowSize;
      adx.push({
        date: data[i].date,
        value: adxVal,
      });
      data[i].plusDI = plusDIVal;
      data[i].minusDI = minusDIVal;
      data[i].adx = adxVal;
    } else {
      adx.push({ date: data[i].date, value: 0 });
      data[i].plusDI = 0;
      data[i].minusDI = 0;
      data[i].adx = 0;
    }
  }

  return data;
};
*/
