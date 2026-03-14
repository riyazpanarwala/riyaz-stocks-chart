export const findTargets = (data, atm, step) => {
  if (!data?.length) return null;

  const RANGE = 10;

  const filtered = data.filter((d) => Math.abs(d.strike - atm) <= RANGE * step);

  let resistance = null;
  let support = null;

  filtered.forEach((d) => {
    if (d.strike > atm) {
      if (!resistance || d.callOI > resistance.callOI) {
        resistance = d;
      }
    }

    if (d.strike < atm) {
      if (!support || d.putOI > support.putOI) {
        support = d;
      }
    }
  });

  return {
    resistance: resistance?.strike,
    support: support?.strike,
  };
};
