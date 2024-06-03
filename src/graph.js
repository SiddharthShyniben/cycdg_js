import { add, fmt, is, spread, sub, vec, vectorTo } from "./coords.js";
import { arr2d, error, getAllRectCoordsClockwise } from "./util.js";

import color from "@nuff-said/color";
import unbug from "unbug";

const debug = unbug("graph");
const draw_ = debug.extend("drawing");

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

export class Graph {
  constructor(w, h) {
    debug(`Creating graph of dimensions ${fmt(vec(w, h))}`);

    this.width = w;
    this.height = h;
    this.nodes = arr2d(w, h).map((row) => row.map(() => node()));
    this.appliedTags = {};
  }

  size() {
    return [this.width, this.height];
  }

  area() {
    return this.width * this.height;
  }

  get(x, y) {
    if (typeof x.x !== "undefined" && typeof x.y !== "undefined")
      return this.get(x.x, x.y);
    return this.nodes[x]?.[y];
  }

  active(c) {
    return this.get(c).active;
  }

  inBounds({ x, y }) {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  edge(f, { x, y }) {
    const from = { ...f }; // Don't mutate!
    let vx = x - from.x,
      vy = y - from.y;

    if (vx * vy !== 0)
      error(`Diagonal connection: ${fmt(from)} -> ${fmt({ x, y })}`);
    if (vx == 0 && vy == 0)
      error(`Zero vector: ${fmt(from)} -> ${fmt({ x, y })}`);

    if (vx == -1) from.x--, (vx = 1);
    if (vy == -1) from.y--, (vy = 1);
    return getEdgeByVector(this.nodes[from.x][from.y], vec(vx, vy));
  }

  edgeVec(a, d) {
    return this.edge(a, add(a, d));
  }

  interlinked(a, b) {
    return a.x < 0 || a.y < 0
      ? false
      : b.x < 0 || b.y < 0
        ? false
        : this.edge(a, b).enabled;
  }

  interlinkedVec(a, d) {
    return this.interlinked(a, add(a, d));
  }

  edgeCount(a) {
    let count = 0;
    for (const dir of cardinalDirections) {
      const v = add(a, dir);
      if (!this.inBounds(v)) continue;
      if (this.edge(v, a).enabled) count++;
    }
    return count;
  }

  setLinkVec({ x, y }, { x: vx, y: vy }, link) {
    if (vx * vy !== 0)
      error(`Diagonal connection: ${fmt({ x, y })} -> ${fmt(vec(vx, vy))}`);

    if (vx == -1) x--, (vx = 1);
    if (vy == -1) y--, (vy = 1);
    setEdgeLinkByVector(this.nodes[x][y], vec(vx, vy), link, false);
  }

  enableLinkVec(from, vec) {
    this.setLinkVec(from, vec, true);
  }

  disableLinkVec(from, vec) {
    this.setLinkVec(from, vec, false);
  }

  enableLink(from, to) {
    this.enableLinkVec(from, vectorTo(from, to));
  }

  disableLink(from, to) {
    this.disableLinkVec(from, vectorTo(from, to));
  }

  isDirected(from, to) {
    const n = this.edge(from, to);
    return n.enabled && n.reversed == (to.x - from.x < 0 || to.y - from.y < 0);
  }

  isDirectedVec(from, to) {
    const n = this.edgeVec(from, to);
    return n.enabled && n.reversed == (to.x - from.x < 0 || to.y - from.y < 0);
  }

  countDirectedEdges(node, { countIn, countOut }) {
    if (!countIn && !countOut) error("Nothing to count");

    let count = 0;

    for (const dir of cardinalDirections) {
      const other = add(dir, node);
      if (!this.inBounds(other)) continue;
      if (countIn && this.isDirected(other, node)) count++;
      if (countOut && this.isDirected(node, other)) count++;
    }

    return count;
  }

  incomingLinksOnlyAt(coords) {
    for (const dir of cardinalDirections) {
      if (
        this.inBounds(add(coords, dir)) &&
        this.interlinkedVec(coords, dir) &&
        this.isDirectedVec(coords, dir)
      ) {
        return false;
      }
    }

    return true;
  }

  enable(c) {
    this.get(c).active = true;
  }

  reset(c) {
    resetNode(this.get(c)); // NOTE: just loop edges from node?
    for (const dir of cardinalDirections) {
      if (this.inBounds(add(c, dir))) {
        resetEdge(this.edgeVec(c, dir));
      }
    }
  }

  countEnabled() {
    return this.nodes
      .flat()
      .map((n) => (n.active ? 1 : 0))
      .reduce((a, b) => a + b, 0);
  }

  addNodeTag(c, kind) {
    const id = this.appliedTags[kind] || 0;
    this.appliedTags[kind] = id + 1;
    this.get(c).tags.push(tag(kind, id));
  }

  addNodeTagPreserveId(c, kind) {
    this.appliedTags[kind] ??= 0;
    this.appliedTags[kind]--;
    this.addNodeTag(c, kind);
  }

  addEdgeTag(from, to, kind) {
    const id = this.appliedTags[kind] || 0;
    this.appliedTags[kind] = id + 1;
    this.edge(from, to).tags.push(tag(kind, id));
  }

  addEdgeTagVec(from, to, kind) {
    const id = this.appliedTags[kind] || 0;
    this.appliedTags[kind] = id + 1;
    this.edgeVec(from, to).tags.push(tag(kind, id));
  }

  addEdgeTagPreserveId(from, to, kind) {
    this.appliedTags[kind] ??= 0;
    this.appliedTags[kind]--;
    this.addEdgeTag(from, to, kind);
  }

  swapTags(a, b) {
    swapTags(this.get(a), this.get(b));
  }

  swapEdgeTags(f1, f2, t1, t2) {
    swapTags(this.edge(f1, f2), this.edge(t1, t2));
  }

  hasTags(a) {
    return this.get(a).tags.length > 0;
  }

  hasTag(a, kind) {
    return !!this.get(a).tags.find((t) => t.tag == kind);
  }

  copyEdgeTagsPreservingIds(f1, f2, t1, t2) {
    this.edge(f1, f2).tags.push(...this.edge(t1, t2).tags);
  }

  // Draws two paths from source to sink alongside the rect.
  // Result example (O is source, S is sink):
  // N > S < N
  // ^       ^
  // N       N
  // ^       ^
  // O > N > N
  drawBiconnectedDirectionalRect(start, dimensions, source, sink) {
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

    this.enable(source);

    // first pass
    for (let i = sourceIndex; i != sinkIndex; ) {
      const next = (i + 1) % allCoords.length;
      const c = allCoords[i];
      const v = sub(allCoords[next], c);
      draw_(`First pass: Linking ${fmt(c)} in ${fmt(v)}`);
      this.enable(add(c, v));
      this.enableLinkVec(c, v);
      i = next;
    }

    // second pass
    for (let i = sourceIndex; i != sinkIndex; ) {
      const next = i - 1 < 0 ? allCoords.length - 1 : i - 1;
      const c = allCoords[i];
      const v = sub(allCoords[next], c);
      draw_(`Second pass: Linking ${fmt(c)} in ${fmt(v)}`);
      this.enable(add(c, v));
      this.enableLinkVec(c, v);
      i = next;
    }
  }

  testSanity() {
    let sane = true,
      problems = [];

    for (let x = 0; x < this.nodes.length; x++) {
      for (let y = 0; y < this.nodes[0].length; y++) {
        const node = this.nodes[x][y];
        if (!node.active) {
          if (node.tags.length > 0) {
            sane = false;
            problems.push(`Inactive node at ${fmt({ x, y })} has tags`);
          }

          for (const dir of cardinalDirections) {
            if (this.interlinkedVec({ x, y }, dir)) {
              sane = false;
              problems.push(
                `Inactive node at ${fmt({ x, y })} has edge ${fmt(dir)}`,
              );
            }
          }
        } else {
          if (
            this.edgeCount({ x, y }) == 0 &&
            !this.nodes[x][y].tags.find((t) => t.tag == tags.Teleport)
          ) {
            sane = false;
            problems.push(
              `Active node at ${fmt({ x, y })} has no active links!`,
            );
          }
        }
      }
    }

    return { sane, problems };
  }
}

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
