import { add, fmt, is, spread, sub, vec, vectorTo } from "./coords.js";
import { arr2d, error, getAllRectCoordsClockwise } from "./util.js";

import color from "@nuff-said/color";
import unbug from "unbug";

const debug = unbug("graph");

export const tags = {
  Start: "Start",
  Goal: "Goal",
  Key: "Key",
  HalfKey: "HalfKey",
  MasterKey: "MasterKey",
  Boss: "Boss",
  Treasure: "Treasure",
  Hazard: "Hazard",
  Trap: "Trap",
  Teleport: "Teleport",
  LockedEdge: "LockedEdge",
  BilockedEdge: "BilockedEdge",
  MasterLockedEdge: "MasterLockedEdge",
  WindowEdge: "WindowEdge",
  OneTimeEdge: "OneTimeEdge",
  OneWayEdge: "OneWayEdge",
  SecretEdge: "SecretEdge",
};

export const cardinalDirections = [
  vec(0, -1),
  vec(1, 0),
  vec(0, 1),
  vec(-1, 0),
];

export const diagonalDirections = [
  vec(-1, -1),
  vec(1, -1),
  vec(1, 1),
  vec(-1, 1),
];

export const hasTag = (n, kind) => !!n.tags.find((t) => t.tag == kind);
export const swapTags = (a, b) => ([a.tags, b.tags] = [b.tags, a.tags]);

export const resetNode = (n) => (
  n.finalized ? error("Node is finalized!") : null,
  (n.active = false),
  n.edges.forEach((e) => (e.enabled = false))
);
export const resetEdge = (e) => ((e.enabled = false), (e.reversed = false));

export const getEdgeByVector = (n, a) =>
  is(a, vec(1, 0))
    ? n.edges[0]
    : is(a, vec(0, 1))
      ? n.edges[1]
      : error("Bad vector " + fmt(a));

export const setEdgeLinkByVector = (n, a, enabled, reversed) => {
  const edge = getEdgeByVector(n, a);
  edge.enabled = enabled;
  edge.reversed = reversed;
};

export const edgeHasLinkToVector = (n, a) => getEdgeByVector(n, a).enabled;

//////////////////////////////////////////////////////////////////////
// Graphs ////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////

// Geometry //////////////////////////////////////////////////////////

export const graphSize = (g) => [g.nodes.length, g.nodes[0].length];
export const coordsInGraphBounds = (g, { x, y }) =>
  x >= 0 && x < g.nodes.length && y >= 0 && y < g.nodes[0].length;
export const coordsInGraphBorder = (g, { x, y }) =>
  (x == 0 || x == g.nodes.length - 1) && (y == 0 || y == g.nodes[0].length - 1);
export const coordsInGraphCorner = (g, { x, y }) =>
  (x == 0 || x == g.nodes.length - 1) && (y == 0 || y == g.nodes[0].length - 1);

export const checkNearCoords = (g, { x, y }, fn) =>
  cardinalDirections
    .map((d) => g.nodes[x + d.x]?.[y + d.y])
    .filter(Boolean)
    .some(fn);

// Edges /////////////////////////////////////////////////////////////

export const graphGetEdgeBetweenCoords = (g, f, { x, y }) => {
  const from = { ...f }; // Don't mutate!
  let vx = x - from.x,
    vy = y - from.y;

  if (vx * vy !== 0)
    error(`Diagonal connection: ${fmt(from)} -> ${fmt({ x, y })}`);
  if (vx == 0 && vy == 0)
    error(`Zero vector: ${fmt(from)} -> ${fmt({ x, y })}`);

  if (vx == -1) from.x--, (vx = 1);
  if (vy == -1) from.y--, (vy = 1);
  return getEdgeByVector(g.nodes[from.x][from.y], vec(vx, vy));
};

export const areGraphCoordsInterlinked = (g, a, b) =>
  a.x < 0 || a.y < 0
    ? false
    : b.x < 0 || b.y < 0
      ? false
      : graphGetEdgeBetweenCoords(g, a, b).enabled;

export const isGraphEdgeByVectorActive = (g, a, d) =>
  areGraphCoordsInterlinked(g, a, add(a, d));

export const graphCountEdgesAt = (g, a) => {
  let count = 0;
  for (const dir of cardinalDirections) {
    const v = add(a, dir);
    if (!coordsInGraphBounds(g, v)) continue;
    if (graphGetEdgeBetweenCoords(g, v, a).enabled) count++;
  }
  return count;
};

