export const calculateSignal = (data, meta) => {
  if (!data?.length) return null;

  let callOI = 0;
  let putOI = 0;
  let callChange = 0;
  let putChange = 0;

  data.forEach((d) => {
    callOI += d.callOI || 0;
    putOI += d.putOI || 0;

    callChange += d.callChangeOI || 0;
    putChange += d.putChangeOI || 0;
  });

  const pcr = putOI / callOI;

  let bias = "NEUTRAL";
  let signal = "NO TRADE";

  if (pcr > 1.2 && putChange > callChange) {
    bias = "BULLISH";
    signal = "BUY CALL";
  }

  if (pcr < 0.8 && callChange > putChange) {
    bias = "BEARISH";
    signal = "BUY PUT";
  }

  return {
    pcr,
    bias,
    signal,
    atm: meta.atmStrike,
  };
};
