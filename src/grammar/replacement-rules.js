import { adjacent } from "../coords.js";
import { graphHasNoFinalizedNodesNear } from "./helper.js";

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
    applyToGraph: (g, [a, b]) => (
      (g.nodes[a.x][a.y].finalized = true), (g.nodes[b.x][b.y].finalized = true)
    ),
  },
];
