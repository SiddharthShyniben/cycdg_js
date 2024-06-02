import Rand from "rand-seed";
import unbug from "unbug";

const debug = unbug("rng");
const seed = Math.random().toString();
debug(seed);

export class RNG {
  constructor(seed) {
    this.seed = seed;
    this.rng = new Rand.default(seed);
  }

  rand() {
    return this.rng.next();
  }

  randInRange(min, max) {
    if (max == undefined) return this.randInRange(0, min);
    if (max < min) [max, min] = [min, max];

    const minCeiled = Math.ceil(min);
    const maxFloored = Math.floor(max);
    return Math.floor(this.rng.next() * (maxFloored - minCeiled) + minCeiled);
  }

  fromArr(array) {
    return array[this.randInRange(0, array.length)];
  }

  weightedFromArr(items, fn) {
    let weights = Array.isArray(fn) ? fn : items.map(fn);

    const negative = weights.filter((w) => w < 0).sort((a, b) => a - b);
    if (negative.length > 0) weights = weights.map((w) => w + negative[0] + 1);
    const weighted = [];

    for (let i = 0; i < items.length; i++) {
      for (let j = 0; j < weights[i]; j++) weighted.push(items[i]);
    }

    return this.fromArr(weighted);
  }
}

export const rng = new RNG(seed);
