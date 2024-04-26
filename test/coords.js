import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  add,
  adjacent,
  fmt,
  is,
  isCardinal,
  manhattan,
  spread,
  sub,
  vec,
  vectorTo,
} from "../src/coords.js";

describe("vec", () => {
  it("should create a vectors as appropriate", () => {
    assert.deepEqual(vec(), { x: 0, y: 0 });
    assert.deepEqual(vec(21), { x: 21, y: 21 });
    assert.deepEqual(vec("a", 2), { x: "a", y: 2 });
  });

  it("should spread vectors properly", () => {
    assert.deepEqual(spread(vec()), [0, 0]);
  });

  it("should format vectors properly", () => {
    assert.strictEqual(fmt(vec(21, 34)), "(21, 34)");
  });

  it("should propely compare vectors", () => {
    assert(is(vec(3, 5), vec(3, 5)));
    assert(is(1, vec(1, 1)));
    assert.strictEqual(is(vec(2), 0), false);
  });

  it("should calculate distances properly", () => {
    assert.strictEqual(manhattan(vec(3, 5), vec(1, 1)), 6);
    assert(adjacent(vec(3, 5), vec(4, 5)));
    assert.strictEqual(adjacent(vec(3, 5), vec(6, 7)), false);
  });

  it("should gauge cardinality properly", () => {
    const v1 = vec(3, 5);
    const v2 = vec(3, 7);
    const v3 = vec(1, 5);
    assert(isCardinal(v1, v2));
    assert(isCardinal(v1, v3));
    assert.strictEqual(isCardinal(v2, v3), false);
  });

  it("Calculates vector from one point to another", () => {
    const startPoint = vec(1, 1);
    const endPoint = vec(4, 5);
    const vector = vectorTo(startPoint, endPoint);
    assert.deepEqual(vector, { x: 3, y: 4 });
  });

  it("adds and subtracts vectors properly", () => {
    assert.deepEqual(add(1, vec(3, 4)), { x: 4, y: 5 });
    assert.deepEqual(sub(vec(4, 6), 7), { x: -3, y: -1 });
  });
});
