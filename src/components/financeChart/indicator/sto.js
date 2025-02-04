import { stochasticOscillator } from "@riyazpanarwala/indicators";
const Stochastic = require("technicalindicators").Stochastic;

export const sto1 = (dataArr, period = 14, signalPeriod = 3) => {
  const input = {
    close: dataArr.map((v) => v.close),
    high: dataArr.map((v) => v.high),
    low: dataArr.map((v) => v.low),
    period: period,
    signalPeriod: signalPeriod,
  };

  return Stochastic.calculate(input);
};

export const sto = (initialData) => {
  const slowSTO = stochasticOscillator()
    .options({ windowSize: 20, kWindowSize: 3 })
    .merge((d, c) => {
      d.slowSTO = c;
    })
    .accessor((d) => d.slowSTO);
  const fastSTO = stochasticOscillator()
    .options({ windowSize: 14, kWindowSize: 1 })
    .merge((d, c) => {
      d.fastSTO = c;
    })
    .accessor((d) => d.fastSTO);
  const fullSTO = stochasticOscillator()
    .options({ windowSize: 20, kWindowSize: 20, dWindowSize: 3 })
    .merge((d, c) => {
      d.fullSTO = c;
    })
    .accessor((d) => d.fullSTO);

  const calculatedData = slowSTO(fastSTO(fullSTO(initialData)));

  return calculatedData;
};
