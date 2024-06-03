import { adjacent, vec } from "../coords.js";
import { tags } from "../graph.js";
import { rng } from "../rng.js";
import {
  areCoordsAdjacentToRectCorner,
  areCoordsOnRect,
  moveRandomNodeTag,
  randomHazard,
} from "../util.js";
import { graphHasNoFinalizedNodesNear } from "./helper.js";
import {
  makeKeyLockFeature,
  makeMasterLockFeature,
  makeOneKeyTwoLockFeature,
  makeOneTimePassageFeature,
  makeOneWayPassageFeature,
  makeSecretPassageFeature,
  makeTagAdder,
  makeTwoMasterLockFeature,
  makeWindowPassageFeature,
} from "./util.js";

// NOTE: some sort of scaffolding system for this?
export default [
  // a => x
  {
    name: "disable one",
    metadata: { finalizesDisabledNodes: 1 },
    searchNearPrevIndex: [-1],
    applicabilityFuncs: [
      (g, c) => !g.active(c) && graphHasNoFinalizedNodesNear(g, c),
    ],
    applyToGraph: (g, c) => g.finalize(c),
  },

  // a b => x x
  {
    name: "disable two",
    metadata: {
      additionalWeight: -2,
      finalizesDisabledNodes: 2,
      changesCoords: 2,
    },
    searchNearPrevIndex: [-1, 0],
    applicabilityFuncs: [
      (g, c) => !g.active(c) && graphHasNoFinalizedNodesNear(g, c),
      (g, c, a) =>
        !g.active(c) && adjacent(a, c) && graphHasNoFinalizedNodesNear(g, c),
    ],
    applyToGraph: (g, nodes) => nodes.slice(0, 2).map((c) => g.finalize(c)),
  },

  // a b c => x x x
  {
    name: "disable three",
    metadata: {
      additionalWeight: -7,
      finalizesDisabledNodes: 3,
      changesCoords: 3,
    },
    searchNearPrevIndex: [-1, 0, 1],
    applicabilityFuncs: [
      (g, c) => !g.active(c) && graphHasNoFinalizedNodesNear(g, c),
      (g, c, a) =>
        !g.active(c) && adjacent(a, c) && graphHasNoFinalizedNodesNear(g, c),
      (g, c, p, q) => {
        const [w, h] = g.size();

        // Prevent L shape closing away the corner of the map
        if (
          areCoordsAdjacentToRectCorner(c, vec(0), vec(w, h)) &&
          areCoordsAdjacentToRectCorner(p, vec(0), vec(w, h)) &&
          !areCoordsOnRect(q, vec(0), vec(w, h))
        ) {
          return false;
        }

        return (
          !g.active(c) && adjacent(q, c) && graphHasNoFinalizedNodesNear(g, c)
        );
      },
    ],
    applyToGraph: (g, nodes) => nodes.slice(0, 3).map((c) => g.finalize(c)),
  },

  // a
  {
    name: "thing",
    metadata: { additionalWeight: -4 },
    searchNearPrevIndex: [-1],
    applicabilityFuncs: [(g, c) => g.active(c) && !g.hasTags(c)],
    applyToGraph: () => {},
    mandatoryFeatures: [
      {
        name: "treasure",
        applyFeature: (g, node) => g.addNodeTag(node, tags.Treasure),
      },
      {
        name: "hazard",
        applyFeature: (g, node) => g.addNodeTag(node, randomHazard()),
      },
    ],
  },

  // a b => a > b
  {
    name: "connect",
    metadata: {
      addsCycle: true,
      changesCoords: 2,
    },
    searchNearPrevIndex: [-1, 0],
    applicabilityFuncs: [
      (g, c) => g.active(c),
      (g, c, prev) =>
        g.active(c) && adjacent(prev, c) && !g.interlinked(c, prev),
    ],
    applyToGraph: (g, [a, b]) => g.enableLink(a, b),
    mandatoryFeatures: [
      makeKeyLockFeature(),
      makeMasterLockFeature(),
      makeSecretPassageFeature(),
      makeWindowPassageFeature(),
      makeOneTimePassageFeature(),
      makeOneWayPassageFeature(),
    ],
  },

  // a x => a > b
  {
    name: "add node",
    metadata: {
      enablesNodes: 1,
      changesCoords: 2,
    },
    searchNearPrevIndex: [-1, 0],
    applicabilityFuncs: [
      (g, c) => g.active(c),
      (g, c, prev) => !g.active(c) && adjacent(prev, c),
    ],
    applyToGraph: (g, [a, b]) => {
      g.enable(b).enableLink(a, b);
      moveRandomNodeTag(g, a, b);
    },
    mandatoryFeatures: [
      makeKeyLockFeature(),
      makeMasterLockFeature(),
      makeSecretPassageFeature(),
    ],
    optionalFeatures: [
      makeTagAdder(tags.Boss, 1),
      makeTagAdder(tags.Treasure, 1),
    ],
  },

  // a ... x x => a -tp-> b > c
  {
    name: "teleport",
    metadata: {
      addsTeleport: true,
      additionalWeight: -2,
      enableNodes: 2,
    },
    searchNearPrevIndex: [-1, -1, 1],
    applicabilityFuncs: [
      (g, c) =>
        g.active(c) &&
        g.hasTags(c) &&
        !g.hasTag(c, tags.Teleport) &&
        !g.hasTag(c, tags.Start),
      (g, c) => !g.active(c),
      (g, c, _, b) => !g.active(c) && adjacent(c, b),
    ],
    applyToGraph: (g, [a, b, c]) => {
      g.enable(b, c).enableLink(b, c);
      moveRandomNodeTag(g, a, c);
      g.addNodeTag(a, tags.Teleport).addNodeTagPreserveId(b, tags.Teleport);
    },
    optionalFeatures: [
      makeTagAdder(tags.Boss, 2),
      makeTagAdder(tags.Treasure, 2),
    ],
  },

  // a c b => a > c > b
  {
    name: "connect via room",
    metadata: {
      addsCycle: true,
      enablesNodes: 1,
    },
    searchNearPrevIndex: [-1, -1, 0],
    applicabilityFuncs: [
      (g, c) => g.active(c),
      (g, c, a) => g.active(c) && !adjacent(c, a),
      (g, c, a, b) => !g.active(c) && adjacent(c, a) && adjacent(c, b),
    ],
    applyToGraph: (g, [a, b, c]) => {
      g.enable(c).enableLink(a, c).enableLink(c, b);
    },
    mandatoryFeatures: [
      makeOneTimePassageFeature(0, 2),
      makeMasterLockFeature(0, 2),
      makeOneWayPassageFeature(0, 2, 2, 1),
      makeTwoMasterLockFeature(0, 2, 2, 1),
      {
        name: "secret passage",
        applyFeature: (g, [a, b, c]) => {
          g.addEdgeTag(a, c, tags.SecretEdge).addEdgeTag(c, b, tags.SecretEdge);
          if (rng.randInRange(2) == 0) g.addNodeTag(c, randomHazard());
        },
      },
    ],
    optionalFeatures: [
      {
        name: "hazard",
        applyFeature: (g, [_a, _b, c]) => g.addNodeTag(c, randomHazard()),
      },
      makeMasterLockFeature(2, 1),
      makeTagAdder(tags.Treasure, 2),
    ],
  },

  // a   x      a > c
  // V     ==>      V
  // b   x      b < d
  {
    name: "u rule",
    metadata: { enablesNodes: 2 },
    searchNearPrevIndex: [-1, 0, 0, 1],
    applicabilityFuncs: [
      (g, { x, y }) => g.nodes[x][y].active,
      (g, { x, y }, a) =>
        g.nodes[x][y].active &&
        adjacent(a, { x, y }) &&
        g.isDirected(a, { x, y }),
      (g, { x, y }, a) => !g.nodes[x][y].active && adjacent(a, { x, y }),
      (g, { x, y }, _a, b, c) =>
        !g.nodes[x][y].active && adjacent(b, { x, y }) && adjacent(c, { x, y }),
    ],
    applyToGraph: (g, [a, b, c, d]) => {
      g.enable(c);
      g.enable(d);
      g.enableLink(a, c);
      g.enableLink(c, d);
      g.enableLink(d, b);
      g.disableLink(a, b);
    },
    mandatoryFeatures: [
      {
        name: "swap ab <> ac",
        applyFeature: (g, [a, b, c, _d]) => {
          g.swapEdgeTags(a, b, a, c);
        },
      },
      {
        name: "swap ab <> cd",
        applyFeature: (g, [a, b, c, d]) => {
          g.swapEdgeTags(a, b, c, d);
        },
      },
      {
        name: "swap ab <> db",
        applyFeature: (g, [a, b, _c, d]) => {
          g.swapEdgeTags(a, b, d, b);
        },
      },
    ],
    optionalFeatures: [
      {
        name: "boss",
        applyFeature: (g, nodes) =>
          g.addNodeTag(nodes[rng.randInRange(2) + 2], tags.Boss),
      },
      makeWindowPassageFeature(0, 1),
    ],
  },

  // a   x      a > c
  // V     ==>  V   V
  // b   x      b < d
  {
    name: "d rule",
    metadata: { addsCycle: true, enablesNodes: 2 },
    searchNearPrevIndex: [-1, 0, 0, 1],
    applicabilityFuncs: [
      (g, { x, y }) => g.nodes[x][y].active,
      (g, { x, y }, a) =>
        g.nodes[x][y].active &&
        adjacent(a, { x, y }) &&
        g.isDirected({ x, y }, a),
      (g, { x, y }, a) => !g.nodes[x][y].active && adjacent(a, { x, y }),
      (g, { x, y }, _a, b, c) =>
        !g.nodes[x][y].active && adjacent(b, { x, y }) && adjacent(c, { x, y }),
    ],
    applyToGraph: (g, [a, b, c, d]) => {
      g.enable(c);
      g.enable(d);
      g.enableLink(a, c);
      g.enableLink(c, d);
      g.enableLink(d, b);
    },
    mandatoryFeatures: [
      {
        name: "copy ab <> ac",
        applyFeature: (g, [a, b, c, _d]) => {
          g.copyEdgeTagsPreservingIds(a, b, a, c);
        },
      },
      makeSecretPassageFeature(0, 2),
      makeMasterLockFeature(0, 2),
      makeTwoMasterLockFeature(0, 2, 3, 1),
      makeOneWayPassageFeature(0, 2, 3, 1),
    ],
    optionalFeatures: [
      {
        name: "hazard",
        applyFeature: (g, [_a, _b, _c, d]) => g.addNodeTag(d, randomHazard()),
      },
    ],
  },

  // b   x     b > d
  // V     ==>     V
  // a > c     x   c
  {
    name: "l flip",
    metadata: {},
    searchNearPrevIndex: [-1, 0, 0, 1],
    applicabilityFuncs: [
      (g, { x, y }) =>
        g.nodes[x][y].active &&
        g.edgeCount({ x, y }) == 2 &&
        !g.nodes[x][y].flagged,
      (g, { x, y }, a) =>
        g.nodes[x][y].active &&
        adjacent({ x, y }, a) &&
        g.isDirected({ x, y }, a),
      (g, { x, y }, a) =>
        g.nodes[x][y].active &&
        adjacent({ x, y }, a) &&
        g.isDirected(a, { x, y }),
      (g, { x, y }, _, b, c) =>
        !g.nodes[x][y].active && adjacent({ x, y }, b) && adjacent({ x, y }, c),
    ],
    applyToGraph: (g, [a, b, c, d]) => {
      g.enable(d);
      g.enableLink(b, d);
      g.enableLink(d, c);
      g.disableLink(b, a);
      g.disableLink(a, c);
      g.swapTags(a, d);
      g.nodes[d.x][d.y].flagged = true;
      g.copyEdgeTagsPreservingIds(b, a, b, d);
      g.copyEdgeTagsPreservingIds(a, c, d, c);
      g.reset(a);
    },
  },

  // a   x     a > b
  //       ==> ^   V
  // x   x     c < d
  {
    name: "corner loop",
    metadata: { addsCycle: true, enablesNodes: 3 },
    searchNearPrevIndex: [-1, 0, 0, 1],
    applicabilityFuncs: [
      (g, { x, y }) => g.nodes[x][y].active,
      (g, { x, y }, a) => !g.nodes[x][y].active && adjacent({ x, y }, a),
      (g, { x, y }, a) => !g.nodes[x][y].active && adjacent({ x, y }, a),
      (g, { x, y }, _a, b, c) =>
        !g.nodes[x][y].active && adjacent({ x, y }, b) && adjacent({ x, y }, c),
    ],
    applyToGraph: (g, [a, b, c, d]) => {
      g.enable(b);
      g.enable(c);
      g.enable(d);
      g.enableLink(a, b);
      g.enableLink(b, d);
      g.enableLink(d, c);
      g.enableLink(c, a);
    },
    optionalFeatures: [
      makeOneWayPassageFeature(0, 1, 2, 0),
      makeTwoMasterLockFeature(0, 1, 2, 0),
      makeMasterLockFeature(0, 1),
      {
        name: "secret or hazard",
        applyFeature: (g, [a, _, c, d]) => {
          g.addNodeTag(d, tags.Boss);
          g.addNodeTag(c, tags.Treasure);
          g.addEdgeTag(c, a, tags.SecretEdge);
        },
      },
      {
        name: "forced boss",
        applyFeature: (g, [a, b, c, d]) => {
          g.addNodeTag(d, tags.Boss);
          g.addEdgeTag(a, b, tags.OneTimeEdge);
          g.addEdgeTag(c, a, tags.OneTimeEdge);
        },
      },
    ],
  },

  // a > b > c       a > b > c
  //            ==>  V       ^
  // x   x   x       d > e > f
  {
    name: "alternate way",
    metadata: { addsCycle: true, enablesNodes: 3 },
    searchNearPrevIndex: [-1, 0, 1, 0, 3, 2],
    applicabilityFuncs: [
      (g, { x, y }) => g.nodes[x][y].active,
      (g, { x, y }, a) =>
        g.nodes[x][y].active &&
        adjacent({ x, y }, a) &&
        g.isDirected(a, { x, y }),
      (g, { x, y }, _a, b) =>
        g.nodes[x][y].active &&
        adjacent({ x, y }, b) &&
        g.isDirected(b, { x, y }),
      (g, { x, y }, a) => !g.nodes[x][y].active && adjacent({ x, y }, a),
      (g, { x, y }, _a, _b, _c, d) =>
        !g.nodes[x][y].active && adjacent({ x, y }, d),
      (g, { x, y }, _a, _b, c, _d, e) =>
        !g.nodes[x][y].active && adjacent({ x, y }, e) && adjacent({ x, y }, c),
    ],
    applyToGraph: (g, [a, b, c, d, e, f]) => {
      g.enable(d);
      g.enable(e);
      g.enable(f);
      g.enableLink(a, d);
      g.enableLink(d, e);
      g.enableLink(e, f);
      g.enableLink(f, c);
      if (!g.hasTags(b)) g.addNodeTag(b, randomHazard());
    },
    mandatoryFeatures: [
      null,
      makeSecretPassageFeature(0, 3),
      makeMasterLockFeature(0, 3),
      makeOneKeyTwoLockFeature(0, 3, 5, 2),
      makeOneWayPassageFeature(0, 3, 5, 2),
      makeTwoMasterLockFeature(0, 3, 5, 2),
    ],
    optionalFeatures: [
      {
        name: "hazard",
        applyFeature: (g, [_a, _b, _c, _d, e]) =>
          g.addNodeTag(e, randomHazard()),
      },
    ],
  },

  // x   x   x     c > d > e
  //           =>  ^       V
  // a > b   x     a > b < f
  {
    name: "adjacent cycle 4",
    metadata: { addsCycle: true, enablesNodes: 4 },
    searchNearPrevIndex: [-1, 0, 0, 2, 3, 1],
    applicabilityFuncs: [
      (g, { x, y }) => g.nodes[x][y].active,
      (g, { x, y }, a) =>
        g.nodes[x][y].active &&
        adjacent({ x, y }, a) &&
        g.isDirected(a, { x, y }),
      (g, { x, y }, a) => !g.nodes[x][y].active && adjacent(a, { x, y }),
      (g, { x, y }, _a, _b, c) =>
        !g.nodes[x][y].active && adjacent(c, { x, y }),
      (g, { x, y }, _a, _b, _c, d) =>
        !g.nodes[x][y].active && adjacent(d, { x, y }),
      (g, { x, y }, _a, b, _c, _d, e) =>
        !g.nodes[x][y].active && adjacent(e, { x, y }) && adjacent(b, { x, y }),
    ],
    applyToGraph: (g, [a, b, c, d, e, f]) => {
      g.enable(c);
      g.enable(d);
      g.enable(e);
      g.enable(f);
      g.enableLink(a, c);
      g.enableLink(c, d);
      g.enableLink(d, e);
      g.enableLink(e, f);
      g.enableLink(f, b);
    },
    mandatoryFeatures: [
      {
        name: "copy ab <> ac",
        applyFeature: (g, [a, b, c]) => {
          g.copyEdgeTagsPreservingIds(a, b, a, c);
        },
      },
      makeSecretPassageFeature(0, 2),
      makeMasterLockFeature(0, 2),
      makeOneWayPassageFeature(0, 2, 5, 1),
      makeTwoMasterLockFeature(0, 2, 5, 1),
    ],
    optionalFeatures: [
      {
        name: "hazard",
        applyFeature: (g, [_a, _b, c]) => g.addNodeTag(c, randomHazard()),
      },
    ],
  },
];
