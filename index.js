import { GraphReplacementApplier } from "./src/graph-replacement.js";
import { drawGraph } from "./src/render_graph.js";
import keypress from "keypress";
import parseArgs from "minimist";

const args = parseArgs(process.argv.slice(2));

const GRA = new GraphReplacementApplier(args.width, args.height, {
  desiredFeatures: args.features,
  ...args,
});

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
        while (!(GRA.shouldStop() || done)) {
          done = GRA.applyRandomReplacementRule();
          drawGraph(GRA);
        }
        if (GRA.shouldStop()) GRA.reset();
      } else if (key.name == "d") {
        console.log(GRA.graph.nodes);
      } else {
        done = GRA.applyRandomReplacementRule();
        drawGraph(GRA);
        if (GRA.shouldStop()) GRA.reset();
      }
    }
  }
});

process.stdin.setRawMode(true);
process.stdin.resume();
