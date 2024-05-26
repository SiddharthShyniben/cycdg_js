import { vec } from "./coords.js";
import { graphSize, tags } from "./graph.js";

export const error = (msg) => {
  throw new Error(msg);
};

export const range = (from, to) =>
  to !== undefined
    ? [...Array(to - from).keys()].map((x) => x + from)
    : range(0, from);

export const arr2d = (w, h, fill = null) =>
  new Array(w).fill().map(() => new Array(h).fill(fill));

export const getAllRectCoordsClockwise = ({ x, y }, { x: w, y: h }) => {
  const rightX = x + w - 1,
    bottomY = y + h - 1;

  const totalCoords = 2 * w + 2 * (h - 2);
  const coords = [];

  for (
    let curr = 0, vx = 1, vy = 0, currX = x, currY = y;
    curr < totalCoords;
    curr++
  ) {
    coords.push(vec(currX, currY));
    currX += vx;
    currY += vy;
    if (
      (currX == x && currY == y) ||
      (currX == x && currY == bottomY) ||
      (currX == rightX && currY == y) ||
      (currX == rightX && currY == bottomY)
    ) {
      [vx, vy] = [-vy, vx];
    }
  }

  return coords;
};

export const weightedRandom = (items, weights) => {
  const cumulativeWeights = [];
  for (let i = 0; i < weights.length; i += 1) {
    cumulativeWeights[i] = weights[i] + (cumulativeWeights[i - 1] || 0);
  }

  const maxCumulativeWeight = cumulativeWeights[cumulativeWeights.length - 1];
  const randomNumber = maxCumulativeWeight * Math.random();

  for (let itemIndex = 0; itemIndex < items.length; itemIndex += 1) {
    if (cumulativeWeights[itemIndex] >= randomNumber) {
      return {
        item: items[itemIndex],
        index: itemIndex,
      };
    }
  }
};

export const areCoordsInRect = ({ x, y }, { x: rx, y: ry }, { x: w, y: h }) =>
  x < rx || x >= rx + w || y < ry || y >= ry + h
    ? false
    : x == rx || x == rx + w - 1 || y == ry || y == ry + h - 1;

export const areCoordsInRectCorner = (
  { x, y },
  { x: rx, y: ry },
  { x: w, y: h },
) => (x == rx || x == rx + w - 1) && (y == ry || r == ry + h - 1);

export const getRandomGraphCoordsByFunc = (graph, fn) => {
  const candidates = [];
  const [w, h] = graphSize(graph);
  for (const x in range(w)) {
    for (const y in range(h)) {
      if (fn({ x, y })) candidates.push({ x, y });
    }
  }

  return candidates[~~(Math.random() * candidates.length)];
};

export const getRandomGraphCoordsByScore = (graph, fn) => {
  const candidates = [],
    scores = [];
  const [w, h] = graphSize(graph);

  for (const x in range(w)) {
    for (const y in range(h)) {
      const score = fn({ x, y });
      if (score) {
        candidates.push({ x, y });
        scores.push(score);
      }
    }
  }

  return weightedRandom(candidates, scores);
};

export const isTagMovable = (tag) =>
  [tags.Key, tags.HalfKey, tags.MasterKey, tags.Start, tags.Teleport].indexOf(
    tag.kind,
  ) < 0; // TODO: allow teleports somehow?

export const randomHazard = () =>
  [tags.Boss, tags.Trap, tags.Hazard][~~(Math.random() * 3)];

export const moveRandomNodeTag = (graph, from, to) => {
  const { tags } = graph.nodes[from.x][from.y];
  if (!tags.length) return;

  const i = ~~(Math.random() * tags.length);
  if (!isTagMovable(tags[i])) return null;

  graph.nodes[to.x][to.y].tags.push(tags[i]);
  graph.nodes[from.y][from.y].splice(i, 1);
};
