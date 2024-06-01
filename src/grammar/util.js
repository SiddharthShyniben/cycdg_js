import {
  graphAddEdgeTagByCoords,
  graphEnableDirLinksByCoords,
  tags,
} from "../graph.js";
import { addTagAtRandomActiveNode, doesGraphContainNodeTag } from "../util.js";

export const makeKeyLockFeature = (a = 0, b = 1) => ({
  name: "lock",
  prepareFeature: (g) => {
    addTagAtRandomActiveNode(g, tags.Key);
  },
  applyFeature: (g, ...coords) => {
    graphAddEdgeTagByCoords(g, coords[a], coords[b], tags.LockedEdge);
  },
});

export const makeMasterLockFeature = (a = 0, b = 1) => ({
  name: "master lock",
  additionalWeight: -5,
  prepareFeature: (g) => {
    if (!doesGraphContainNodeTag(g, tags.MasterKey))
      addTagAtRandomActiveNode(g, tags.MasterKey);
  },
  applyFeature: (g, ...coords) => {
    graphAddEdgeTagByCoords(g, coords[a], coords[b], tags.MasterLockedEdge);
  },
});

export const makeSecretPassageFeature = (a = 0, b = 1) => ({
  name: "secret passage",
  applyFeature: (g, ...coords) => {
    graphAddEdgeTagByCoords(g, coords[a], coords[b], tags.SecretEdge);
  },
});

export const makeWindowPassageFeature = (a = 0, b = 1) => ({
  name: "window",
  applyFeature: (g, ...coords) => {
    graphEnableDirLinksByCoords(g, coords[a], coords[b]);
    graphAddEdgeTagByCoords(g, coords[a], coords[b], tags.WindowEdge);
  },
});

export const makeOneTimePassageFeature = (a = 0, b = 1) => ({
  name: "one time",
  additionalWeight: -7,
  applyFeature: (g, ...coords) => {
    graphAddEdgeTagByCoords(g, coords[a], coords[b], tags.OneTimeEdge);
  },
});

export const makeOneWayPassageFeature = (a = 0, b = 1) => ({
  name: "one way <->",
  additionalWeight: -8,
  applyFeature: (g, ...coords) => {
    graphAddEdgeTagByCoords(g, coords[a], coords[b], tags.OneWayEdge);
  },
});
