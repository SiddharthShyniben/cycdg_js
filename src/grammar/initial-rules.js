import unbug from "unbug";

import {
  areCoordsInRectCorner,
  areCoordsOnRect,
  getRandomGraphCoordsByFunc,
  pushNodeContensInRandomDirection,
  pushNodeContensInRandomDirectionWithEdgeTag,
  randomHazard,
} from "../util.js";
import { add, adjacent, fmt, is, manhattan, vec } from "../coords.js";
import { tags } from "../consts.js";

const debug = unbug("initial-rules");
const feat = debug.extend("feature");

export default [
  {
    name: "non-adjacent cycle",
    addsCycle: true,
    isApplicableAt: (g, c) => g.inBounds(add(c, 3)),
    applyOnGraphAt: (g, coords) => {
      debug(`applying non-adjacent cycle at ${fmt(coords)}`);

      const [w, h] = g.size();
      const rw = g.rng.randInRange(3, w - coords.x),
        rh = g.rng.randInRange(3, h - coords.y);

      debug(`drawing rect of size ${fmt(rw, rh)}`);

      const start = getRandomGraphCoordsByFunc(g, (c) =>
        areCoordsOnRect(c, coords, vec(rw, rh)),
      );
      const goal = getRandomGraphCoordsByFunc(
        g,
        (c) =>
          areCoordsOnRect(c, coords, vec(rw, rh)) &&
          !areCoordsInRectCorner(c, vec(0), vec(w, h)) &&
          !is(start, c) &&
          manhattan(start, c) >= Math.min(rw, rh),
      );

      debug(`start: ${fmt(start)}`);
      debug(`goal: ${fmt(goal)}`);

      g.drawBiconnectedDirectionalRect(coords, vec(rw, rh), start, goal)
        .addNodeTag(start, tags.Start)
        .addNodeTag(goal, tags.Goal);
    },
    mandatoryFeatures: [
      {
        name: "alt paths with hazards",
        applyFeature: (g) => {
          feat("applying alt paths with hazards");

          const goal = getRandomGraphCoordsByFunc(g, (c) =>
            g.hasTag(c, tags.Goal),
          );
          feat(`goal: ${fmt(goal)}`);

          const c1 = getRandomGraphCoordsByFunc(
            g,
            (c) => g.active(c) && adjacent(goal, c),
          );
          const c2 = getRandomGraphCoordsByFunc(
            g,
            (c) => g.active(c) && adjacent(goal, c) && !is(c, c1),
          );

          feat(`adding random hazard to ${fmt(c1)} and ${fmt(c2)}`);

          g.addNodeTag(c1, randomHazard(g)).addNodeTag(c2, randomHazard(g));

          if (g.rng.randInRange(0, 3) == 0) {
            feat("pushing goal in random direction");
            pushNodeContensInRandomDirection(g, goal);
          }
        },
      },
      {
        name: "two keys",
        applyFeature: (g) => {
          feat("applying two keys");
          const start = getRandomGraphCoordsByFunc(g, (c) =>
            g.hasTag(c, tags.Start),
          );
          const goal = getRandomGraphCoordsByFunc(g, (c) =>
            g.hasTag(c, tags.Goal),
          );
          feat(`start: ${fmt(start)}`);
          feat(`goal: ${fmt(goal)}`);
          const c1 = getRandomGraphCoordsByFunc(
            g,
            (c) => g.active(c) && (adjacent(start, c) || adjacent(goal, c)),
          );
          const c2 = getRandomGraphCoordsByFunc(
            g,
            (c) =>
              g.active(c) &&
              !is(c, c1) &&
              !adjacent(c1, c) &&
              (adjacent(start, c) || adjacent(goal, c)),
          );

          feat(`key 1: ${fmt(c1)}`);
          feat(`key 2: ${fmt(c2)}`);

          g.addNodeTag(c1, tags.HalfKey).addNodeTagPreserveId(c2, tags.HalfKey);

          feat("pushing goal in random direction with BilockedEdge tag");
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
    isApplicableAt: (g, c) => g.inBounds(add(c, 3)),
    applyOnGraphAt: (g, coords) => {
      debug("applying adjacent cycle");
      const [w, h] = g.size();
      const rw = g.rng.randInRange(3, w - coords.x),
        rh = g.rng.randInRange(3, h - coords.y);

      debug(`drawing rect of size ${fmt(rw, rh)}`);

      const start = getRandomGraphCoordsByFunc(g, (c) =>
        areCoordsOnRect(c, coords, vec(rw, rh)),
      );

      debug(`start: ${fmt(start)}`);

      const goal = getRandomGraphCoordsByFunc(
        g,
        (c) => areCoordsOnRect(c, coords, vec(rw, rh)) && adjacent(start, c),
      );

      debug(`goal: ${fmt(goal)}`);

      g.drawBiconnectedDirectionalRect(coords, vec(rw, rh), start, goal);
      g.addNodeTag(start, tags.Start);
      g.addNodeTag(goal, tags.Goal);
    },
    mandatoryFeatures: [
      {
        name: "foresee",
        applyFeature: (g) => {
          feat("applying foresee");
          const start = getRandomGraphCoordsByFunc(g, (c) =>
            g.hasTag(c, tags.Start),
          );
          const goal = getRandomGraphCoordsByFunc(g, (c) =>
            g.hasTag(c, tags.Goal),
          );

          feat(`start: ${fmt(start)}`);
          feat(`goal: ${fmt(goal)}`);

          g.addEdgeTag(start, goal, tags.WindowEdge);
        },
      },
      {
        name: "openable shortcut",
        applyFeature: (g) => {
          feat("applying openable shortcut");
          const start = getRandomGraphCoordsByFunc(g, (c) =>
            g.hasTag(c, tags.Start),
          );
          const goal = getRandomGraphCoordsByFunc(g, (c) =>
            g.hasTag(c, tags.Goal),
          );

          feat(`start: ${fmt(start)}`);
          feat(`goal: ${fmt(goal)}`);

          const c1 = getRandomGraphCoordsByFunc(
            g,
            (c) => g.active(c) && !is(start, c) && !adjacent(start, c),
          );

          feat(`key: ${fmt(c1)}`);

          g.addNodeTag(c1, tags.Key).addEdgeTag(start, goal, tags.LockedEdge);
        },
      },
    ],
  },
];
