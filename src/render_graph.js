import { fmt } from "./coords.js";
import { graphSize, nodeHasTag, tags, testSanity } from "./graph.js";
import { range } from "./util.js";

import color from "@nuff-said/color";
import { stripAnsi } from "unbug/src/util.js";
import { rng } from "./rng.js";

export const drawGraph = ({ graph, appliedRules }) => {
  console.clear();
  console.log(rng.seed);
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

      let item = {
        node,
        x,
        y,
        text: "",
      };

      const start = nodeHasTag(node, tags.Start);
      const goal = nodeHasTag(node, tags.Goal);

      const tagsToCheck = [
        tags.Start,
        tags.Goal,
        tags.Key,
        tags.HalfKey,
        tags.MasterKey,
        tags.Boss,
        tags.Hazard,
        tags.Treasure,
        tags.Trap,
        tags.Teleport,
      ];

      if (start || goal) (item.bg = color.redBg), (item.fg = color.black);
      else if (node.active) (item.bg = color.blueBg), (item.fg = color.black);
      else if (node.finalized) item.bg = color.yellowBg;
      else item.bg = color.blackBg;

      const t = [];
      for (const tag of tagsToCheck) {
        if (nodeHasTag(node, tag)) t.push(tag);
      }
      item.text = t.join(", ");

      item.text = item.text.padEnd(9 * 5, " ");

      cells.push(item);
    }

    console.log();
    const write = (edges) => {
      let text = cells
        .map((x, i) => {
          let text = x.text.slice(0, 9);
          cells[i].text = x.text.slice(9);

          let addEdgeMarker = false;
          let edgeMarker = " → ";

          // TODO: color locks
          if (edges) {
            const edge = cells[i].node.edges[0];
            if (edge.enabled) {
              addEdgeMarker = true;
              if (edge.reversed) {
                if (nodeHasTag(edge, tags.LockedEdge)) edgeMarker = " ↤ ";
                else if (nodeHasTag(edge, tags.MasterLockedEdge))
                  edgeMarker = " ⬅ ";
                else if (nodeHasTag(edge, tags.SecretEdge)) edgeMarker = " ⇐ ";
                else if (nodeHasTag(edge, tags.WindowEdge)) edgeMarker = " ⇠ ";
                else edgeMarker = " ← ";
              } else {
                if (nodeHasTag(edge, tags.LockedEdge)) edgeMarker = " ↦ ";
                else if (nodeHasTag(edge, tags.MasterLockedEdge))
                  edgeMarker = " ➡ ";
                else if (nodeHasTag(edge, tags.SecretEdge)) edgeMarker = " ⇒ ";
                else if (nodeHasTag(edge, tags.WindowEdge)) edgeMarker = " ⇢ ";
              }
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
          (edge.reversed
            ? nodeHasTag(edge, tags.SecretEdge)
              ? "⇑"
              : nodeHasTag(edge, tags.LockedEdge)
                ? "↥"
                : nodeHasTag(edge, tags.MasterLockedEdge)
                  ? "⬆"
                  : nodeHasTag(edge, tags.WindowEdge)
                    ? "⇡"
                    : "↑"
            : nodeHasTag(edge, tags.SecretEdge)
              ? "⇓"
              : nodeHasTag(edge, tags.LockedEdge)
                ? "↧"
                : nodeHasTag(edge, tags.MasterLockedEdge)
                  ? "⬇"
                  : nodeHasTag(edge, tags.WindowEdge)
                    ? "⇣"
                    : "↓") +
          toPrint.slice(i * 12 + 4);
      }
    }
    process.stdout.write("\n" + toPrint);
  }

  console.log();
  for (const rule of appliedRules) {
    const mandatoryText = rule.mandatoryFeature
      ? color.blue(` ${rule.mandatoryFeature}`)
      : "";

    const optionalText = rule.optionalFeature
      ? color.blue(` (+${rule.optionalFeature})`)
      : "";

    console.log(
      `> ${color.bold(rule.name.padEnd(20, " "))} ${color.dim(Array.isArray(rule.coords) ? rule.coords.slice(0, rule.metadata.changesCoords).map(fmt).join(", ") : fmt(rule.coords))}${mandatoryText}${optionalText}`,
    );
  }
};
