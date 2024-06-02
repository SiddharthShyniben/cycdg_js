import { adjacent, vec } from "../coords.js";
import {
  areGraphCoordsInterlinked,
  copyEdgeTagsPreservingIds,
  graphAddEdgeTagByCoords,
  graphAddNodeTag,
  graphAddNodeTagPreserveLastId,
  graphDisableDirLinksByCoords,
  graphEnableDirLinksByCoords,
  graphNodeHasTag,
  graphNodeHasTags,
  graphSize,
  graphSwapEdgeTags,
  isGraphEdgeDirectedBetweenCoords,
  tags,
} from "../graph.js";
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
  makeOneTimePassageFeature,
  makeOneWayPassageFeature,
  makeSecretPassageFeature,
  makeTagAdder,
  makeTwoMasterLockFeature,
  makeWindowPassageFeature,
} from "./util.js";

export default [
  // a => x
  {
    name: "disable one",
    metadata: { finalizesDisabledNodes: 1 },
    searchNearPrevIndex: [-1],
    applicabilityFuncs: [
      (g, { x, y }) =>
        !g.nodes[x][y].active && graphHasNoFinalizedNodesNear(g, { x, y }),
    ],
    applyToGraph: (g, { x, y }) => (g.nodes[x][y].finalized = true),
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
      (g, { x, y }) =>
        !g.nodes[x][y].active && graphHasNoFinalizedNodesNear(g, { x, y }),
      (g, { x, y }, prev) =>
        !g.nodes[x][y].active &&
        adjacent(prev, { x, y }) &&
        graphHasNoFinalizedNodesNear(g, { x, y }),
    ],
    applyToGraph: (g, nodes) =>
      nodes.slice(0, 2).map(({ x, y }) => (g.nodes[x][y].finalized = true)),
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
      (g, { x, y }) =>
        !g.nodes[x][y].active && graphHasNoFinalizedNodesNear(g, { x, y }),
      (g, { x, y }, prev) =>
        !g.nodes[x][y].active &&
        adjacent(prev, { x, y }) &&
        graphHasNoFinalizedNodesNear(g, { x, y }),
      (g, { x, y }, p, q) => {
        const [w, h] = graphSize(g);

        // Prevent L shape closing away the corner of the map
        if (
          areCoordsAdjacentToRectCorner({ x, y }, vec(0), vec(w, h)) &&
          areCoordsAdjacentToRectCorner(p, vec(0), vec(w, h)) &&
          !areCoordsOnRect(q, vec(0), vec(w, h))
        ) {
          return false;
        }

        return (
          !g.nodes[x][y].active &&
          adjacent(q, { x, y }) &&
          graphHasNoFinalizedNodesNear(g, { x, y })
        );
      },
    ],
    applyToGraph: (g, nodes) =>
      nodes.slice(0, 3).map(({ x, y }) => (g.nodes[x][y].finalized = true)),
  },

  // a
  {
    name: "thing",
    metadata: { additionalWeight: -4 },
    searchNearPrevIndex: [-1],
    applicabilityFuncs: [
      (g, { x, y }) => g.nodes[x][y].active && !graphNodeHasTags(g, { x, y }),
    ],
    applyToGraph: () => {},
    mandatoryFeatures: [
      {
        name: "treasure",
        applyFeature: (g, node) => graphAddNodeTag(g, node, tags.Treasure),
      },
      {
        name: "hazard",
        applyFeature: (g, node) => graphAddNodeTag(g, node, randomHazard()),
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
      (g, { x, y }) => g.nodes[x][y].active,
      (g, { x, y }, prev) =>
        g.nodes[x][y].active &&
        adjacent(prev, { x, y }) &&
        !areGraphCoordsInterlinked(g, { x, y }, prev),
    ],
    applyToGraph: (g, [a, b]) => graphEnableDirLinksByCoords(g, a, b),
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
      (g, { x, y }) => g.nodes[x][y].active,
      (g, { x, y }, prev) => !g.nodes[x][y].active && adjacent(prev, { x, y }),
    ],
    applyToGraph: (g, [a, b]) => {
      g.nodes[b.x][b.y].active = true;
      graphEnableDirLinksByCoords(g, a, b);
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
      (g, { x, y }) =>
        g.nodes[x][y].active &&
        graphNodeHasTags(g, { x, y }) &&
        !graphNodeHasTag(g, { x, y }, tags.Teleport) &&
        !graphNodeHasTag(g, { x, y }, tags.Start),
      (g, { x, y }) => !g.nodes[x][y].active,
      (g, { x, y }, _, b) => !g.nodes[x][y].active && adjacent({ x, y }, b),
    ],
    applyToGraph: (g, [a, b, c]) => {
      g.nodes[b.x][b.y].active = true;
      g.nodes[c.x][c.y].active = true;
      graphEnableDirLinksByCoords(g, b, c);
      moveRandomNodeTag(g, a, c);
      graphAddNodeTag(g, a, tags.Teleport);
      graphAddNodeTagPreserveLastId(g, b, tags.Teleport);
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
      (g, { x, y }) => g.nodes[x][y].active,
      (g, { x, y }, a) => g.nodes[x][y].active && !adjacent({ x, y }, a),
      (g, { x, y }, a, b) =>
        !g.nodes[x][y].active && adjacent({ x, y }, a) && adjacent({ x, y }, b),
    ],
    applyToGraph: (g, [a, b, c]) => {
      g.nodes[c.x][c.y].active = true;
      graphEnableDirLinksByCoords(g, a, c);
      graphEnableDirLinksByCoords(g, c, b);
    },
    mandatoryFeatures: [
      makeOneTimePassageFeature(0, 2),
      makeMasterLockFeature(0, 2),
      makeOneWayPassageFeature(0, 2, 2, 1),
      makeTwoMasterLockFeature(0, 2, 2, 1),
      {
        name: "secret passage",
        applyFeature: (g, [a, b, c]) => {
          graphAddEdgeTagByCoords(g, a, c, tags.SecretEdge);
          graphAddEdgeTagByCoords(g, c, b, tags.SecretEdge);
          if (rng.randInRange(2) == 0) graphAddNodeTag(g, c, randomHazard());
        },
      },
    ],
    optionalFeatures: [
      {
        name: "hazard",
        applyFeature: (g, [_a, _b, c]) => graphAddNodeTag(g, c, randomHazard()),
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
        isGraphEdgeDirectedBetweenCoords(g, { x, y }, a),
      (g, { x, y }, a) => !g.nodes[x][y].active && adjacent(a, { x, y }),
      (g, { x, y }, _a, b, c) =>
        !g.nodes[x][y].active && adjacent(b, { x, y }) && adjacent(c, { x, y }),
    ],
    applyToGraph: (g, [a, b, c, d]) => {
      g.nodes[c.x][c.y].active = g.nodes[d.x][d.y].active = true;
      graphEnableDirLinksByCoords(g, a, c);
      graphEnableDirLinksByCoords(g, c, d);
      graphEnableDirLinksByCoords(g, d, b);
      graphDisableDirLinksByCoords(g, a, b);
    },
    mandatoryFeatures: [
      {
        name: "swap ab <> ac",
        applyFeature: (g, [a, b, c, _d]) => {
          graphSwapEdgeTags(g, a, b, a, c);
        },
      },
      {
        name: "swap ab <> cd",
        applyFeature: (g, [a, b, c, d]) => {
          graphSwapEdgeTags(g, a, b, c, d);
        },
      },
      {
        name: "swap ab <> db",
        applyFeature: (g, [a, b, _c, d]) => {
          graphSwapEdgeTags(g, a, b, d, b);
        },
      },
    ],
    optionalFeatures: [
      {
        name: "boss",
        applyFeature: (g, nodes) =>
          graphAddNodeTag(g, nodes[rng.randInRange(2) + 2], tags.Boss),
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
        isGraphEdgeDirectedBetweenCoords(g, { x, y }, a),
      (g, { x, y }, a) => !g.nodes[x][y].active && adjacent(a, { x, y }),
      (g, { x, y }, _a, b, c) =>
        !g.nodes[x][y].active && adjacent(b, { x, y }) && adjacent(c, { x, y }),
    ],
    applyToGraph: (g, [a, b, c, d]) => {
      g.nodes[c.x][c.y].active = g.nodes[d.x][d.y].active = true;
      graphEnableDirLinksByCoords(g, a, c);
      graphEnableDirLinksByCoords(g, c, d);
      graphEnableDirLinksByCoords(g, d, b);
    },
    mandatoryFeatures: [
      {
        name: "copy ab <> ac",
        applyFeature: (g, [a, b, c, _d]) => {
          copyEdgeTagsPreservingIds(g, a, b, a, c);
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
        applyFeature: (g, [_a, _b, _c, d]) =>
          graphAddNodeTag(g, d, randomHazard()),
      },
    ],
  },

  // b   x     b > d
  // V     ==>     V
  // a > c     x   c
];
