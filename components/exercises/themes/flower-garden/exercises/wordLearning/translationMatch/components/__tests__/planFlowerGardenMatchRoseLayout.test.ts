import {
  MATCH_ROSE_KEEP_OUT_PAD,
  MATCH_ROSE_SIZE_MIN,
  planFlowerGardenMatchRoseLayout,
} from '../planFlowerGardenMatchRoseLayout';

const SCREEN_W = 390;
const SCREEN_H = 844;
const ORB_CX = SCREEN_W * 0.5;
const ORB_CY = SCREEN_H * 0.5;
const ORB_RADIUS = 126.75;

describe('planFlowerGardenMatchRoseLayout', () => {
  it('splits the roses half top, half bottom', () => {
    const plan = planFlowerGardenMatchRoseLayout({
      count: 8,
      screenWidth: SCREEN_W,
      screenHeight: SCREEN_H,
      orbCenterX: ORB_CX,
      orbCenterY: ORB_CY,
      orbRadius: ORB_RADIUS,
    });
    expect(plan.roseCenters).toHaveLength(8);
    const top = plan.roseCenters.filter(r => r.side === 'top');
    const bottom = plan.roseCenters.filter(r => r.side === 'bottom');
    expect(top).toHaveLength(4);
    expect(bottom).toHaveLength(4);
    for (const rose of top) {
      expect(rose.y).toBeLessThan(SCREEN_H * 0.5);
    }
    for (const rose of bottom) {
      expect(rose.y).toBeGreaterThan(SCREEN_H * 0.5);
    }
  });

  it('keeps every rose outside the orb keep-out disk', () => {
    const plan = planFlowerGardenMatchRoseLayout({
      count: 8,
      screenWidth: SCREEN_W,
      screenHeight: SCREEN_H,
      orbCenterX: ORB_CX,
      orbCenterY: ORB_CY,
      orbRadius: ORB_RADIUS,
    });
    for (let i = 0; i < plan.roseCenters.length; i++) {
      const rose = plan.roseCenters[i]!;
      const minDist = ORB_RADIUS + plan.bellSizes[i]! / 2 + MATCH_ROSE_KEEP_OUT_PAD;
      const dist = Math.hypot(rose.x - ORB_CX, rose.y - ORB_CY);
      expect(dist).toBeGreaterThanOrEqual(minDist - 1e-6);
    }
  });

  it('keeps every rose clear of the disk on short screens too', () => {
    const h = 390;
    const plan = planFlowerGardenMatchRoseLayout({
      count: 8,
      screenWidth: SCREEN_W,
      screenHeight: h,
      orbCenterX: SCREEN_W * 0.5,
      orbCenterY: h * 0.5,
      orbRadius: 126.75,
    });
    for (let i = 0; i < plan.roseCenters.length; i++) {
      const rose = plan.roseCenters[i]!;
      const minDist = 126.75 + plan.bellSizes[i]! / 2 + MATCH_ROSE_KEEP_OUT_PAD;
      const dist = Math.hypot(rose.x - SCREEN_W * 0.5, rose.y - h * 0.5);
      expect(dist).toBeGreaterThanOrEqual(minDist - 1e-6);
    }
  });

  it('keeps roses inside the screen with room for the bud', () => {
    const plan = planFlowerGardenMatchRoseLayout({
      count: 8,
      screenWidth: SCREEN_W,
      screenHeight: SCREEN_H,
      orbCenterX: ORB_CX,
      orbCenterY: ORB_CY,
      orbRadius: ORB_RADIUS,
    });
    for (let i = 0; i < plan.roseCenters.length; i++) {
      const rose = plan.roseCenters[i]!;
      const r = plan.bellSizes[i]! / 2;
      expect(rose.x - r).toBeGreaterThanOrEqual(0);
      expect(rose.x + r).toBeLessThanOrEqual(SCREEN_W);
      expect(rose.y - r).toBeGreaterThanOrEqual(0);
      expect(rose.y + r).toBeLessThanOrEqual(SCREEN_H);
    }
  });

  it('rolls bell sizes within the configured range', () => {
    const plan = planFlowerGardenMatchRoseLayout({
      count: 8,
      screenWidth: SCREEN_W,
      screenHeight: SCREEN_H,
      orbCenterX: ORB_CX,
      orbCenterY: ORB_CY,
      orbRadius: ORB_RADIUS,
    });
    for (const size of plan.bellSizes) {
      expect(size).toBeGreaterThanOrEqual(MATCH_ROSE_SIZE_MIN);
      expect(size).toBeLessThanOrEqual(90);
    }
  });

  it('jitters the roses off their rows so they do not line up', () => {
    const plan = planFlowerGardenMatchRoseLayout({
      count: 8,
      screenWidth: SCREEN_W,
      screenHeight: SCREEN_H,
      orbCenterX: ORB_CX,
      orbCenterY: ORB_CY,
      orbRadius: ORB_RADIUS,
    });
    const topYs = plan.roseCenters
      .filter(r => r.side === 'top')
      .map(r => r.y);
    const bottomYs = plan.roseCenters
      .filter(r => r.side === 'bottom')
      .map(r => r.y);
    const spread = (values: number[]) => Math.max(...values) - Math.min(...values);
    expect(spread(topYs)).toBeGreaterThan(10);
    expect(spread(bottomYs)).toBeGreaterThan(10);
  });

  it('is deterministic for the same seed', () => {
    const base = {
      count: 8,
      screenWidth: SCREEN_W,
      screenHeight: SCREEN_H,
      orbCenterX: ORB_CX,
      orbCenterY: ORB_CY,
      orbRadius: ORB_RADIUS,
      seedKey: 'match-roses:1',
    } as const;
    const a = planFlowerGardenMatchRoseLayout(base);
    const b = planFlowerGardenMatchRoseLayout(base);
    expect(a.roseCenters).toEqual(b.roseCenters);
    expect(a.bellSizes).toEqual(b.bellSizes);
  });
});
