// TODO: Add cogmind style (tunneling) tiler?

import { tiles } from "./consts.js";
import { arr2d, getTileTypeForEdge, range } from "./util.js";
import { vec } from "./coords.js";

// Dungeon-style tiler
export class Tiler {
  constructor(g, nodeSize) {
    this.graph = g;
    this.nodeSize = nodeSize;
  }

  getTileMap() {
    this.setInitialTileMap();
    // this.doCellularAutomatae();

    return this.tiledMap;
  }

  setInitialTileMap() {
    const [w, h] = this.graph.size();

    this.tiledMap = arr2d(2 * w * this.nodeSize, 2 * h * this.nodeSize).map(
      (r) =>
        r.map(() => ({
          tileType: tiles.Unset,
        })),
    );

    for (const x of range(w)) {
      for (const y of range(h)) {
        if (this.graph.active({ x, y })) {
          this.fillSquare(
            2 * x,
            2 * y,
            this.graph.hasTags({ x, y }) ? tiles.RoomFloor : tiles.CaveFloor,
          );
        }
      }
    }

    for (const x of range(w)) {
      for (const y of range(h)) {
        const c = { x, y };
        if (!this.graph.active(c)) continue;

        if (x < w - 1 && this.graph.active(vec(x + 1, y))) {
          this.fillSquare(
            x * 2 + 1,
            y * 2,
            getTileTypeForEdge(this.graph.edge(c, vec(x + 1, y))),
          );
        }

        if (y < h - 1 && this.graph.active(vec(x, y + 1))) {
          this.fillSquare(
            x * 2,
            y * 2 + 1,
            getTileTypeForEdge(this.graph.edge(c, vec(x, y + 1))),
          );
        }
      }
    }
  }

  doCellularAutomatae() {
    this.resetCellularAutomataNextState();
  }

  resetCellularAutomataNextState() {
    // this.execFunctionAtEachTile((x, y) => {
    //   this.tiledMap[x][y].nextTileType = this.tiledMap[x][y].tileType;
    // });
  }

  fillSquare(x, y, type) {
    const startX = this.nodeSize * x,
      startY = this.nodeSize * y;
    for (const x of range(this.nodeSize)) {
      for (const y of range(this.nodeSize)) {
        this.tiledMap[startX + x][startY + y].tileType = type;
      }
    }
  }
}
