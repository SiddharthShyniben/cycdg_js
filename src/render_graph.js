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

    cells = cells.map((c) =>
      c.active
        ? c.start
          ? {
              text: "Start".padEnd(9 * 5, " "),
              bg: color.redBg,
              fg: color.black,
            }
          : c.goal
            ? {
                text: "Goal".padEnd(9 * 5, " "),
                bg: color.redBg,
                fg: color.black,
              }
            : { text: " ".repeat(9 * 5), bg: color.blueBg }
        : { text: " ".repeat(9 * 5), bg: color.blackBg },
    );

    const write = () =>
      process.stdout.write(
        cells
          .map((x, i) => {
            let text = x.text.slice(0, 9);
            cells[i].text = x.text.slice(9);
            if (x.bg) text = x.bg(text);
            if (x.fg) text = x.fg(text);
            return text;
          })
          .join("   "),
      );
    write();
    process.stdout.write("\n");
    write();
    process.stdout.write("\n");
    write();
    process.stdout.write("\n");
    write();
    process.stdout.write("\n");
    write();
    process.stdout.write("\n");
    process.stdout.write("\n");
  }

  for (const rule of appliedRules) {
    console.log(
      `> ${color.bold(rule.name)} ${color.dim(fmt(rule.coords))}${rule.mandatoryFeature ? color.blue(` +${rule.mandatoryFeature}`) : ""}`,
    );
  }
};
