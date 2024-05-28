import { add, adjacent, is, manhattan, vec } from "../coords.js";
import {
  coordsInGraphBounds,
  drawBiconnectedDirectionalRect,
  graphAddEdgeTagByCoords,
  graphAddNodeTag,
  graphAddNodeTagPreserveLastId,
  graphNodeHasTag,
  graphSize,
  tags,
} from "../graph.js";
import { rng } from "../rng.js";
import {
  areCoordsOnRect,
  getRandomGraphCoordsByFunc,
  pushNodeContensInRandomDirection,
  pushNodeContensInRandomDirectionWithEdgeTag,
  randomHazard,
} from "../util.js";

export default [
  {
    name: "non-adjacent cycle",
    addsCycle: true,
    isApplicableAt: (g, c) => coordsInGraphBounds(g, add(c, 2)),
    applyOnGraphAt: (g, { x, y }) => {
      const [w, h] = graphSize(g);
      const rw = rng.randInRange(3, w - x),
        rh = rng.randInRange(3, h - y);

      const start = getRandomGraphCoordsByFunc(g, (c) =>
        areCoordsOnRect(c, { x, y }, vec(rw, rh)),
      );
      const goal = getRandomGraphCoordsByFunc(
        g,
        (c) =>
          areCoordsOnRect(c, { x, y }, vec(rw, rh)) &&
          !areCoordsOnRect(c, vec(0), vec(w, h)) &&
          !is(start, c) &&
          manhattan(start, c) >= Math.min(rw, rh),
      );
      drawBiconnectedDirectionalRect(g, { x, y }, vec(rw, rh), start, goal);
      graphAddNodeTag(g, start, tags.Start);
      graphAddNodeTag(g, goal, tags.Goal);
    },
    mandatoryFeatures: [
      {
        name: "alt paths with hazards",
        applyFeature: (g) => {
          const goal = getRandomGraphCoordsByFunc(g, (c) =>
            graphNodeHasTag(g, c, tags.Goal),
          );
          const c1 = getRandomGraphCoordsByFunc(
            g,
            ({ x, y }) => g.nodes[x][y].active && adjacent(goal, { x, y }),
          );
          const c2 = getRandomGraphCoordsByFunc(
            g,
            ({ x, y }) =>
              g.nodes[x][y].active &&
              adjacent(goal, { x, y }) &&
              !is({ x, y }, c1),
          );

          graphAddNodeTag(g, c1, randomHazard());
          graphAddNodeTag(g, c2, randomHazard());

          if (rng.randInRange(0, 3) == 0)
            pushNodeContensInRandomDirection(g, goal);
        },
      },
      {
        name: "two keys",
        applyFeature: (g) => {
          const start = getRandomGraphCoordsByFunc(g, (c) =>
            graphNodeHasTag(g, c, tags.Start),
          );
          const goal = getRandomGraphCoordsByFunc(g, (c) =>
            graphNodeHasTag(g, c, tags.Goal),
          );
          const c1 = getRandomGraphCoordsByFunc(
            g,
            ({ x, y }) =>
              g.nodes[x][y].active &&
              (adjacent(start, { x, y }) || adjacent(goal, { x, y })),
          );
          const c2 = getRandomGraphCoordsByFunc(
            g,
            ({ x, y }) =>
              g.nodes[x][y].active &&
              !is({ x, y }, c1) &&
              !adjacent(c1, { x, y }) &&
              (adjacent(start, { x, y }) || adjacent(goal, { x, y })),
          );
          graphAddNodeTag(g, c1, tags.HalfKey);
          graphAddNodeTagPreserveLastId(g, c2, tags.HalfKey);
          pushNodeContensInRandomDirectionWithEdgeTag(
            g,
            goal,
            tags.BilockedEdge,
          );
        },
      },
    ],
  },
  {
    name: "adjacent cycle",
    addsCycle: true,
    isApplicableAt: (g, c) => coordsInGraphBounds(g, add(c, 2)),
    applyOnGraphAt: (g, { x, y }) => {
      const [w, h] = graphSize(g);
      const rw = rng.randInRange(3, w - x),
        rh = rng.randInRange(3, h - y);

      const start = getRandomGraphCoordsByFunc(g, (c) =>
        areCoordsOnRect(c, { x, y }, vec(rw, rh)),
      );

      const goal = getRandomGraphCoordsByFunc(
        g,
        (c) => areCoordsOnRect(c, { x, y }, vec(rw, rh)) && adjacent(start, c),
      );

      drawBiconnectedDirectionalRect(g, { x, y }, vec(rw, rh), start, goal);
      graphAddNodeTag(g, start, tags.Start);
      graphAddNodeTag(g, goal, tags.Goal);
    },
    mandatoryFeatures: [
      {
        name: "foresee",
        applyFeature: (g) => {
          const start = getRandomGraphCoordsByFunc(g, (c) =>
            graphNodeHasTag(g, c, tags.Start),
          );
          const goal = getRandomGraphCoordsByFunc(g, (c) =>
            graphNodeHasTag(g, c, tags.Goal),
          );
          graphAddEdgeTagByCoords(g, start, goal, tags.WindowEdge);
        },
      },
      {
        name: "openable shortcut",
        applyFeature: (g) => {
          const start = getRandomGraphCoordsByFunc(g, (c) =>
            graphNodeHasTag(g, c, tags.Start),
          );
          const goal = getRandomGraphCoordsByFunc(g, (c) =>
            graphNodeHasTag(g, c, tags.Goal),
          );
          const c1 = getRandomGraphCoordsByFunc(
            g,
            (c) =>
              g.nodes[c.x][c.y].active && !is(start, c) && !adjacent(start, c),
          );
          graphAddNodeTag(g, c1, tags.Key);
          graphAddEdgeTagByCoords(g, start, goal, tags.LockedEdge);
        },
      },
    ],
  },
];
