import { adjacent, isCardinal, vec } from "../coords.js";
import {
  areGraphCoordsInterlinked,
  graphAddNodeTag,
  graphEnableDirLinksByCoords,
  graphNodeHasTags,
  graphSize,
  tags,
} from "../graph.js";
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
  makeWindowPassageFeature,
} from "./util.js";

export default [
  {
    name: "disable one",
    metadata: {
      finalizesDisabledNodes: 1,
    },
    searchNearPrevIndex: [-1],
    applicabilityFuncs: [
      (g, { x, y }) =>
        !g.nodes[x][y].active && graphHasNoFinalizedNodesNear(g, { x, y }),
    ],
    applyToGraph: (g, { x, y }) => (g.nodes[x][y].finalized = true),
  },
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
  {
    name: "thing",
    metadata: {
      additionalWeight: -4,
    },
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
];
