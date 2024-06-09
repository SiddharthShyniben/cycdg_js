import { cardinalDirections, diagonalDirections } from "../graph.js";
import { error, range } from "../util.js";
import { fmt, is, spread, vec } from "../coords.js";
import unbug from "unbug";

const debug = unbug("helper");

export const isRuleApplicableForGraph = (rule, graph) => {
  const [w, h] = graph.size();

  for (const x of range(w)) {
    for (const y of range(h)) {
      if (rule.isApplicableAt(graph, { x, y })) return true;
    }
  }

  return false;
};

export const getCandidateCellForRule = (rule, graph) => {
  const [w, h] = graph.size();
  const candidates = [];

  for (const x of range(w)) {
    for (const y of range(h)) {
      if (rule.isApplicableAt(graph, { x, y })) candidates.push(vec(x, y));
    }
  }

  return graph.rng.fromArr(candidates);
};

export const tryFindAllApplicableCoordVariantsRecursively = (
  ir,
  graph,
  ...args
) => {
  const prefix = "   ".repeat(args.length);
  debug(
    prefix +
      `try find all applicable coordinate variants recursively for ${ir.name}`,
    args,
  );
  const index = args.length;
  const [w, h] = graph.size();

  debug(prefix + `graph size: ${fmt(vec(w, h))}`);

  const result = [];
  let xFrom = 0,
    xTo = w - 1;
  let yFrom = 0,
    yTo = h - 1;

  if (ir.searchNearPrevIndex.length !== ir.applicabilityFuncs.length)
    error(`Rule ${ir.name} has wrong searchNearPrevIndex count`);

  if (ir.searchNearPrevIndex[index] != -1) {
    debug(prefix + "found search near prev index");
    const [searchNearX, searchNearY] = spread(
      args[ir.searchNearPrevIndex[index]],
    );
    debug(prefix + `search near ${fmt(searchNearX, searchNearY)}`);

    xFrom = Math.max(searchNearX - 1, 0);
    yFrom = Math.max(searchNearY - 1, 0);

    xTo = Math.min(searchNearX + 1, w - 1);
    yTo = Math.min(searchNearY + 1, h - 1);
  }

  debug(
    prefix +
      `Searching from ${fmt(vec(xFrom, yFrom))} to ${fmt(vec(xTo, yTo))}`,
  );

  for (const x of range(xFrom, xTo + 1)) {
    for (const y of range(yFrom, yTo + 1)) {
      if (!ir.worksWithFinalizedNodes) {
        if (graph.nodes[x][y].finalized) continue;
      }

      if (args.find((a) => is(a, { x, y }))) continue;

      debug(prefix, { x, y }, args);
      if (ir.applicabilityFuncs[index](graph, { x, y }, ...args)) {
        debug(prefix + `match! ${fmt({ x, y })}, ${args}`);
        if (index < ir.applicabilityFuncs.length - 1) {
          const res = tryFindAllApplicableCoordVariantsRecursively(
            ir,
            graph,
            ...[...args, { x, y }],
          );
          if (res.length > 0)
            result.push(...(Array.isArray(res[0]) ? res : [res]));
        } else {
          result.push(...args, { x, y });
        }
      }
    }
  }

  return result;
};

export const getRandomApplicableCoordsForRule = (rule, graph) => {
  const [w, h] = graph.size();
  const candidates = [];

  for (const x of range(w)) {
    for (const y of range(h)) {
      if (rule.isApplicableAt(graph, { x, y })) candidates.push({ x, y });
    }
  }

  return graph.rng.fromArr(candidates);
};

export const graphHasNoFinalizedNodesNear = (g, { x, y }) => {
  for (const dir of [...cardinalDirections, ...diagonalDirections]) {
    const node = g.nodes?.[x + dir.x]?.[y + dir.y];
    if (node && node.finalized) return false;
  }

  return true;
};

export const countEmptyEditableNodesNearEnabledOnes = (g) => {
  let count = 0;
  const [w, h] = g.size();

  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      const node = g.nodes[x][y];
      if (node && !node.active && !node.finalized) {
        for (const dir of cardinalDirections) {
          const neighbour = g.nodes[x + dir.x]?.[y + dir.y];
          if (neighbour && neighbour.active) {
            count++;
            break;
          }
        }
      }
    }
  }

  return count;
};