export const graphGetEdgeByVector = (g, { x, y }, { x: vx, y: vy }) =>
  graphGetEdgeBetweenCoords(g, { x, y }, vec(x + vx, y + vy));

export const graphSetLinkByVector = (g, { x, y }, { x: vx, y: vy }, link) => {
  if (vx * vy !== 0)
    error(`Diagonal connection: ${fmt({ x, y })} -> ${fmt(vec(vx, vy))}`);

  if (vx == -1) x--, (vx = 1);
  if (vy == -1) y--, (vy = 1);
  setEdgeLinkByVector(g.nodes[x][y], vec(vx, vy), link, false);
};

// Directed Edges ////////////////////////////////////////////////////

export const isGraphEdgeDirectedBetweenCoords = (g, from, to) => {
  const n = graphGetEdgeByVector(g, from, sub(to, from));
  return n.enabled && n.reversed == (to.x - from.x < 0 || to.y - from.y < 0);
};

export const countGraphDirEdges = (g, { x, y }, countIn, countOut) => {
  if (!countIn && !countOut) error("Nothing to count");

  let count = 0;

  for (const dir of cardinalDirections) {
    const [otherX, otherY] = spread(add(dir, { x, y }));
    if (!coordsInGraphBounds(g, vec(otherX, otherY))) continue;
    if (
      countIn &&
      isGraphEdgeDirectedBetweenCoords(g, vec(otherX, otherY), { x, y })
    )
      count++;
    if (
      countOut &&
      isGraphEdgeDirectedBetweenCoords(g, { x, y }, vec(otherX, otherY))
    )
      count++;
  }

  return count;
};

export const isGraphEdgeDirectedByVector = (g, from, to) => {
  const n = graphGetEdgeByVector(g, from, to);
  return n.enabled && n.reversed == (to.x - from.x < 0 || to.y - from.y < 0);
};

export const doGraphCoordsHaveIncomingLinksOnly = (g, coords) => {
  for (const dir of cardinalDirections) {
    if (
      coordsInGraphBounds(g, add(coords, dir)) &&
      isGraphEdgeByVectorActive(g, coords, dir) &&
      isGraphEdgeDirectedByVector(g, coords, dir)
    ) {
      return false;
    }
  }

  return true;
};

export const graphEnableDirLinkByVector = (g, { x, y }, { x: vx, y: vy }) => {
  if (vx * vy !== 0)
    error(`Diagonal connection: ${fmt({ x, y })} -> ${fmt(vec(vx, vy))}`);

  let reverse = false;

  if (vx == -1) x--, (vx = 1), (reverse = true);
  else if (vy == -1) y--, (vy = 1), (reverse = true);
  setEdgeLinkByVector(g.nodes[x][y], vec(vx, vy), true, reverse);
};

export const graphEnableDirLinksByCoords = (g, from, to) =>
  graphEnableDirLinkByVector(g, from, vectorTo(from, to));
export const graphDisableDirLinksByCoords = (g, from, to) =>
  graphSetLinkByVector(g, from, vectorTo(from, to), false);

// Nodes /////////////////////////////////////////////////////////////

export const graphResetNodeAndConnections = (g, c) => {
  resetNode(g.nodes[c.x][c.y]); // NOTE: just loop edges from node?
  for (const dir of cardinalDirections) {
    if (coordsInGraphBounds(g, add(c, dir))) {
      resetEdge(getEdgeByVector(g.nodes[c.x][c.y], dir));
    }
  }
};

export const graphAreNodesBetweenCoordsEditable = (g, from, to) => {
  let [x1, y1] = spread(from);
  let [x2, y2] = spread(to);

  if (x1 > x2) [x1, x2] = [x2, x1];
  if (y1 > y2) [y1, y2] = [y2, y1];

  for (let x = x1; x <= x2; x++) {
    for (let y = y1; y <= y2; y++) {
      if (!coordsInGraphBounds(g, { x, y })) return false;
      if (g.nodes[x][y].finalized) return false;
    }
  }

  return true;
};

export const graphGetEnabledNodesCount = (g) =>
  g.nodes
    .flat()
    .map((n) => (n.active ? 1 : 0))
    .reduce((a, b) => a + b, 0);

