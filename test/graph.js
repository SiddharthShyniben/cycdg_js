import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { add, vec } from "../src/coords.js";
import {
  areGraphCoordsInterlinked,
  cardinalDirections,
  checkNearCoords,
  coordsInGraphBorder,
  coordsInGraphBounds,
  coordsInGraphCorner,
  copyEdgeTagsPreservingIds,
  countGraphDirEdges,
  doGraphCoordsHaveIncomingLinksOnly,
  drawBiconnectedDirectionalRect,
  drawCardinalConnectedLine,
  drawConnectedDirectionalRect,
  edge,
  edgeHasLinkToVector,
  getEdgeByVector,
  graph,
  graphAddEdgeTagByCoords,
  graphAddEdgeTagByCoordsPreserveLastId,
  graphAddEdgeTagByVector,
  graphAddNodeTag,
  graphAddNodeTagPreserveLastId,
  graphAddTagToAllActiveEdgesByCoords,
  graphAreNodesBetweenCoordsEditable,
  graphCountEdgesAt,
  graphDisableDirLinksByCoords,
  graphEdgeHasTags,
  graphEnableDirLinkByVector,
  graphEnableDirLinksByCoords,
  graphGetEdgeBetweenCoords,
  graphGetEdgeByVector,
  graphGetEnabledNodesCount,
  graphGetFilledNodesPercentage,
  graphNodeCountTags,
  graphNodeHasTag,
  graphNodeHasTags,
  graphResetNodeAndConnections,
  graphSetLinkByVector,
  graphSize,
  graphSwapEdgeTags,
  graphSwapNodeTags,
  isGraphEdgeByVectorActive,
  isGraphEdgeDirectedBetweenCoords,
  isGraphEdgeDirectedByVector,
  node,
  resetEdge,
  resetNode,
  setEdgeLinkByVector,
  swapTags,
  tag,
  tags,
  testSanity,
} from "../src/graph.js";

describe("edge", () => {
  it("should create a edge", () => {
    assert.deepEqual(edge(), { enabled: false, reversed: false, tags: [] });
    assert.deepEqual(edge(true, [tag("test", 1)], true), {
      enabled: true,
      reversed: true,
      tags: [{ tag: "test", id: 1 }],
    });
  });

  it("should reset an edge", () => {
    const myEdge = edge(true, ["tag1"]);

    resetEdge(myEdge);

    assert.strictEqual(myEdge.enabled, false);
    assert.strictEqual(myEdge.reversed, false);
  });

  it("should get the correct edge by vector", () => {
    const myNode = node([edge(true, [], false), edge(true, [], true)]);

    const edge1 = getEdgeByVector(myNode, vec(1, 0));
    const edge2 = getEdgeByVector(myNode, vec(0, 1));

    assert.deepEqual(edge1, myNode.edges[0]);
    assert.deepEqual(edge2, myNode.edges[1]);
  });

  it("should set edge link by vector", () => {
    const myNode = node([edge(true, [], false), edge(false, [], true)]);

    setEdgeLinkByVector(myNode, vec(1, 0), true, true);

    assert(myNode.edges[0].enabled);
    assert(myNode.edges[0].reversed);
  });

  it("should check if an edge has a link to a vector", () => {
    const myNode = node([edge(true, [], false), edge(false, [], true)]);

    assert(edgeHasLinkToVector(myNode, vec(1, 0)));
    assert.strictEqual(edgeHasLinkToVector(myNode, vec(0, 1)), false);
  });
});

