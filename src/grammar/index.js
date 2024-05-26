import Rand from "rand-seed";

const rng = new Rand.default("seed");

export const rule = (r) => ({
  ...r,
  rng,
});
