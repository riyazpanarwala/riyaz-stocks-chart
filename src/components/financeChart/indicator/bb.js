import { bollingerBand } from "@riyazpanarwala/indicators";

export const bb = (arr) => {
  const bb = bollingerBand()
    .merge((d, c) => {
      d.bb = c;
    })
    .accessor((d) => d.bb);

  return bb(arr);
};
