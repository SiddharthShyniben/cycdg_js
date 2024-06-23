import color from "@nuff-said/color";

import { Tiler } from "./tiler.js";
import { arr2d } from "./util.js";
import { tiles } from "./consts.js";

export const drawMap = (GRA) => {
  console.clear();
  const tiler = new Tiler(GRA.graph, 5);
  const itm = tiler.getTileMap();

  console.log(
    arr2d(itm.length, itm[0].length)
      .map((row, x) =>
        row
          .map((_, y) => {
            const col = itm[x][y];
            const bgs = {
              default: color.magentaBg,
              [tiles.Unset]: color.blackBg,
              [tiles.Barrier]: color.redBg,
              [tiles.RoomFloor]: color.cyanBg,
              [tiles.CaveFloor]: color.blueBg,
              [tiles.Door]: color.greenBg,
              [tiles.Wall]: color.redBg,
              [tiles.SecretDoor]: color.greenBg,
              [tiles.LockedDoor]: color.greenBg,
            };

            const symbols = {
              default: "?",
              [tiles.Unset]: " ",
              [tiles.Barrier]: " ",
              [tiles.RoomFloor]: ".",
              [tiles.CaveFloor]: ",",
              [tiles.Door]: "+",
              [tiles.Wall]: "#",
              [tiles.SecretDoor]: "S",
              [tiles.LockedDoor]: "K",
            };

            let bg = bgs[col.tileType] || bgs.default,
              symbol = symbols[col.tileType] || symbols.default;

            return color.black(bg(symbol + symbol));
          })
          .join(""),
      )
      .join("\n"),
  );
};
