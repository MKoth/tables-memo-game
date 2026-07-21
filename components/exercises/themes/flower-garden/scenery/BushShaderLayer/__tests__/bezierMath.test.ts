import {
  bezierNormal,
  bezierPoint,
  bezierTangent,
  leafSide,
  type Point2D,
} from '../helpers/bezierMath';

const P0: Point2D = { x: 0, y: 0 };
const P1: Point2D = { x: 10, y: 0 };
const P2: Point2D = { x: 20, y: 0 };

describe('bezierPoint', () => {
  it('returns p0 at t=0', () => {
    const p = bezierPoint(0, P0, P1, P2);
    expect(p.x).toBeCloseTo(0, 6);
    expect(p.y).toBeCloseTo(0, 6);
  });

  it('returns p2 at t=1', () => {
    const p = bezierPoint(1, P0, P1, P2);
    expect(p.x).toBeCloseTo(20, 6);
    expect(p.y).toBeCloseTo(0, 6);
  });

  it('returns the quadratic bezier mid-point at t=0.5', () => {
    const p = bezierPoint(0.5, P0, P1, P2);
    expect(p.x).toBeCloseTo(10, 6);
    expect(p.y).toBeCloseTo(0, 6);
  });

  it('arcs the control point for a non-collinear curve', () => {
    const p = bezierPoint(0.5, P0, { x: 10, y: 10 }, P2);
    expect(p.x).toBeCloseTo(10, 6);
    expect(p.y).toBeCloseTo(5, 6);
  });

  it('moves only along x for a horizontal control point', () => {
    const p = bezierPoint(0.25, P0, P1, P2);
    expect(p.x).toBeCloseTo(5, 6);
    expect(p.y).toBeCloseTo(0, 6);
  });
});

describe('bezierTangent', () => {
  it('points along (p1 - p0) at t=0', () => {
    const t = bezierTangent(0, P0, P1, P2);
    expect(t.x).toBeCloseTo(1, 6);
    expect(t.y).toBeCloseTo(0, 6);
  });

  it('points along (p2 - p1) at t=1', () => {
    const t = bezierTangent(1, P0, P1, P2);
    expect(t.x).toBeCloseTo(1, 6);
    expect(t.y).toBeCloseTo(0, 6);
  });

  it('returns a unit vector for a non-degenerate curve', () => {
    const t = bezierTangent(0.4, P0, { x: 5, y: 12 }, P2);
    const len = Math.hypot(t.x, t.y);
    expect(len).toBeCloseTo(1, 6);
  });
});

describe('bezierNormal', () => {
  it('is perpendicular to the tangent at any t', () => {
    for (const t of [0, 0.25, 0.5, 0.75, 1]) {
      const tan = bezierTangent(t, P0, P1, P2);
      const nor = bezierNormal(t, P0, P1, P2);
      const dot = tan.x * nor.x + tan.y * nor.y;
      expect(dot).toBeCloseTo(0, 6);
    }
  });

  it('returns a unit vector for a non-degenerate curve', () => {
    const n = bezierNormal(0.5, P0, { x: 5, y: 12 }, P2);
    const len = Math.hypot(n.x, n.y);
    expect(len).toBeCloseTo(1, 6);
  });
});

describe('leafSide', () => {
  it('is +1 for a control point above a horizontal base->top line', () => {
    const side = leafSide(0.5, P0, { x: 10, y: -10 }, P2, P0);
    expect(side).toBe(1);
  });

  it('is -1 for a control point below a horizontal base->top line', () => {
    const side = leafSide(0.5, P0, { x: 10, y: 10 }, P2, P0);
    expect(side).toBe(-1);
  });

  it('flips sign when the control point is mirrored across the base->top line', () => {
    const above = leafSide(0.5, P0, { x: 10, y: -8 }, P2, P0);
    const below = leafSide(0.5, P0, { x: 10, y: 8 }, P2, P0);
    expect(above).toBe(1);
    expect(below).toBe(-1);
  });

  it('returns a sign in {-1, +1} for varied (t, geometry) inputs', () => {
    const tests: Array<[Point2D, Point2D, Point2D]> = [
      [P0, { x: 5, y: 7 }, P2],
      [P0, { x: 8, y: -3 }, { x: 25, y: 5 }],
      [{ x: -5, y: 0 }, { x: 0, y: 10 }, { x: 5, y: 0 }],
    ];
    for (const [p0, p1, p2] of tests) {
      const side = leafSide(0.4, p0, p1, p2, p0);
      expect(side === -1 || side === 1).toBe(true);
    }
  });

  it('returns the same side for a non-degenerate curve at different t values', () => {
    const p0: Point2D = { x: 0, y: 0 };
    const p1: Point2D = { x: 10, y: -5 };
    const p2: Point2D = { x: 20, y: 0 };
    const bushBase: Point2D = { x: 10, y: 10 };
    const sides = [0.1, 0.3, 0.5, 0.7, 0.9].map(t => leafSide(t, p0, p1, p2, bushBase));
    for (const s of sides) {
      expect(s).toBe(sides[0]);
    }
  });

  it('never returns 0 for a non-degenerate curve with a bush base off the curve', () => {
    const p0: Point2D = { x: 0, y: 0 };
    const p1: Point2D = { x: 10, y: -5 };
    const p2: Point2D = { x: 20, y: 0 };
    const bushBase: Point2D = { x: 10, y: 12 };
    for (const t of [0.1, 0.3, 0.5, 0.7, 0.9]) {
      const side = leafSide(t, p0, p1, p2, bushBase);
      expect(side === -1 || side === 1).toBe(true);
    }
  });
});
