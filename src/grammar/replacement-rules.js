import { adjacent, spread, vec } from "../coords.js";
import { graphSize } from "../graph.js";
import { areCoordsAdjacentToRectCorner, areCoordsOnRect } from "../util.js";
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

        // Prevent a not yet used node from being locked by a finalized L-shape in a corner.
        // Removal of this check causes a creation of unfillable nodes.
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
];
