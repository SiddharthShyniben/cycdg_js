import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { vec } from "../src/coords.js";
import {
  areGraphCoordsInterlinked,
  checkNearCoords,
  coordsInGraphBorder,
  coordsInGraphBounds,
  coordsInGraphCorner,
  countGraphDirEdges,
  edge,
  edgeHasLinkToVector,
  getEdgeByVector,
  graph,
  graphCountEdgesAt,
  graphGetEdgeBetweenCoords,
  graphGetEdgeByVector,
  graphSetLinkByVector,
  graphSize,
  isGraphEdgeByVectorActive,
  isGraphEdgeDirectedBetweenCoords,
  node,
  resetEdge,
  resetNode,
  setEdgeLinkByVector,
  swapTags,
  tag,
} from "../src/graph.js";

describe("tag", () => {
  it("should create a tag", () => {
    assert.deepEqual(tag("foo", "lol"), { tag: "foo", id: "lol" });
  });
});

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

    assert.strictEqual(myEdge.active, false);
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
    assert.strictEqual(myNode.edges[0].active, false);
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
        [{}, { active: true }, {}],
        [{}, { active: false }, {}],
        [{}, { active: true }, {}],
      ],
    };

    const result = checkNearCoords(myGraph, vec(1), (node) => node.active);
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

  it("should check if there is a directed edge between coordinates", () => {
    const myGraph = graph(2, 3);

    assert.strictEqual(
      isGraphEdgeDirectedBetweenCoords(myGraph, vec(0), vec(0, 1)),
      false,
    );

    myGraph.nodes[0][0].edges[1].enabled = true;

    assert(isGraphEdgeDirectedBetweenCoords(myGraph, vec(0), vec(0, 1)));

    myGraph.nodes[0][0].edges[1].reversed = true;

    assert.strictEqual(
      isGraphEdgeDirectedBetweenCoords(myGraph, vec(0), vec(0, 1)),
      false,
    );

    assert(isGraphEdgeDirectedBetweenCoords(myGraph, vec(0, 1), vec(0)));
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
});
