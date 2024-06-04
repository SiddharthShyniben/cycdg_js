import { tags } from "../graph.js";
import { addTagAtRandomActiveNode, doesGraphContainNodeTag } from "../util.js";

export const makeKeyLockFeature = (a = 0, b = 1) => ({
  name: "lock",
  prepareFeature: (g) => {
    addTagAtRandomActiveNode(g, tags.Key);
  },
  applyFeature: (g, coords) => {
    g.addEdgeTag(coords[a], coords[b], tags.LockedEdge);
  },
});

export const makeOneKeyTwoLockFeature = (a, b, c, d) => ({
  name: "2xlock",
  prepareFeature: (g) => {
    addTagAtRandomActiveNode(g, tags.Key);
  },
  applyFeature: (g, coords) => {
    g.addEdgeTag(coords[a], coords[b], tags.LockedEdge).addEdgeTagPreserveId(
      coords[c],
      coords[d],
      tags.LockedEdge,
    );
  },
});

export const makeMasterLockFeature = (a = 0, b = 1) => ({
  name: "master lock",
  additionalWeight: -5,
  prepareFeature: (g) => {
    if (!doesGraphContainNodeTag(g, tags.MasterKey))
      addTagAtRandomActiveNode(g, tags.MasterKey);
  },
  applyFeature: (g, coords) => {
    g.addEdgeTag(coords[a], coords[b], tags.MasterLockedEdge);
  },
});

export const makeTwoMasterLockFeature = (a, b, c, d) => ({
  name: "master lock",
  additionalWeight: -5,
  prepareFeature: (g) => {
    if (!doesGraphContainNodeTag(g, tags.MasterKey))
      addTagAtRandomActiveNode(g, tags.MasterKey);
  },
  applyFeature: (g, coords) => {
    g.addEdgeTag(
      coords[a],
      coords[b],
      tags.MasterLockedEdge,
    ).addEdgeTagPreserveId(coords[c], coords[d], tags.MasterLockedEdge);
  },
});

export const makeSecretPassageFeature = (a = 0, b = 1) => ({
  name: "secret passage",
  applyFeature: (g, coords) => {
    g.addEdgeTag(coords[a], coords[b], tags.SecretEdge);
  },
});

export const makeWindowPassageFeature = (a = 0, b = 1) => ({
  name: "window",
  applyFeature: (g, coords) => {
    g.enableLink(coords[a], coords[b]).addEdgeTag(
      coords[a],
      coords[b],
      tags.WindowEdge,
    );
  },
});

export const makeOneTimePassageFeature = (a = 0, b = 1) => ({
  name: "one time",
  additionalWeight: -7,
  applyFeature: (g, coords) => {
    g.addEdgeTag(coords[a], coords[b], tags.OneTimeEdge);
  },
});

export const makeOneWayPassageFeature = (a = 0, b = 1, c = 0, d = 1) => ({
  name: "one way <->",
  additionalWeight: -8,
  applyFeature: (g, coords) => {
    g.addEdgeTag(coords[a], coords[b], tags.OneWayEdge).addEdgeTag(
      coords[c],
      coords[d],
      tags.OneWayEdge,
    );
  },
});

export const makeTagAdder = (tag, i = 0) => ({
  name: tag.toLowerCase(),
  applyFeature: (g, coords) => g.addEdgeTag(coords[i], tag),
});
