// TODO: Add cogmind style (tunneling) tiler?

import { tiles } from "./consts.js";
import { arr2d, getTileTypeForEdge, range } from "./util.js";
import { add, vec } from "./coords.js";

// Dungeon-style tiler
export class Tiler {
  constructor(g, nodeSize) {
    this.graph = g;
    this.nodeSize = nodeSize;
  }

  getTileMap() {
    this.setInitialTileMap();
    this.doCellularAutomatae();

    return this.tiledMap;
  }

  setInitialTileMap() {
    const [w, h] = this.graph.size();

    this.tiledMap = arr2d(2 * w * this.nodeSize, 2 * h * this.nodeSize).map(
      (r) =>
        r.map(() => ({
          tileType: tiles.Unset,
          nextTileType: tiles.Unset,
        })),
    );

    for (const x of range(w)) {
      for (const y of range(h)) {
        if (this.graph.active({ x, y })) {
          this.fillSquare(
            vec(2 * x, 2 * y),
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
            vec(x * 2 + 1, y * 2),
            getTileTypeForEdge(this.graph.edge(c, vec(x + 1, y))),
          );
        }

        if (y < h - 1 && this.graph.active(vec(x, y + 1))) {
          this.fillSquare(
            vec(x * 2, y * 2 + 1),
            getTileTypeForEdge(this.graph.edge(c, vec(x, y + 1))),
          );
        }
      }
    }
  }

  doCellularAutomatae() {
    this.resetCellularAutomataNextState();

    this.doorStep(tiles.Door);
    this.doorStep(tiles.SecretDoor);
    this.doorStep(tiles.LockedDoor);

    this.executeFunctionAsCAStep(this.graph.rng.randInRange(3), (c) => {
      const floors4 = this.countTileTypesInPlusAround(
        c,
        false,
        tiles.RoomFloor,
      );
      const unsets = this.countTileTypesInPlusAround(c, false, tiles.Unset);
      if (
        this.tiledMap[c.x][c.y].tileType === tiles.Unset &&
        floors4 + unsets == 4
      ) {
        if (floors4 !== 2 && unsets !== 4) {
          this.tiledMap[c.x][c.y].nextTileType = tiles.RoomFloor;
        }
      }
    });
  }

  resetCellularAutomataNextState() {
    this.execFunctionAtEachTile(({ x, y }) => {
      this.tiledMap[x][y].nextTileType = this.tiledMap[x][y].tileType;
    });
  }

  doorStep(type) {
    this.repeatedlyExecuteFunctionAsCAStep((c) => {
      const roomFloors = this.countTileTypesInPlusAround(
        c,
        false,
        tiles.RoomFloor,
      );
      const caveFloors = this.countTileTypesInPlusAround(
        c,
        false,
        tiles.CaveFloor,
      );
      if (this.tiledMap[c.x][c.y].tileType === type) {
        if (roomFloors === 1 && caveFloors === 0) {
          this.tiledMap[c.x][c.y].nextTileType = tiles.RoomFloor;
        } else if (roomFloors === 0 && caveFloors === 1) {
          this.tiledMap[c.x][c.y].nextTileType = tiles.CaveFloor;
        }
      }
    });

    this.repeatedlyExecuteFunctionAsCAStep((c) => {
      if (
        this.tiledMap[c.x][c.y].tileType == type &&
        this.countTileTypesInPlusAround(c, false, type) == 1
      ) {
        this.tiledMap[c.x][c.y].nextTileType = tiles.Wall;
      }
    });

    this.executeFunctionAsCAStep(2, (c) => {
      if (
        this.tiledMap[c.x][c.y].tileType === type &&
        this.graph.rng.chance(25)
      ) {
        this.randomlySwapTileWithNeighbour(c, tiles.Wall);
      }
    });
  }

  randomlySwapTileWithNeighbour(c, tile) {
    const allowed = [];
    for (const i of range(-1, 1)) {
      for (const j of range(-1, 1)) {
        const h = add(c, vec(i, j));

        if ((i == 0 && j == 0) || i * j !== 0 || !this.areCoordsValid(h))
          continue;

        if (this.tiledMap[h.x][h.y].tileType === tile) {
          allowed.push(h);
        }
      }
    }

    if (allowed.length) {
      const h = this.graph.rng.fromArr(allowed);
      this.tiledMap[h.x][h.y].nextTileType = this.tiledMap[c.x][c.y].tileType;
      this.tiledMap[c.x][c.y].nextTileType = tile;
    }
  }

  countTileTypesInPlusAround({ x, y }, countOOB, ...types) {
    let count = 0;
    for (const i of range(-1, 1)) {
      for (const j of range(-1, 1)) {
        if (i * j == 0 && i !== 0 && j !== 0) {
          if (this.areCoordsValid(vec(x + i, y + j))) {
            for (const type of types) {
              if (this.tiledMap[x + i][y + j].tileType === type) {
                count++;
                break;
              }
            }
          } else if (countOOB) {
            count++;
          }
        }
      }
    }
    return count;
  }

  areCoordsValid({ x, y }) {
    return (
      x >= 0 &&
      x < this.tiledMap.length &&
      y >= 0 &&
      y < this.tiledMap[0].length
    );
  }

  repeatedlyExecuteFunctionAsCAStep(fn) {
    let changed = true;
    while (changed) {
      this.execFunctionAtEachTile(fn);
      changed = this.propagateTileTypes();
    }
  }

  executeFunctionAsCAStep(times, fn) {
    let changed = true;
    while (times > 0 && changed) {
      this.execFunctionAtEachTile(fn);
      changed = this.propagateTileTypes();
      times--;
    }
  }

  propagateTileTypes() {
    let changed = false;
    for (const x of range(this.tiledMap.length)) {
      for (const y of range(this.tiledMap[0].length)) {
        if (this.tiledMap[x][y].tileType !== this.tiledMap[x][y].nextTileType) {
          this.tiledMap[x][y].tileType = this.tiledMap[x][y].nextTileType;
          changed = true;
        }
      }
    }
    return changed;
  }

  execFunctionAtEachTile(fn) {
    const [w, h] = this.graph.size();
    for (const x of range(w)) {
      for (const y of range(h)) {
        fn({ x, y });
      }
    }
  }

  fillSquare({ x, y }, type) {
    const startX = this.nodeSize * x,
      startY = this.nodeSize * y;
    for (const x of range(this.nodeSize)) {
      for (const y of range(this.nodeSize)) {
        this.tiledMap[startX + x][startY + y].tileType = type;
      }
    }
  }
}
