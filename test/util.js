import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { error, arr2d, getAllRectCoordsClockwise } from "../src/util.js";

describe("arr2d", () => {
  it("should create a 2D array of the specified width and height filled with the specified value", () => {
    const width = 3;
    const height = 4;
    const fillValue = "test";

    const result = arr2d(width, height, fillValue);

    assert.strictEqual(result.length, width);
    result.forEach((row) => {
      assert.strictEqual(row.length, height);
      assert(row.every((cell) => cell === fillValue));
    });
  });

  it("should create a 2D array of the specified width and height filled with null by default", () => {
    const width = 2;
    const height = 2;

    const result = arr2d(width, height);

    assert.strictEqual(result.length, width);
    result.forEach((row) => {
      assert.strictEqual(row.length, height);
      assert(row.every((cell) => cell === null));
    });
  });
});

describe("error", () => {
  it("should throw", () => {
    assert.throws(error);
  });

  it("should throw with the specified message", () => {
    try {
      error("my error");
    } catch (e) {
      assert.strictEqual(e.message, "my error");
    }
  });
});

describe("getAllRectCoordsClockwise", () => {
  it("should return the coordinates of a rectangle in clockwise order", () => {
    const topLeft = { x: 0, y: 0 };
    const dimensions = { x: 3, y: 4 };
    const expectedCoords = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 2, y: 1 },
      { x: 2, y: 2 },
      { x: 2, y: 3 },
      { x: 1, y: 3 },
      { x: 0, y: 3 },
      { x: 0, y: 2 },
      { x: 0, y: 1 },
    ];

    const actualCoords = getAllRectCoordsClockwise(topLeft, dimensions);
    assert.deepStrictEqual(actualCoords, expectedCoords);
  });
});
