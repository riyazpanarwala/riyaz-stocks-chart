export const calculateProbability = (data, meta, targets) => {
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

  // PCR score
  let pcrScore = 0;

  if (pcr > 1.2) pcrScore = 25;
  else if (pcr > 1) pcrScore = 15;
  else if (pcr < 0.8) pcrScore = -25;
  else pcrScore = -10;

  // OI change score
  let changeScore = 0;

  if (putChange > callChange) changeScore = 25;
  else changeScore = -25;

  // Distance to support/resistance
  const spot = meta.spot;
  const upDistance = targets.resistance - spot;
  const downDistance = spot - targets.support;

  let distanceScore = 0;

  if (upDistance > downDistance) distanceScore = 20;
  else distanceScore = -20;

  const totalScore = pcrScore + changeScore + distanceScore;

  let upsideProbability = 50 + totalScore;
  let downsideProbability = 100 - upsideProbability;

  upsideProbability = Math.max(0, Math.min(100, upsideProbability));
  downsideProbability = Math.max(0, Math.min(100, downsideProbability));

  return {
    upsideProbability,
    downsideProbability,
    pcr,
  };
};
