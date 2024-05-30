import { cardinalDirections, diagonalDirections, graphSize } from "../graph.js";
import { error, range } from "../util.js";
import { spread } from "../coords.js";
import { rng } from "../rng.js";

export const isRuleApplicableForGraph = (rule, graph) => {
  const [w, h] = graphSize(graph);

  for (const x of range(w)) {
    for (const y of range(h)) {
      if (rule.isApplicableAt(graph, { x, y })) return true;
    }
  }

  return false;
};

export const getCandidateCellForRule = (rule, graph) => {
  const [w, h] = graphSize(graph);
  const candidates = [];

  for (const x of range(w)) {
    for (const y of range(h)) {
      if (rule.isApplicableAt(graph, { x, y })) candidates.push(vec(x, y));
    }
  }

  return rng.fromArr(candidates);
};

export const tryFindAllApplicableCoordVariantsRecursively = (
  ir,
  graph,
  ...args
) => {
  const index = args.length;
  const [w, h] = graphSize(graph);

  const result = [];
  let xFrom = 0,
    xTo = w - 1;
  let yFrom = 0,
    yTo = h - 1;

  if (ir.searchNearPrevIndex < ir.applicabilityFuncs)
    error(`Rule ${ir.name} has wrong searchNearPrevIndex count`);

  if (ir.searchNearPrevIndex[index] != -1) {
    const [searchNearX, searchNearY] = spread(
      args[ir.searchNearPrevIndex[index]],
    );
    (xFrom = Math.max(searchNearX - 1, 0)), (yFrom = Math.max(searchNearY - 1));
    (xTo = Math.min(searchNearX + 1, w - 1)),
      (yTo = Math.max(searchNearY + 1, h - 1));
  }

  for (const x of range(xFrom, xTo)) {
    for (const y of range(yFrom, yTo)) {
      if (graph.nodes[x][y].finalized) continue;
      if (args.find((a) => a.x == x && a.y == y)) continue;

      if (ir.applicabilityFuncs[index](graph, { x, y }, ...args)) {
        if (index < ir.applicabilityFuncs.length - 1) {
          const res = tryFindAllApplicableCoordVariantsRecursively(
            ir,
            graph,
            ...[...args, vec(x, y)],
          );
          if (res.length > 0) result.push(res);
        } else {
          result.push(...args, { x, y });
        }
      }
    }
  }

  return result;
};

export const getRandomApplicableCoordsForRule = (rule, graph) => {
  const [w, h] = graphSize(graph);
  const candidates = [];

  for (const x of range(w)) {
    for (const y of range(h)) {
      if (rule.isApplicableAt(graph, { x, y })) candidates.push({ x, y });
    }
  }

  return rng.fromArr(candidates);
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
  const [w, h] = graphSize(g);

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