export const graphGetFilledNodesPercentage = (g) => {
  const count = g.nodes
    .flat()
    .map((n) => (n.active || n.finalized ? 1 : 0))
    .reduce((a, b) => a + b, 0);

  const [w, h] = graphSize(g);
  const total = w * h;

  return (100 * count + total / 2) / total; // why a bias?
  // return (100 * count) / total;
};

// Tags //////////////////////////////////////////////////////////////

export const graphAddNodeTag = (g, { x, y }, kind) => {
  const id = g.appliedTags[kind] || 0;
  g.appliedTags[kind] = id + 1;
  g.nodes[x][y].tags.push(tag(kind, id));
};

export const graphAddNodeTagPreserveLastId = (g, { x, y }, kind) => {
  g.appliedTags[kind] ??= 0;
  g.appliedTags[kind]--;
  graphAddNodeTag(g, { x, y }, kind);
};

export const graphAddEdgeTagByVector = (g, from, to, kind) => {
  const id = g.appliedTags[kind] || 0;
  g.appliedTags[kind] = id + 1;
  graphGetEdgeByVector(g, from, to).tags.push(tag(kind, id));
};

export const graphAddEdgeTagByCoords = (g, from, to, kind) => {
  const id = g.appliedTags[kind] || 0;
  g.appliedTags[kind] = id + 1;
  graphGetEdgeBetweenCoords(g, from, to).tags.push(tag(kind, id));
};

export const graphAddEdgeTagByCoordsPreserveLastId = (g, from, to, kind) => {
  g.appliedTags[kind] ??= 0;
  g.appliedTags[kind]--;
  graphAddEdgeTagByCoords(g, from, to, kind);
};

export const graphAddTagToAllActiveEdgesByCoords = (g, kind, c) => {
  for (const dir of cardinalDirections)
    if (
      coordsInGraphBounds(g, add(c, dir)) &&
      isGraphEdgeByVectorActive(g, c, dir)
    )
      graphAddEdgeTagByVector(g, c, dir, kind);
};

export const graphSwapNodeTags = (g, { x, y }, { x: x2, y: y2 }) =>
  swapTags(g.nodes[x][y], g.nodes[x2][y2]);

export const graphNodeHasTags = (g, { x, y }) => g.nodes[x][y].tags.length > 0;
export const graphNodeCountTags = (g, { x, y }) => g.nodes[x][y].tags.length;
export const graphNodeHasTag = (g, { x, y }, kind) =>
  !!g.nodes[x][y].tags.find((t) => t.tag == kind);

export const graphEdgeHasTags = (g, c, v) =>
  graphGetEdgeByVector(g, c, v).tags.length > 0;

export const graphSwapEdgeTags = (g, f1, f2, t1, t2) =>
  swapTags(
    graphGetEdgeBetweenCoords(g, f1, f2),
    graphGetEdgeBetweenCoords(g, t1, t2),
  );

export const copyEdgeTagsPreservingIds = (g, f1, f2, t1, t2) =>
  graphGetEdgeBetweenCoords(g, f1, f2).tags.push(
    ...graphGetEdgeBetweenCoords(g, t1, t2).tags,
  );

// Drawing ///////////////////////////////////////////////////////////

const draw_ = debug.extend("drawing");

export const drawCardinalConnectedLine = (g, from, to) => {
  draw_(`Drawing cardinal line from ${fmt(from)} to ${fmt(to)}`);

  const [x1, y1] = spread(from);
  const [x2, y2] = spread(to);

  const vx = x2 !== x1 ? (x2 - x1) / Math.abs(x2 - x1) : 0;
  const vy = y2 !== y1 ? (y2 - y1) / Math.abs(y2 - y1) : 0;

  g.nodes[x1][y1].active = true;

  let x = x1,
    y = y1;

  while (vx != 0 && x !== x2) {
    draw_(`Moving in ${fmt(vec(vx, vy))}`);
    g.nodes[x + vx][y + vy].active = true;
    graphEnableDirLinkByVector(g, { x, y }, vec(vx, vy));
    x += vx;
  }

  while (vy != 0 && y !== y2) {
    draw_(`Moving in ${fmt(vec(vx, vy))}`);
    g.nodes[x + vx][y + vy].active = true;
    graphEnableDirLinkByVector(g, { x, y }, vec(vx, vy));
    y += vy;
  }
};

