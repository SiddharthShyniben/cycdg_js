import { adjacent, vec } from "../coords.js";
import {
  areGraphCoordsInterlinked,
  copyEdgeTagsPreservingIds,
  graphAddEdgeTagByCoords,
  graphAddNodeTag,
  graphAddNodeTagPreserveLastId,
  graphCountEdgesAt,
  graphDisableDirLinksByCoords,
  graphEnableDirLinksByCoords,
  graphEnableNode,
  graphNodeHasTag,
  graphNodeHasTags,
  graphResetNodeAndConnections,
  graphSize,
  graphSwapEdgeTags,
  graphSwapNodeTags,
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
      graphEnableNode(g, b);
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
      graphEnableNode(g, b);
      graphEnableNode(g, c);
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
      graphEnableNode(g, c);
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
        isGraphEdgeDirectedBetweenCoords(g, a, { x, y }),
      (g, { x, y }, a) => !g.nodes[x][y].active && adjacent(a, { x, y }),
      (g, { x, y }, _a, b, c) =>
        !g.nodes[x][y].active && adjacent(b, { x, y }) && adjacent(c, { x, y }),
    ],
    applyToGraph: (g, [a, b, c, d]) => {
      graphEnableNode(g, c);
      graphEnableNode(g, d);
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
      graphEnableNode(g, c);
      graphEnableNode(g, d);
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
  {
    name: "l flip",
    metadata: {},
    searchNearPrevIndex: [-1, 0, 0, 1],
    applicabilityFuncs: [
      (g, { x, y }) =>
        g.nodes[x][y].active &&
        graphCountEdgesAt(g, { x, y }) == 2 &&
        !g.nodes[x][y].flagged,
      (g, { x, y }, a) =>
        g.nodes[x][y].active &&
        adjacent({ x, y }, a) &&
        isGraphEdgeDirectedBetweenCoords(g, { x, y }, a),
      (g, { x, y }, a) =>
        g.nodes[x][y].active &&
        adjacent({ x, y }, a) &&
        isGraphEdgeDirectedBetweenCoords(g, a, { x, y }),
      (g, { x, y }, _, b, c) =>
        !g.nodes[x][y].active && adjacent({ x, y }, b) && adjacent({ x, y }, c),
    ],
    applyToGraph: (g, [a, b, c, d]) => {
      graphEnableNode(g, d);
      graphEnableDirLinksByCoords(g, b, d);
      graphEnableDirLinksByCoords(g, d, c);
      graphDisableDirLinksByCoords(g, b, a);
      graphDisableDirLinksByCoords(g, a, c);
      graphSwapNodeTags(g, a, d);
      g.nodes[d.x][d.y].flagged = true;
      copyEdgeTagsPreservingIds(g, b, a, b, d);
      copyEdgeTagsPreservingIds(g, a, c, d, c);
      graphResetNodeAndConnections(g, a);
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
      graphEnableNode(g, b);
      graphEnableNode(g, c);
      graphEnableNode(g, d);
      graphEnableDirLinksByCoords(g, a, b);
      graphEnableDirLinksByCoords(g, b, d);
      graphEnableDirLinksByCoords(g, d, c);
      graphEnableDirLinksByCoords(g, c, a);
    },
    optionalFeatures: [
      makeOneWayPassageFeature(0, 1, 2, 0),
      makeTwoMasterLockFeature(0, 1, 2, 0),
      makeMasterLockFeature(0, 1),
      {
        name: "secret or hazard",
        applyFeature: (g, [a, _, c, d]) => {
          graphAddNodeTag(g, d, tags.Boss);
          graphAddNodeTag(g, c, tags.Treasure);
          graphAddEdgeTagByCoords(g, c, a, tags.SecretEdge);
        },
      },
      {
        name: "forced boss",
        applyFeature: (g, [a, b, c, d]) => {
          graphAddNodeTag(g, d, tags.Boss);
          graphAddEdgeTagByCoords(g, a, b, tags.OneTimeEdge);
          graphAddEdgeTagByCoords(g, c, a, tags.OneTimeEdge);
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
        isGraphEdgeDirectedBetweenCoords(g, a, { x, y }),
      (g, { x, y }, _a, b) =>
        g.nodes[x][y].active &&
        adjacent({ x, y }, b) &&
        isGraphEdgeDirectedBetweenCoords(g, b, { x, y }),
      (g, { x, y }, a) => !g.nodes[x][y].active && adjacent({ x, y }, a),
      (g, { x, y }, _a, _b, _c, d) =>
        !g.nodes[x][y].active && adjacent({ x, y }, d),
      (g, { x, y }, _a, _b, c, _d, e) =>
        !g.nodes[x][y].active && adjacent({ x, y }, e) && adjacent({ x, y }, c),
    ],
    applyToGraph: (g, [a, b, c, d, e, f]) => {
      graphEnableNode(g, d);
      graphEnableNode(g, e);
      graphEnableNode(g, f);
      graphEnableDirLinksByCoords(g, a, d);
      graphEnableDirLinksByCoords(g, d, e);
      graphEnableDirLinksByCoords(g, e, f);
      graphEnableDirLinksByCoords(g, f, c);
      if (!graphNodeHasTags(g, b)) graphAddNodeTag(g, b, randomHazard());
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
          graphAddNodeTag(g, e, randomHazard()),
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
        isGraphEdgeDirectedBetweenCoords(g, a, { x, y }),
      (g, { x, y }, a) => !g.nodes[x][y].active && adjacent(a, { x, y }),
      (g, { x, y }, _a, _b, c) =>
        !g.nodes[x][y].active && adjacent(c, { x, y }),
      (g, { x, y }, _a, _b, _c, d) =>
        !g.nodes[x][y].active && adjacent(d, { x, y }),
      (g, { x, y }, _a, b, _c, _d, e) =>
        !g.nodes[x][y].active && adjacent(e, { x, y }) && adjacent(b, { x, y }),
    ],
    applyToGraph: (g, [a, b, c, d, e, f]) => {
      graphEnableNode(g, c);
      graphEnableNode(g, d);
      graphEnableNode(g, e);
      graphEnableNode(g, f);
      graphEnableDirLinksByCoords(g, a, c);
      graphEnableDirLinksByCoords(g, c, d);
      graphEnableDirLinksByCoords(g, d, e);
      graphEnableDirLinksByCoords(g, e, f);
      graphEnableDirLinksByCoords(g, f, b);
    },
    mandatoryFeatures: [
      {
        name: "copy ab <> ac",
        applyFeature: (g, [a, b, c]) => {
          copyEdgeTagsPreservingIds(g, a, b, a, c);
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
        applyFeature: (g, [_a, _b, c]) => graphAddNodeTag(g, c, randomHazard()),
      },
    ],
  },
];