describe("node", () => {
  it("should create a node", () => {
    assert.deepEqual(node(), {
      active: false,
      finalized: false,
      tags: [],
      edges: [
        { enabled: false, reversed: false, tags: [] },
        { enabled: false, reversed: false, tags: [] },
      ],
    });

    assert.deepEqual(node([edge()], [tag("test", 2)], true, true), {
      active: true,
      finalized: true,
      tags: [{ tag: "test", id: 2 }],
      edges: [{ enabled: false, reversed: false, tags: [] }],
    });
  });

  it("should swap tags between two nodes", () => {
    const nodeA = node([], ["tagA"]);
    const nodeB = node([], ["tagB"]);

    swapTags(nodeA, nodeB);

    assert.deepEqual(nodeA.tags, ["tagB"]);
    assert.deepEqual(nodeB.tags, ["tagA"]);
  });

  it("should reset a node if it is not finalized", () => {
    const myNode = node([{ active: true }], ["tag1"], true, false);

    resetNode(myNode);

    assert.strictEqual(myNode.active, false);
    assert.strictEqual(myNode.edges[0].enabled, false);
  });

  it("should not reset a node if it is finalized", () => {
    const myNode = node([], [], false, true);

    assert.throws(() => resetNode(myNode));
  });
});

describe("graph", () => {
  it("should initialize a proper graph", () => {
    const g = graph(5, 5);
    assert.deepEqual(g.appliedTags, {});
    for (let x = 0; x < 5; x++) {
      for (let y = 0; y < 5; y++) {
        const item = g.nodes[x][y];
        assert.strictEqual(item.active, false);
        assert.strictEqual(item.finalized, false);
        assert.deepEqual(item.tags, []);
        assert.deepEqual(item.edges, [edge(), edge()]);
      }
    }
  });

  it("should return the size of the graph", () => {
    const myGraph = {
      nodes: [
        [{}, {}],
        [{}, {}],
        [{}, {}],
      ],
    };

    const size = graphSize(myGraph);
    assert.deepEqual(size, [3, 2]);
  });

  it("should check if coordinates are within graph bounds", () => {
    const myGraph = graph(3, 2);

    assert(coordsInGraphBounds(myGraph, { x: 1, y: 1 }));
    assert.strictEqual(coordsInGraphBounds(myGraph, { x: 3, y: 2 }), false);
  });

  it("should check if coordinates are on the graph border", () => {
    const myGraph = graph(3, 3);

    assert(coordsInGraphBorder(myGraph, { x: 0, y: 0 }));
    assert(coordsInGraphBorder(myGraph, { x: 2, y: 2 }));
    assert.strictEqual(coordsInGraphBorder(myGraph, { x: 1, y: 1 }), false);
  });

  it("should check if coordinates are in a graph corner", () => {
    const myGraph = graph(3, 3);

    assert(coordsInGraphCorner(myGraph, vec(0)));
    assert(coordsInGraphCorner(myGraph, vec(0, 2)));
    assert.strictEqual(coordsInGraphCorner(myGraph, vec(1)), false);
  });

  it("should check if there are nodes with specific properties near given coordinates", () => {
    const myGraph = {
      nodes: [
        [{}, { foo: true }, {}],
        [{}, { foo: false }, {}],
        [{}, { foo: true }, {}],
      ],
    };

    const result = checkNearCoords(myGraph, vec(1), (node) => node.foo);
    assert(result);
  });

  it("should get the correct edge by coordinates and by vector", () => {
    const myGraph = graph(2, 2);
    myGraph.nodes[0][0].edges[0].reversed = true;
    myGraph.nodes[0][0].edges[0].enabled = true;

    const from = vec(0);
    const to = vec(1, 0);

    const result = graphGetEdgeBetweenCoords(myGraph, from, to);
    const result2 = graphGetEdgeByVector(myGraph, from, to);

    assert(result.enabled);
    assert(result2.enabled);
    assert(result.reversed);
    assert(result2.reversed);
  });

  it("should ascertain whether graph coords are interlinked", () => {
    const myGraph = graph(2, 2);

    const from = vec(0);
    const to = vec(1, 0);

    assert.strictEqual(areGraphCoordsInterlinked(myGraph, from, to), false);
    assert.strictEqual(isGraphEdgeByVectorActive(myGraph, from, to), false); // in this case, the vector and the coords are the same

    myGraph.nodes[0][0].edges[0].enabled = true;

    assert(areGraphCoordsInterlinked(myGraph, from, to));
    assert(isGraphEdgeByVectorActive(myGraph, from, to));
  });

  it("should count active edges", () => {
    const myGraph = graph(2, 2);
    myGraph.nodes[0][0].edges[0].enabled = true;
    myGraph.nodes[0][0].edges[1].enabled = true;

    assert.strictEqual(graphCountEdgesAt(myGraph, vec(0)), 2);
  });

  it("should set links by vector", () => {
    const myGraph = graph(3, 3);
    graphSetLinkByVector(myGraph, vec(1), vec(0, 1), true);

    assert(myGraph.nodes[1][1].edges[1].enabled);
  });

  it("should check if an edge is directed", () => {
    const myGraph = graph(2, 3);

    assert.strictEqual(
      isGraphEdgeDirectedBetweenCoords(myGraph, vec(0), vec(0, 1)),
      false,
    );

    assert.strictEqual(
      isGraphEdgeDirectedByVector(myGraph, vec(0), vec(0, 1)),
      false,
    );

    myGraph.nodes[0][0].edges[1].enabled = true;

    assert(isGraphEdgeDirectedBetweenCoords(myGraph, vec(0), vec(0, 1)));
    assert(isGraphEdgeDirectedByVector(myGraph, vec(0), vec(0, 1)));

    myGraph.nodes[0][0].edges[1].reversed = true;

    assert.strictEqual(
      isGraphEdgeDirectedBetweenCoords(myGraph, vec(0), vec(0, 1)),
      false,
    );

    assert.strictEqual(
      isGraphEdgeDirectedByVector(myGraph, vec(0), vec(0, 1)),
      false,
    );

    assert(isGraphEdgeDirectedBetweenCoords(myGraph, vec(0, 1), vec(0)));
    assert(isGraphEdgeDirectedByVector(myGraph, vec(0, 1), vec(0, -1)));
  });

  it("should count directed edges properly", () => {
    const myGraph = graph(3, 3);

    myGraph.nodes[0][0].edges[0].enabled = true;
    myGraph.nodes[0][0].edges[0].reversed = true;

    assert.strictEqual(countGraphDirEdges(myGraph, vec(0, 0), false, true), 0);
    assert.strictEqual(countGraphDirEdges(myGraph, vec(0, 0), true, true), 1);

    myGraph.nodes[0][0].edges[1].enabled = true;

    assert.strictEqual(countGraphDirEdges(myGraph, vec(0, 0), true, true), 2);
    assert.strictEqual(countGraphDirEdges(myGraph, vec(0, 0), true, false), 1);

    myGraph.nodes[1][0].edges[0].enabled = true;

    assert.strictEqual(countGraphDirEdges(myGraph, vec(1, 0), true, true), 2);
    assert.strictEqual(countGraphDirEdges(myGraph, vec(1, 0), false, true), 2);
    assert.strictEqual(countGraphDirEdges(myGraph, vec(1, 0), true, false), 0);
  });

  it("should check if a node has incoming links only", () => {
    const myGraph = graph(3, 3);

    assert(doGraphCoordsHaveIncomingLinksOnly(myGraph, vec(0)));

    myGraph.nodes[0][0].edges[0].enabled = true;

    assert.strictEqual(
      doGraphCoordsHaveIncomingLinksOnly(myGraph, vec(0)),
      false,
    );

    myGraph.nodes[0][0].edges[0].reversed = true;

    assert(doGraphCoordsHaveIncomingLinksOnly(myGraph, vec(0)));
  });

  it("should enable and disable directional links properly", () => {
    const myGraph = graph(3, 3);

    graphEnableDirLinkByVector(myGraph, vec(0), vec(1, 0));

    assert(myGraph.nodes[0][0].edges[0].enabled);
    assert.strictEqual(myGraph.nodes[0][0].edges[0].reversed, false);

    graphEnableDirLinkByVector(myGraph, vec(1, 0), vec(-1, 0));

    assert(myGraph.nodes[0][0].edges[0].enabled);
    assert(myGraph.nodes[0][0].edges[0].reversed);

    graphEnableDirLinksByCoords(myGraph, vec(1), vec(2, 1));

    assert(myGraph.nodes[1][1].edges[0].enabled);
    assert.strictEqual(myGraph.nodes[1][1].edges[0].reversed, false);

    graphDisableDirLinksByCoords(myGraph, vec(1), vec(2, 1));

    assert.strictEqual(myGraph.nodes[1][1].edges[0].enabled, false);
    assert.strictEqual(myGraph.nodes[1][1].edges[0].reversed, false); // NOTE: Doesn't matter for a disabled edge
  });

  it("should reset a graph properly", () => {
    const myGraph = graph(3, 3);

    myGraph.nodes[0][0].active = true;

    graphEnableDirLinkByVector(myGraph, vec(0), vec(1, 0));
    graphEnableDirLinkByVector(myGraph, vec(0, 1), vec(0, -1));

    graphResetNodeAndConnections(myGraph, vec(0));

    assert.strictEqual(myGraph.nodes[0][0].active, false);
    assert.strictEqual(myGraph.nodes[0][0].edges[0].enabled, false);
    assert.strictEqual(myGraph.nodes[0][0].edges[1].enabled, false);
    assert.strictEqual(myGraph.nodes[0][0].edges[0].reversed, false);
    assert.strictEqual(myGraph.nodes[0][0].edges[1].reversed, false);
  });

  it("should check if nodes in an area are editable", () => {
    const myGraph = graph(4, 4);

    assert(graphAreNodesBetweenCoordsEditable(myGraph, vec(0), vec(3)));
    assert.strictEqual(
      graphAreNodesBetweenCoordsEditable(myGraph, vec(-1), vec(3)),
      false,
    );

    myGraph.nodes[1][1].finalized = true;
    assert.strictEqual(
      graphAreNodesBetweenCoordsEditable(myGraph, vec(0), vec(3)),
      false,
    );
  });

  it("should properly count enabled nodes", () => {
    const myGraph = graph(4, 4);
    assert.strictEqual(graphGetEnabledNodesCount(myGraph), 0);
    assert.strictEqual(graphGetFilledNodesPercentage(myGraph), 0);

    myGraph.nodes.flat().forEach((n) => (n.active = true));

    assert.strictEqual(graphGetEnabledNodesCount(myGraph), 16);
    assert.strictEqual(graphGetFilledNodesPercentage(myGraph), 100);

    myGraph.nodes.flat().forEach((n) => (n.active = false));
    myGraph.nodes.flat().forEach((n, i) => (n.finalized = !!(i % 2)));

    assert.strictEqual(graphGetEnabledNodesCount(myGraph), 0);
    assert.strictEqual(graphGetFilledNodesPercentage(myGraph), 50);
  });
});