export const drawConnectedDirectionalRect = (
  g,
  { x, y },
  { x: w, y: h },
  ccw = false,
) => {
  const rghX = x + w - 1;
  const botY = y + h - 1;

  const corners = [{ x, y }, vec(rghX, y), vec(rghX, botY), vec(x, botY)];
  if (ccw) corners.reverse();

  for (let i = 0; i < 4; i++)
    drawCardinalConnectedLine(g, corners[i], corners[i + 1] || corners[0]);
};

// Draws two paths from source to sink alongside the rect.
// Result example (O is source, S is sink):
// N > S < N
// ^       ^
// N       N
// ^       ^
// O > N > N
export const drawBiconnectedDirectionalRect = (
  g,
  start,
  dimensions,
  source,
  sink,
) => {
  draw_(
    `Drawing biconnected directional rect at ${fmt(start)} of dimensions ${fmt(dimensions)} from ${fmt(source)} to ${fmt(sink)}`,
  );

  const allCoords = getAllRectCoordsClockwise(start, dimensions);
  const sourceIndex = allCoords.findIndex((x) => is(x, source));
  const sinkIndex = allCoords.findIndex((x) => is(x, sink));

  draw_(
    `All coordinates: ${allCoords
      .map(fmt)
      .map((x) => (fmt(source) == x || fmt(sink) == x ? color.red(x) : x))
      .join(", ")}`,
  );

  g.nodes[source.x][source.y].active = true;

  // first pass
  for (let i = sourceIndex; i != sinkIndex; ) {
    const next = (i + 1) % allCoords.length;
    const c = allCoords[i];
    const v = sub(allCoords[next], c);
    draw_(`First pass: Linking ${fmt(c)} in ${fmt(v)}`);
    g.nodes[c.x + v.x][c.y + v.y].active = true;
    graphEnableDirLinkByVector(g, c, v);
    i = next;
  }

  // second pass
  for (let i = sourceIndex; i != sinkIndex; ) {
    const next = i - 1 < 0 ? allCoords.length - 1 : i - 1;
    const c = allCoords[i];
    const v = sub(allCoords[next], c);
    draw_(`Second pass: Linking ${fmt(c)} in ${fmt(v)}`);
    g.nodes[c.x + v.x][c.y + v.y].active = true;
    graphEnableDirLinkByVector(g, c, v);
    i = next;
  }
};

// Sanity!! //////////////////////////////////////////////////////////

export const testSanity = (g) => {
  let sane = true,
    problems = [];

  for (let x = 0; x < g.nodes.length; x++) {
    for (let y = 0; y < g.nodes[0].length; y++) {
      const node = g.nodes[x][y];
      if (!node.active) {
        if (node.tags.length > 0) {
          sane = false;
          problems.push(`Inactive node at ${fmt({ x, y })} has tags`);
        }

        for (const dir of cardinalDirections) {
          if (isGraphEdgeByVectorActive(g, { x, y }, dir)) {
            sane = false;
            problems.push(
              `Inactive node at ${fmt({ x, y })} has edge ${fmt(dir)}`,
            );
          }
        }
      } else {
        if (
          graphCountEdgesAt(g, { x, y }) == 0 &&
          !g.nodes[x][y].tags.find((t) => t.tag == tags.Teleport)
        ) {
          sane = false;
          problems.push(`Active node at ${fmt({ x, y })} has no active links!`);
        }
      }
    }
  }

  return { sane, problems };
};

//////////////////////////////////////////////////////////////////////
// constructors //////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////

export const tag = (tag, id) => ({ tag, id });
export const edge = (enabled = false, tags = [], reversed = false) => ({
  enabled,
  tags,
  reversed,
});
export const node = (
  edges = [edge(), edge()],
  tags = [],
  active = false,
  finalized = false,
) => ({
  active,
  finalized,
  edges,
  tags,
});

export const graph = (w, h) => {
  const g = {
    nodes: arr2d(w, h).map((row) => row.map(() => node())),
    appliedTags: {},
  };

  for (let x = 0; x < w; x++) {
    setEdgeLinkByVector(g.nodes[x][h - 1], vec(0, 1), false, false);
  }

  for (let y = 0; y < h; y++) {
    setEdgeLinkByVector(g.nodes[w - 1][y], vec(1, 0), false, false);
  }

  return g;
};
