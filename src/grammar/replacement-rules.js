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
];
