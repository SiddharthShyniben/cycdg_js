import { graphAddEdgeTagByCoords, tags } from "../graph.js";
import { addTagAtRandomActiveNode } from "../util.js";

export const makeKeyLockFeature = (a = 0, b = 1) => ({
  name: "lock",
  prepareFeature: (g) => {
    addTagAtRandomActiveNode(g, tags.Key);
  },
  applyFeature: (g, ...coords) => {
    graphAddEdgeTagByCoords(g, coords[a], coords[b], tags.LockedEdge);
  },
});
