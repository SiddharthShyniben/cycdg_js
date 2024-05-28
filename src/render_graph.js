import { fmt } from "./coords.js";
import { graphSize, tags } from "./graph.js";
import { range } from "./util.js";
import color from "@nuff-said/color";

export const drawGraph = ({ graph, appliedRules }) => {
  const [w, h] = graphSize(graph);

  for (const x of range(w)) {
    let cells = [];

    for (const y of range(h)) {
      const node = graph.nodes[x][y];
      if (node.active) {
        if (node.tags.find((t) => t.tag == tags.Start))
          cells.push({ active: true, start: true });
        else if (node.tags.find((t) => t.tag == tags.Goal))
          cells.push({ active: true, goal: true });
        else cells.push({ active: true });
      } else {
        cells.push({});
      }
    }

    process.stdout.write(cells.map((x) => x.repeat(9)).join("   "));
    process.stdout.write("\n");
    process.stdout.write(cells.map((x) => x.repeat(9)).join("   "));
    process.stdout.write("\n");
    process.stdout.write(cells.map((x) => x.repeat(9)).join("   "));
    process.stdout.write("\n");
    process.stdout.write(cells.map((x) => x.repeat(9)).join("   "));
    process.stdout.write("\n");
    process.stdout.write(cells.map((x) => x.repeat(9)).join("   "));
    process.stdout.write("\n");
    process.stdout.write("\n");
  }

  for (const rule of appliedRules) {
    console.log(
      `> ${color.bold(rule.name)} ${color.dim(fmt(rule.coords))}${rule.mandatoryFeature ? color.blue(` +${rule.mandatoryFeature}`) : ""}`,
    );
  }
};
