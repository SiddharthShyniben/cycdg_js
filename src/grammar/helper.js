import { graphSize } from "../graph.js";
import { error, range } from "../util.js";
import { spread } from "../coords.js";

export const isRuleApplicableForGraph = (rule, graph) => {
  const [w, h] = graphSize(graph);

  for (const x of range(w)) {
    for (const y of range(h)) {
      if (rule.isApplicableAt(graph, x, y)) return true;
    }
  }

  return false;
};

export const getCandidateCellForRule = (rule, graph) => {
  const [w, h] = graphSize(graph);
  const candidates = [];

  for (const x of range(w)) {
    for (const y of range(h)) {
      if (rule.isApplicableAt(graph, x, y)) candidates.push(vec(x, y));
    }
  }

  return candidates[~~(Math.random() * rule.rng.next())];
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

      if (ir.applicabilityFuncs[index](graph, x, y, ...args)) {
        if (index < ir.applicabilityFuncs.length - 1) {
          const res = tryFindAllApplicableCoordVariantsRecursively(
            ir,
            graph,
            ...[...args, vec(x, y)],
          );
          if (res.length > 0) result.push(res);
        } else {
          result.push(...args, vec(x, y));
        }
      }
    }
  }

  return result;
};