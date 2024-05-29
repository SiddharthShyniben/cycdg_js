import unbug from "unbug";
import { fmt } from "./coords.js";
import { graphSize, tags, testSanity } from "./graph.js";
import { range } from "./util.js";

import color from "@nuff-said/color";
import { stripAnsi } from "unbug/src/util.js";

const debug = unbug("render");

export const drawGraph = ({ graph, appliedRules }) => {
  debug(graph);
  const sanity = testSanity(graph);
  if (!sanity.sane) {
    console.log();
    console.log(
      color.red(
        `Graph is not sane! ${
          sanity.problems.length > 0
            ? `Problems: ${sanity.problems.join(", ")}`
            : ""
        }`,
      ),
    );
    console.log();
  }
  const [w, h] = graphSize(graph);

  for (const y of range(h)) {
    let cells = [];

    for (const x of range(w)) {
      const node = graph.nodes[x][y];
      if (node.active) {
        if (node.tags.find((t) => t.tag == tags.Start))
          cells.push({ node, active: true, start: true, x, y });
        else if (node.tags.find((t) => t.tag == tags.Goal))
          cells.push({ node, active: true, goal: true, x, y });
        else cells.push({ node, active: true, x, y });
      } else {
        cells.push({ node, x, y });
      }
    }

    cells = cells.map((c) =>
      c.active
        ? c.start
          ? {
              ...c,
              text: "Start".padEnd(9 * 5, " "),
              bg: color.redBg,
              fg: color.black,
            }
          : c.goal
            ? {
                ...c,
                text: "Goal".padEnd(9 * 5, " "),
                bg: color.redBg,
                fg: color.black,
              }
            : { ...c, text: " ".repeat(9 * 5), bg: color.blueBg }
        : { ...c, text: " ".repeat(9 * 5), bg: color.blackBg },
    );

    console.log();
    const write = (edges) => {
      let text = cells
        .map((x, i) => {
          let text = x.text.slice(0, 9);
          cells[i].text = x.text.slice(9);

          let addEdgeMarker = false;
          let edgeMarker = " → ";

          if (edges) {
            const edge = cells[i].node.edges[0];
            if (edge.enabled) {
              addEdgeMarker = true;
              if (edge.reversed) edgeMarker = " ← ";
            }
          }

          if (x.bg) text = x.bg(text);
          if (x.fg) text = x.fg(text);
          if (addEdgeMarker) text += edgeMarker;
          const len = stripAnsi(text).length;
          if (len < 12) text = text + " ".repeat(12 - len);
          return text;
        })
        .join("");

      process.stdout.write(text);
    };

    write();
    process.stdout.write("\n");
    write();
    process.stdout.write("\n");
    write(true);
    process.stdout.write("\n");
    write();
    process.stdout.write("\n");
    write();

    let toPrint = " ".repeat(12 * cells.length);

    // Vertical edges
    for (let i = 0; i < cells.length; i++) {
      const edge = cells[i].node.edges[1];
      if (edge.enabled) {
        toPrint =
          toPrint.slice(0, i * 12 + 4) +
          (edge.reversed ? "↑" : "↓") +
          toPrint.slice(i * 12 + 4);
      }
    }
    process.stdout.write("\n" + toPrint);
  }

  console.log();
  for (const rule of appliedRules) {
    console.log(
      `> ${color.bold(rule.name)} ${color.dim(fmt(rule.coords))}${rule.mandatoryFeature ? color.blue(` +${rule.mandatoryFeature}`) : ""}`,
    );
  }
};
