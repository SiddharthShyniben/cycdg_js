import unbug from "unbug";
import { adjacent, fmt, vec } from "./coords.js";
import {
  graphAddEdgeTagByCoords,
  graphAddNodeTag,
  graphEnableDirLinksByCoords,
  graphNodeHasTags,
  graphSize,
  graphSwapNodeTags,
  tags,
} from "./graph.js";
import { rng } from "./rng.js";

const debug = unbug("util");

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

export const areCoordsOnRect = ({ x, y }, { x: rx, y: ry }, { x: w, y: h }) =>
  x < rx || x >= rx + w || y < ry || y >= ry + h
    ? false
    : x == rx || x == rx + w - 1 || y == ry || y == ry + h - 1;

export const areCoordsInRectCorner = (
  { x, y },
  { x: rx, y: ry },
  { x: w, y: h },
) => (x == rx || x == rx + w - 1) && (y == ry || y == ry + h - 1);

export const areCoordsAdjacentToRectCorner = (
  { x, y },
  { x: rx, y: ry },
  { x: w, y: h },
) =>
  ((x == rx || x == rx + w - 1) && (y == ry + 1 || y == ry + h - 2)) ||
  ((x == rx + 1 || x == rx + w - 2) && (y == ry || y == ry + h - 1));

export const getRandomGraphCoordsByFunc = (graph, fn) => {
  const candidates = [];
  const [w, h] = graphSize(graph);
  for (let x in range(w)) {
    for (let y in range(h)) {
      (x = +x), (y = +y);
      if (fn({ x, y })) candidates.push({ x, y });
    }
  }

  return rng.fromArr(candidates);
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

  return rng.weightedFromArr(candidates, scores);
};

export const doesGraphContainNodeTag = (g, tag) =>
  !!g.nodes.flat().find((k) => k.tags.find((t) => t.tag == tag));

export const isTagMovable = (tag) =>
  [tags.Key, tags.HalfKey, tags.MasterKey, tags.Start, tags.Teleport].indexOf(
    tag.kind,
  ) < 0; // TODO: allow teleports somehow?

export const areAllNodeTagsMovable = (g, { x, y }) =>
  g.nodes[x][y].tags.every(isTagMovable);

export const randomHazard = () =>
  rng.fromArr([tags.Boss, tags.Trap, tags.Hazard]);

export const moveRandomNodeTag = (graph, from, to) => {
  const { tags } = graph.nodes[from.x][from.y];
  if (!tags.length) return;

  const tag = rng.fromArr(tags);
  if (!isTagMovable(tag)) return null;
  const i = tags.indexOf(tag);

  graph.nodes[to.x][to.y].tags.push(tag);
  graph.nodes[from.x][from.y].tags.splice(i, 1);
};

export const pushNodeContensInRandomDirection = (g, c) => {
  debug(`Pushing ${fmt(c)} contents in random direction`);

  const pushTo = getRandomGraphCoordsByFunc(
    g,
    ({ x, y }) => !g.nodes[x][y].active && adjacent(c, { x, y }),
  );

  debug(`Pushing to ${fmt(pushTo)}`);

  if (!pushTo || !areAllNodeTagsMovable(g, c)) return;

  g.nodes[pushTo.x][pushTo.y].active = true;
  graphEnableDirLinksByCoords(g, c, pushTo);
  graphSwapNodeTags(g, c, pushTo);
};

export const pushNodeContensInRandomDirectionWithEdgeTag = (g, c, tag) => {
  debug(`Pushing ${fmt(c)} contents in random direction with edge tags`);

  const pushTo = getRandomGraphCoordsByFunc(
    g,
    ({ x, y }) => !g.nodes[x][y].active && adjacent(c, { x, y }),
  );

  if (!pushTo || !areAllNodeTagsMovable(g, c)) return;

  g.nodes[pushTo.x][pushTo.y].active = true;
  graphEnableDirLinksByCoords(g, c, pushTo);
  graphAddEdgeTagByCoords(g, c, pushTo, tag);
  graphSwapNodeTags(g, c, pushTo);
};

export const addTagAtRandomActiveNode = (graph, tag) =>
  graphAddNodeTag(
    graph,
    getRandomGraphCoordsByScore(graph, ({ x, y }) =>
      !graph.nodes[x][y].active ? 0 : graphNodeHasTags(graph, { x, y }) ? 1 : 5,
    ),
    tag,
  );

export const clamp = (num, min, max) => Math.max(Math.min(num, max), min);
