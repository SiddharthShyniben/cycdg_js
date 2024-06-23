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
  graphHasNoFinalizedNodesNear,
} from "./util.js";
import {
  areCoordsAdjacentToRectCorner,
  areCoordsOnRect,
  moveRandomNodeTag,
  randomHazard,
} from "../util.js";
import { adjacent, vec } from "../coords.js";
import { tags } from "../consts.js";

// NOTE: some sort of scaffolding system for this?
export default [
  // a => x
  {
    name: "disable one",
    metadata: { finalizesDisabledNodes: 1 },
    searchNearPrevIndex: [-1],
    applicabilityFuncs: [
      (g, x) => !g.active(x) && graphHasNoFinalizedNodesNear(g, x),
    ],
    applyToGraph: (g, x) => g.finalize(x),
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
      (g, x) => !g.active(x) && graphHasNoFinalizedNodesNear(g, x),
      (g, x, a) =>
        !g.active(x) && adjacent(a, x) && graphHasNoFinalizedNodesNear(g, x),
    ],
    applyToGraph: (g, nodes) => nodes.slice(0, 2).map((x) => g.finalize(x)),
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
      (g, x) => !g.active(x) && graphHasNoFinalizedNodesNear(g, x),
      (g, x, a) =>
        !g.active(x) && adjacent(a, x) && graphHasNoFinalizedNodesNear(g, x),
      (g, x, a, b) => {
        const [w, h] = g.size();

        // Prevent L shape closing away the corner of the map
        if (
          areCoordsAdjacentToRectCorner(x, vec(0), vec(w, h)) &&
          areCoordsAdjacentToRectCorner(a, vec(0), vec(w, h)) &&
          !areCoordsOnRect(b, vec(0), vec(w, h))
        ) {
          return false;
        }

        return (
          !g.active(x) && adjacent(b, x) && graphHasNoFinalizedNodesNear(g, x)
        );
      },
    ],
    applyToGraph: (g, nodes) => nodes.slice(0, 3).map((x) => g.finalize(x)),
  },

  // a
  {
    name: "thing",
    metadata: { additionalWeight: -4 },
    searchNearPrevIndex: [-1],
    applicabilityFuncs: [(g, x) => g.active(x) && !g.hasTags(x)],
    applyToGraph: () => {},
    mandatoryFeatures: [
      {
        name: "treasure",
        applyFeature: (g, node) => g.addNodeTag(node, tags.Treasure),
      },
      {
        name: "hazard",
        applyFeature: (g, node) => g.addNodeTag(node, randomHazard(g)),
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
      (g, x) => g.active(x),
      (g, x, a) => g.active(x) && adjacent(a, x) && !g.interlinked(x, a),
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
      (g, x) => g.active(x),
      (g, x, a) => !g.active(x) && adjacent(a, x),
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
      (g, x) =>
        g.active(x) &&
        g.hasTags(x) &&
        !g.hasTag(x, tags.Teleport) &&
        !g.hasTag(x, tags.Start),
      (g, x) => !g.active(x),
      (g, x, _, b) => !g.active(x) && adjacent(x, b),
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

  // a x b => a > c > b
  {
    name: "connect via room",
    metadata: {
      addsCycle: true,
      enablesNodes: 1,
    },
    searchNearPrevIndex: [-1, -1, 0],
    applicabilityFuncs: [
      (g, x) => g.active(x),
      (g, x, a) => g.active(x) && !adjacent(x, a),
      (g, x, a, b) => !g.active(x) && adjacent(x, a) && adjacent(x, b),
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
          if (g.rng.randInRange(2) == 0) g.addNodeTag(c, randomHazard(g));
        },
      },
    ],
    optionalFeatures: [
      {
        name: "hazard",
        applyFeature: (g, [_a, _b, c]) => g.addNodeTag(c, randomHazard(g)),
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
      (g, x) => g.active(x),
      (g, x, a) => g.active(x) && adjacent(a, x) && g.isDirected(a, x),
      (g, x, a) => !g.active(x) && adjacent(a, x),
      (g, x, _, b, c) => !g.active(x) && adjacent(b, x) && adjacent(c, x),
    ],
    applyToGraph: (g, [a, b, c, d]) => {
      g.enable(c, d)
        .enableLink(a, c)
        .enableLink(c, d)
        .enableLink(d, b)
        .disableLink(a, b);
    },
    mandatoryFeatures: [
      {
        name: "swap ab <> ac",
        applyFeature: (g, [a, b, c]) => {
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
        applyFeature: (g, [a, b, _, d]) => {
          g.swapEdgeTags(a, b, d, b);
        },
      },
    ],
    optionalFeatures: [
      {
        name: "boss",
        applyFeature: (g, nodes) =>
          g.addNodeTag(nodes[g.rng.randInRange(2) + 2], tags.Boss),
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
      (g, x) => g.active(x),
      (g, x, a) => g.active(x) && adjacent(a, x) && g.isDirected(x, a),
      (g, x, a) => !g.active(x) && adjacent(a, x),
      (g, x, _, b, c) => !g.active(x) && adjacent(b, x) && adjacent(c, x),
    ],
    applyToGraph: (g, [a, b, c, d]) => {
      g.enable(c, d).enableLink(a, c).enableLink(c, d).enableLink(d, b);
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
      makeTwoMasterLockFeature(0, 2, 3, 1),
      makeOneWayPassageFeature(0, 2, 3, 1),
    ],
    optionalFeatures: [
      {
        name: "hazard",
        applyFeature: (g, [_a, _b, _c, d]) => g.addNodeTag(d, randomHazard(g)),
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
      (g, x) => g.active(x) && g.edgeCount(x) == 2 && !g.get(x).flagged,
      (g, x, a) => g.active(x) && adjacent(x, a) && g.isDirected(x, a),
      (g, x, a) => g.active(x) && adjacent(x, a) && g.isDirected(a, x),
      (g, x, _, b, c) => !g.active(x) && adjacent(x, b) && adjacent(x, c),
    ],
    applyToGraph: (g, [a, b, c, d]) => {
      g.enable(d)
        .enableLink(b, d)
        .enableLink(d, c)
        .disableLink(b, a)
        .disableLink(a, c)
        .swapTags(a, d);
      g.get(d).flagged = true;
      g.copyEdgeTagsPreservingIds(b, a, b, d)
        .copyEdgeTagsPreservingIds(a, c, d, c)
        .resetNode(a);
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
      (g, x) => g.active(x),
      (g, x, a) => !g.active(x) && adjacent(x, a),
      (g, x, a) => !g.active(x) && adjacent(x, a),
      (g, x, _, b, c) => !g.active(x) && adjacent(x, b) && adjacent(x, c),
    ],
    applyToGraph: (g, [a, b, c, d]) => {
      g.enable(b, c, d)
        .enableLink(a, b)
        .enableLink(b, d)
        .enableLink(d, c)
        .enableLink(c, a);
    },
    optionalFeatures: [
      makeOneWayPassageFeature(0, 1, 2, 0),
      makeTwoMasterLockFeature(0, 1, 2, 0),
      makeMasterLockFeature(0, 1),
      {
        name: "secret or hazard",
        applyFeature: (g, [a, _, c, d]) => {
          g.addNodeTag(d, tags.Boss)
            .addNodeTag(c, tags.Treasure)
            .addEdgeTag(c, a, tags.SecretEdge);
        },
      },
      {
        name: "forced boss",
        applyFeature: (g, [a, b, c, d]) => {
          g.addNodeTag(d, tags.Boss)
            .addEdgeTag(a, b, tags.OneTimeEdge)
            .addEdgeTag(c, a, tags.OneTimeEdge);
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
      (g, x) => g.active(x),
      (g, x, a) => g.active(x) && adjacent(x, a) && g.isDirected(a, x),
      (g, x, _a, b) => g.active(x) && adjacent(x, b) && g.isDirected(b, x),
      (g, x, a) => !g.active(x) && adjacent(x, a),
      (g, x, _a, _b, _c, d) => !g.active(x) && adjacent(x, d),
      (g, x, _a, _b, c, _d, e) =>
        !g.active(x) && adjacent(x, e) && adjacent(x, c),
    ],
    applyToGraph: (g, [a, b, c, d, e, f]) => {
      g.enable(d, e, f)
        .enableLink(a, d)
        .enableLink(d, e)
        .enableLink(e, f)
        .enableLink(f, c);
      if (!g.hasTags(b)) g.addNodeTag(b, randomHazard(g));
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
          g.addNodeTag(e, randomHazard(g)),
      },
    ],
  },

  // x   x   x     c > d > e
  //           =>  ^       V
  // a > b   x     a > b < f
  {
    name: "2 adjacent cycle +4",
    metadata: { addsCycle: true, enablesNodes: 4 },
    searchNearPrevIndex: [-1, 0, 0, 2, 3, 1],
    applicabilityFuncs: [
      (g, x) => g.active(x),
      (g, x, a) => g.active(x) && adjacent(x, a) && g.isDirected(a, x),
      (g, x, a) => !g.active(x) && adjacent(a, x),
      (g, x, _a, _b, c) => !g.active(x) && adjacent(c, x),
      (g, x, _a, _b, _c, d) => !g.active(x) && adjacent(d, x),
      (g, x, _a, b, _c, _d, e) =>
        !g.active(x) && adjacent(e, x) && adjacent(b, x),
    ],
    applyToGraph: (g, [a, b, c, d, e, f]) => {
      g.enable(c, d, e, f)
        .enableLink(a, c)
        .enableLink(c, d)
        .enableLink(d, e)
        .enableLink(e, f)
        .enableLink(f, b);
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
        applyFeature: (g, [_a, _b, c]) => g.addNodeTag(c, randomHazard(g)),
      },
    ],
  },

  //  x   x   x   x     d > e > f > g
  //                =>  ^           V
  //  a > b > c   x     a > b > c < h
  {
    name: "3 adjacent cycle +5",
    metadata: { addsCycle: true, enablesNodes: 5 },
    searchNearPrevIndex: [-1, 0, 1, 0, 3, 4, 5, 2],
    applicabilityFuncs: [
      (g, x) => g.active(x),
      (g, x, a) => g.active(x) && adjacent(x, a) && g.isDirected(a, x),
      (g, x, _, b) => g.active(x) && adjacent(b, x) && g.isDirected(b, x),
      (g, x, a) => !g.active(x) && adjacent(a, x),
      (g, x, _a, _b, _c, d) => !g.active(x) && adjacent(d, x),
      (g, x, _a, _b, _c, _d, e) => !g.active(x) && adjacent(e, x),
      (g, x, _a, _b, _c, _d, _e, f) => !g.active(x) && adjacent(f, x),
      (G, x, a, _b, _c, _d, _e, _f, g) =>
        !G.active(x) && adjacent(g, x) && adjacent(a, x),
    ],
    applyToGraph: (G, [a, _, c, d, e, f, g, h]) => {
      G.enable(d, e, f, g, h)
        .enableLink(a, d)
        .enableLink(d, e)
        .enableLink(e, f)
        .enableLink(f, g)
        .enableLink(g, h)
        .enableLink(h, c);
    },
  },
];
