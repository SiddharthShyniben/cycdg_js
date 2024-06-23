import color from "@nuff-said/color";

export const tiles = {
  Unset: -1,
  RoomFloor: -2,
  CaveFloor: -3,
  Wall: -4,
  Barrier: -5,
  Door: -6,
  LockedDoor: -7,
  SecretDoor: -8,
};

export const tags = {
  Start: "Start",
  Goal: "Goal",
  Key: "Key",
  HalfKey: "HalfKey",
  MasterKey: "MasterKey",
  Boss: "Boss",
  Treasure: "Treasure",
  Hazard: "Hazard",
  Trap: "Trap",
  Teleport: "Teleport",
  LockedEdge: "LockedEdge",
  BilockedEdge: "BilockedEdge",
  MasterLockedEdge: "MasterLockedEdge",
  WindowEdge: "WindowEdge",
  OneTimeEdge: "OneTimeEdge",
  OneWayEdge: "OneWayEdge",
  SecretEdge: "SecretEdge",
};

export const cardinalDirections = [
  vec(0, -1),
  vec(1, 0),
  vec(0, 1),
  vec(-1, 0),
];

export const diagonalDirections = [
  vec(-1, -1),
  vec(1, -1),
  vec(1, 1),
  vec(-1, 1),
];

export const arrows = {
  up: {
    default: "↑",
    masterlocked: color.red("⇧"),
    locked: "⇧",
    secret: color.dim("↑"),
    window: "⇡",
    oneWay: color.cyan("↑"),
    oneTime: color.yellow("↑"),
  },
  down: {
    default: "↓",
    masterlocked: color.red("⇩"),
    locked: "⇩",
    secret: color.dim("↓"),
    window: "⇣",
    oneWay: color.cyan("↓"),
    oneTime: color.yellow("↓"),
  },
  left: {
    default: "←",
    masterlocked: color.red("⇦"),
    locked: "⇦",
    secret: color.dim("←"),
    window: "⇠",
    oneWay: color.cyan("←"),
    oneTime: color.yellow("←"),
  },
  right: {
    default: "→",
    masterlocked: color.red("⇨"),
    locked: "⇨",
    secret: color.dim("→"),
    window: "⇢",
    oneWay: color.cyan("→"),
    oneTime: color.yellow("→"),
  },
};

export const nodeWidth = 9;
export const nodeHeight = 5;
export const nodeSpacing = 3;
export const nodeTotalWidth = nodeWidth + nodeSpacing;
