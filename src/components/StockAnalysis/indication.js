export const getRSIIndication = (val) => {
  if (val < 25) {
    return "Oversold";
  } else if (val >= 25 && val < 45) {
    return "Bearish";
  } else if (val >= 45 && val < 55) {
    return "Neutral";
  } else if (val >= 55 && val < 75) {
    return "Bullish";
  } else if (val >= 75) {
    return "Overbought";
  }
};

export const getMACDIndication = (macdLine, signalLine) => {
  if (macdLine > 0) {
    if (macdLine >= signalLine) {
      return "Bullish";
    }
  } else {
    if (macdLine <= signalLine) {
      return "Bearish";
    }
  }
  return "Neutral";
};

export const getCCIIndication = (val) => {
  if (val < -200) {
    return "Oversold";
  } else if (val >= -200 && val < -50) {
    return "Bearish";
  } else if (val >= -50 && val < 50) {
    return "Neutral";
  } else if (val >= 50 && val < 200) {
    return "Bullish";
  } else if (val >= 200) {
    return "Overbought";
  }
};

export const getWilliamsonIndication = (val) => {
  if (val >= -100 && val < -80) {
    return "Oversold";
  } else if (val >= -80 && val < -50) {
    return "Bearish";
  } else if (val >= -50 && val < -20) {
    return "Bullish";
  } else {
    return "Overbought";
  }
};

export const getROC20Indication = (val) => {
  if (val > 0) {
    return "Bullish";
  } else if (val < 0) {
    return "Bearish";
  }
  return "Neutral";
};

export const getStochasticIndication = (val) => {
  if (val < 20) {
    return "Oversold";
  } else if (val >= 20 && val < 45) {
    return "Bearish";
  } else if (val >= 45 && val < 55) {
    return "Neutral";
  } else if (val >= 55 && val < 80) {
    return "Bullish";
  } else {
    return "Overbought";
  }
};

export const getMFIIndication = (val) => {
  if (val < 20) {
    return "Oversold";
  } else if (val >= 20 && val < 40) {
    return "Bearish";
  } else if (val >= 40 && val < 60) {
    return "Neutral";
  } else if (val >= 60 && val < 80) {
    return "Bullish";
  } else if (val >= 80) {
    return "Overbought";
  }
};

export const getADXIndication = (val) => {
  if (val < 20) {
    return "Weak Trend";
  } else if (val >= 20 && val < 25) {
    return "Moderate Trend";
  } else {
    return "Strong Trend";
  }
};

export const getATRIndication = (atr, atrSma) => {
  return atr > atrSma ? "High Volatility" : "Low Volatility";
};
