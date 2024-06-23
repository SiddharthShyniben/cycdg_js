export const vec = (x = 0, y = x) => (typeof x.x == "number" ? x : { x, y });

const _vecify =
  (fn) =>
  (...args) =>
    fn(...args.map((x) => vec(x)));

export const spread = (a) => [a.x, a.y];
export const fmt = _vecify(({ x, y }) => `(${x}, ${y})`);

export const is = _vecify((a, b) => a.x == b.x && a.y == b.y);
export const manhattan = _vecify(
  (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y),
);

export const isCardinal = _vecify((a, b) => a.x == b.x || a.y == b.y);
export const adjacent = (a, b) => manhattan(a, b) == 1;
export const vectorTo = (a, b) => vec(b.x - a.x, b.y - a.y);

export const add = _vecify((a, b) => vec(a.x + b.x, a.y + b.y));
export const sub = _vecify((a, b) => vec(a.x - b.x, a.y - b.y));
