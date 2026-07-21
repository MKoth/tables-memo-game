export type Point2D = { x: number; y: number };

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpPoint(a: Point2D, b: Point2D, t: number): Point2D {
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) };
}

function dot(a: Point2D, b: Point2D): number {
  return a.x * b.x + a.y * b.y;
}

function normalize(v: Point2D): Point2D {
  const len = Math.hypot(v.x, v.y);
  if (len < 1e-9) {
    return { x: 0, y: 0 };
  }
  return { x: v.x / len, y: v.y / len };
}

export function bezierPoint(
  t: number,
  p0: Point2D,
  p1: Point2D,
  p2: Point2D,
): Point2D {
  const a = lerpPoint(p0, p1, t);
  const b = lerpPoint(p1, p2, t);
  return lerpPoint(a, b, t);
}

export function bezierTangent(
  t: number,
  p0: Point2D,
  p1: Point2D,
  p2: Point2D,
): Point2D {
  const raw = {
    x: 2 * (1 - t) * (p1.x - p0.x) + 2 * t * (p2.x - p1.x),
    y: 2 * (1 - t) * (p1.y - p0.y) + 2 * t * (p2.y - p1.y),
  };
  return normalize(raw);
}

export function bezierNormal(
  t: number,
  p0: Point2D,
  p1: Point2D,
  p2: Point2D,
): Point2D {
  const tan = bezierTangent(t, p0, p1, p2);
  return { x: -tan.y, y: tan.x };
}

export function leafSide(
  t: number,
  p0: Point2D,
  p1: Point2D,
  p2: Point2D,
  bushBase: Point2D,
): -1 | 1 {
  const position = bezierPoint(t, p0, p1, p2);
  const normal = bezierNormal(t, p0, p1, p2);
  const toBush = { x: bushBase.x - position.x, y: bushBase.y - position.y };
  const sign = dot(normal, toBush);
  return sign > 0 ? 1 : -1;
}
