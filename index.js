import { GraphReplacementApplier } from "./src/graph-replacement.js";
import { drawGraph } from "./src/render_graph.js";
import keypress from "keypress";

const GRA = new GraphReplacementApplier(10, 5);
drawGraph(GRA);

// make `process.stdin` begin emitting "keypress" events
keypress(process.stdin);

// listen for the "keypress" event
process.stdin.on("keypress", function (_, key) {
  if (key) {
    if (key.ctrl && key.name == "c") {
      process.stdin.pause();
    } else {
      let done = false;

      if (key.name == "return") {
        while (!GRA.filledEnough() || !done) {
          done = GRA.applyRandomReplacementRule();

          drawGraph(GRA);
        }
      } else {
        done = GRA.applyRandomReplacementRule();

        drawGraph(GRA);
      }
    }
  }
});

process.stdin.setRawMode(true);
process.stdin.resume();
