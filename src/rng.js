import Rand from "rand-seed";

export class RNG {
  constructor(seed = Date.now()) {
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
}

export const rng = new RNG();