describe("tag", () => {
  it("should create a tag", () => {
    assert.deepEqual(tag("foo", "lol"), { tag: "foo", id: "lol" });
  });

  it("should add a tag to a node in the graph", () => {
    const myGraph = graph(2, 2);

    graphAddNodeTag(myGraph, vec(0), tags.MasterKey);

    assert.strictEqual(myGraph.nodes[0][0].tags.length, 1);
    assert.deepEqual(myGraph.nodes[0][0].tags[0], tag(tags.MasterKey, 0));

    graphAddNodeTag(myGraph, vec(0), tags.Key);

    assert.strictEqual(myGraph.nodes[0][0].tags.length, 2);
    assert.deepEqual(myGraph.nodes[0][0].tags[1], tag(tags.Key, 0));

    graphAddNodeTag(myGraph, vec(0), tags.Key);

    assert.strictEqual(myGraph.nodes[0][0].tags.length, 3);
    assert.deepEqual(myGraph.nodes[0][0].tags[2], tag(tags.Key, 1));
  });

  it("should add a tag to a node and preserve the last ID", () => {
    const myGraph = graph(2, 2);

    graphAddNodeTag(myGraph, vec(1), tags.Boss);
    graphAddNodeTagPreserveLastId(myGraph, { x: 1, y: 1 }, tags.Boss);

    assert.strictEqual(myGraph.nodes[1][1].tags.length, 2);
    assert.deepEqual(myGraph.nodes[1][1].tags[0], tag(tags.Boss, 0));
    assert.deepEqual(myGraph.nodes[1][1].tags[1], tag(tags.Boss, 0));
  });

  it("should add a tag to an edge and preserve IDs when needed", () => {
    const myGraph = graph(3, 3);

    graphAddEdgeTagByVector(myGraph, vec(0, 0), vec(1, 0), tags.Goal);

    assert.strictEqual(myGraph.nodes[0][0].edges[0].tags.length, 1);
    assert.deepEqual(myGraph.nodes[0][0].edges[0].tags[0], tag(tags.Goal, 0));

    graphAddEdgeTagByCoords(myGraph, vec(1), vec(1, 2), tags.HalfKey);

    assert.strictEqual(myGraph.nodes[1][1].edges[1].tags.length, 1);
    assert.deepEqual(
      myGraph.nodes[1][1].edges[1].tags[0],
      tag(tags.HalfKey, 0),
    );

    graphAddEdgeTagByCoordsPreserveLastId(
      myGraph,
      vec(1),
      vec(1, 2),
      tags.HalfKey,
    );

    assert.strictEqual(myGraph.nodes[1][1].edges[1].tags.length, 2);
    assert.deepEqual(
      myGraph.nodes[1][1].edges[1].tags[1],
      tag(tags.HalfKey, 0),
    );

    graphAddEdgeTagByVector(myGraph, vec(2, 2), vec(-1, 0), tags.Goal);

    assert.strictEqual(myGraph.nodes[1][2].edges[0].tags.length, 1);
    assert.deepEqual(myGraph.nodes[0][0].edges[0].tags[0], tag(tags.Goal, 0));

    const otherGraph = graph(3, 3);

    otherGraph.nodes[1][1].edges[0].enabled = true;

    graphAddTagToAllActiveEdgesByCoords(otherGraph, tags.LockedEdge, vec(1));

    assert.strictEqual(otherGraph.nodes[1][1].edges[0].tags.length, 1);
    assert.deepEqual(
      otherGraph.nodes[1][1].edges[0].tags[0],
      tag(tags.LockedEdge, 0),
    );

    assert.strictEqual(otherGraph.nodes[1][1].edges[1].tags.length, 0); // Inactive edge, should not have a tag

    otherGraph.nodes[1][0].edges[1].enabled = true;
    otherGraph.nodes[0][1].edges[0].enabled = true;

    graphAddTagToAllActiveEdgesByCoords(otherGraph, tags.LockedEdge, vec(1));

    assert.strictEqual(otherGraph.nodes[1][0].edges[1].tags.length, 1);
    assert.strictEqual(otherGraph.nodes[0][1].edges[0].tags.length, 1);

    otherGraph.nodes[2][2].tags.push(
      tag(tags.Goal, 0),
      tag(tags.Boss, 1),
      tag(tags.Start, 2),
    );

    otherGraph.nodes[2][1].tags.push(
      tag(tags.WindowEdge, 4),
      tag(tags.Trap, 5),
      tag(tags.BilockedEdge, 6),
    );

    graphSwapNodeTags(otherGraph, vec(2), vec(2, 1));

    assert.deepEqual(otherGraph.nodes[2][2].tags, [
      tag(tags.WindowEdge, 4),
      tag(tags.Trap, 5),
      tag(tags.BilockedEdge, 6),
    ]);
    assert.deepEqual(otherGraph.nodes[2][1].tags, [
      tag(tags.Goal, 0),
      tag(tags.Boss, 1),
      tag(tags.Start, 2),
    ]);

    assert(graphNodeHasTags(otherGraph, vec(2)));
    assert.strictEqual(graphNodeHasTags(otherGraph, vec(2, 0)), false);
    assert.strictEqual(graphNodeCountTags(otherGraph, vec(2)), 3);

    assert(graphNodeHasTag(otherGraph, vec(2), tags.WindowEdge));
    assert.strictEqual(graphNodeHasTag(otherGraph, vec(2), tags.Start), false);

    assert(graphEdgeHasTags(otherGraph, vec(1, 0), vec(0, 1)));
    assert.strictEqual(
      graphEdgeHasTags(otherGraph, vec(2, 2), vec(-1, 0)),
      false,
    );

    const thirdGraph = graph(3, 3);

    thirdGraph.nodes[1][1].edges[0].tags.push(
      tag(tags.Goal, 0),
      tag(tags.Boss, 1),
      tag(tags.Start, 2),
    );

    thirdGraph.nodes[1][1].edges[1].tags.push(
      tag(tags.WindowEdge, 4),
      tag(tags.Trap, 5),
      tag(tags.BilockedEdge, 6),
    );

    graphSwapEdgeTags(thirdGraph, vec(1), vec(2, 1), vec(1), vec(1, 2));

    assert.deepEqual(thirdGraph.nodes[1][1].edges[0].tags, [
      tag(tags.WindowEdge, 4),
      tag(tags.Trap, 5),
      tag(tags.BilockedEdge, 6),
    ]);

    assert.deepEqual(thirdGraph.nodes[1][1].edges[1].tags, [
      tag(tags.Goal, 0),
      tag(tags.Boss, 1),
      tag(tags.Start, 2),
    ]);

    copyEdgeTagsPreservingIds(thirdGraph, vec(0), vec(1, 0), vec(1), vec(2, 1));

    assert.deepEqual(thirdGraph.nodes[0][0].edges[0].tags, [
      tag(tags.WindowEdge, 4),
      tag(tags.Trap, 5),
      tag(tags.BilockedEdge, 6),
    ]);
  });

  it("draws a cardinal connected line properly", () => {
    const myGraph = graph(3, 3);

    drawCardinalConnectedLine(myGraph, vec(0, 0), vec(0, 2));

    assert(myGraph.nodes[0][0].active);
    assert(myGraph.nodes[0][1].active);
    assert(myGraph.nodes[0][2].active);

    assert(myGraph.nodes[0][0].edges[1].enabled);
    assert(myGraph.nodes[0][1].edges[1].enabled);

    drawCardinalConnectedLine(myGraph, vec(2, 2), vec(2, 0));

    assert(myGraph.nodes[2][0].active);
    assert(myGraph.nodes[2][1].active);
    assert(myGraph.nodes[2][2].active);

    assert(myGraph.nodes[2][0].edges[1].enabled);
    assert(myGraph.nodes[2][0].edges[1].reversed);
    assert(myGraph.nodes[2][1].edges[1].enabled);
    assert(myGraph.nodes[2][1].edges[1].reversed);
  });

  it("draws a proper rectangle", () => {
    for (const ccw of [false, true]) {
      const myGraph = graph(3, 3);

      drawConnectedDirectionalRect(myGraph, vec(0), vec(3), ccw);

      assert(myGraph.nodes[0][0].active);
      assert(myGraph.nodes[0][1].active);
      assert(myGraph.nodes[0][2].active);
      assert(myGraph.nodes[1][2].active);
      assert(myGraph.nodes[2][2].active);
      assert(myGraph.nodes[2][1].active);
      assert(myGraph.nodes[2][0].active);
      assert(myGraph.nodes[1][0].active);

      assert.strictEqual(myGraph.nodes[1][1].active, false);

      assert(myGraph.nodes[0][0].edges[1].enabled);
      assert.strictEqual(myGraph.nodes[0][0].edges[1].reversed, !ccw);

      assert(myGraph.nodes[0][1].edges[1].enabled);
      assert.strictEqual(myGraph.nodes[0][1].edges[1].reversed, !ccw);

      assert(myGraph.nodes[0][2].edges[0].enabled);
      assert.strictEqual(myGraph.nodes[0][2].edges[0].reversed, !ccw);

      assert(myGraph.nodes[1][2].edges[0].enabled);
      assert.strictEqual(myGraph.nodes[1][2].edges[0].reversed, !ccw);

      assert(myGraph.nodes[2][1].edges[1].enabled);
      assert.strictEqual(myGraph.nodes[2][1].edges[1].reversed, ccw);

      assert(myGraph.nodes[2][0].edges[1].enabled);
      assert.strictEqual(myGraph.nodes[2][0].edges[1].reversed, ccw);

      assert(myGraph.nodes[1][0].edges[0].enabled);
      assert.strictEqual(myGraph.nodes[1][0].edges[0].reversed, ccw);

      assert(myGraph.nodes[0][0].edges[0].enabled);
      assert.strictEqual(myGraph.nodes[0][0].edges[0].reversed, ccw);
    }
  });

  it("draws a proper biconnected rectangle", () => {
    const myGraph = graph(3, 3);

    drawBiconnectedDirectionalRect(
      myGraph,
      vec(0),
      vec(3),
      vec(0, 2),
      vec(1, 0),
    );

    assert(myGraph.nodes[0][0].active);
    assert(myGraph.nodes[0][1].active);
    assert(myGraph.nodes[0][2].active);
    assert(myGraph.nodes[1][2].active);
    assert(myGraph.nodes[2][2].active);
    assert(myGraph.nodes[2][1].active);
    assert(myGraph.nodes[2][0].active);
    assert(myGraph.nodes[1][0].active);

    assert.strictEqual(myGraph.nodes[1][1].active, false);

    assert(myGraph.nodes[0][0].edges[1].enabled);
    assert.strictEqual(myGraph.nodes[0][0].edges[1].reversed, true);

    assert(myGraph.nodes[0][1].edges[1].enabled);
    assert.strictEqual(myGraph.nodes[0][1].edges[1].reversed, true);

    assert(myGraph.nodes[0][2].edges[0].enabled);
    assert.strictEqual(myGraph.nodes[0][2].edges[0].reversed, false);

    assert(myGraph.nodes[1][2].edges[0].enabled);
    assert.strictEqual(myGraph.nodes[1][2].edges[0].reversed, false);

    assert(myGraph.nodes[2][1].edges[1].enabled);
    assert.strictEqual(myGraph.nodes[2][1].edges[1].reversed, true);

    assert(myGraph.nodes[2][0].edges[1].enabled);
    assert.strictEqual(myGraph.nodes[2][0].edges[1].reversed, true);

    assert(myGraph.nodes[1][0].edges[0].enabled);
    assert.strictEqual(myGraph.nodes[1][0].edges[0].reversed, true);

    assert(myGraph.nodes[0][0].edges[0].enabled);
    assert.strictEqual(myGraph.nodes[0][0].edges[0].reversed, false);
  });
});

describe("sanity", () => {
  it("should detect problems with inactive nodes having tags and edges", () => {
    const myGraph = graph(3, 3);

    assert.deepEqual(testSanity(myGraph), { sane: true, problems: [] });

    graphAddNodeTag(myGraph, vec(0), tags.Treasure);
    graphEnableDirLinkByVector(myGraph, vec(0), vec(0, 1));

    const result = testSanity(myGraph);

    assert.strictEqual(result.sane, false);
    assert.deepEqual(result.problems, [
      "Inactive node at (0, 0) has tags",
      "Inactive node at (0, 0) has edge (0, 1)",
      "Inactive node at (0, 1) has edge (0, -1)",
    ]);
  });

  it("should detect problems with active nodes having no active links", () => {
    const myGraph = graph(3, 3);

    assert.deepEqual(testSanity(myGraph), { sane: true, problems: [] });

    myGraph.nodes[0][0].active = true;
    myGraph.nodes[1][1].active = true;
    graphAddNodeTag(myGraph, vec(1), tags.Teleport);

    const result = testSanity(myGraph);

    assert.strictEqual(result.sane, false);
    assert.deepEqual(result.problems, [
      "Active node at (0, 0) has no active links!",
    ]);
  });
  //
  // Add more test cases as needed
});
