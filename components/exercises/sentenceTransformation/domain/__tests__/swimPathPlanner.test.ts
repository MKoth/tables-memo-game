import { planSwimPaths } from '../swimPathPlanner';
import type { ExerciseOrientation } from '../../../core/layout/computeExerciseLayout';

const SCREEN_WIDTH = 390;
const SCREEN_HEIGHT = 844;
const JELLY_RECT = { x: 0, y: 60, w: 390, h: 320 };

function portraitCenters(count: number): { x: number; y: number }[] {
  const centers: { x: number; y: number }[] = [];
  for (let i = 0; i < count; i++) {
    centers.push({ x: 40 + i * 80, y: 200 });
  }
  return centers;
}

function landscapeCenters(count: number): { x: number; y: number }[] {
  const centers: { x: number; y: number }[] = [];
  for (let i = 0; i < count; i++) {
    centers.push({ x: 40 + i * 80, y: 200 });
  }
  return centers;
}

function assertExitAngleReversesEnter(path: { enterAngle: number; exitAngle: number }) {
  const expectedExit = path.enterAngle + Math.PI;
  const normalized =
    ((path.exitAngle - expectedExit + Math.PI) % (2 * Math.PI) + 2 * Math.PI) %
      (2 * Math.PI) -
    Math.PI;
  expect(Math.abs(normalized)).toBeLessThan(0.001);
}

function planForOrientation(
  orientation: ExerciseOrientation,
  slotCount: number,
) {
  const centers =
    orientation === 'portrait'
      ? portraitCenters(slotCount)
      : landscapeCenters(slotCount);
  return planSwimPaths({
    orientation,
    screenWidth: SCREEN_WIDTH,
    screenHeight: SCREEN_HEIGHT,
    jellyRect: JELLY_RECT,
    slotCenters: centers,
  });
}

describe('planSwimPaths', () => {
  it('returns empty array for zero slots', () => {
    const paths = planForOrientation('portrait', 0);
    expect(paths).toEqual([]);
  });

  describe('portrait orientation', () => {
    it('produces a path for each slot', () => {
      const paths = planForOrientation('portrait', 5);
      expect(paths).toHaveLength(5);
    });

    it('spawns slots only from top, left, and right edges', () => {
      const paths = planForOrientation('portrait', 6);
      for (const path of paths) {
        const isTop = path.spawnY < 0;
        const isLeft = path.spawnX < 0;
        const isRight = path.spawnX > SCREEN_WIDTH;
        const onAllowedEdge = isTop || isLeft || isRight;
        expect(onAllowedEdge).toBe(true);
      }
    });

    it('never uses bottom edge in portrait', () => {
      const paths = planForOrientation('portrait', 10);
      for (const path of paths) {
        expect(path.spawnY).toBeLessThanOrEqual(SCREEN_HEIGHT);
      }
    });

    it('assigns paths in round-robin order (top, left, right)', () => {
      const paths = planForOrientation('portrait', 3);
      expect(paths[0]!.spawnY).toBeLessThan(0);
      expect(paths[1]!.spawnX).toBeLessThan(0);
      expect(paths[2]!.spawnX).toBeGreaterThan(SCREEN_WIDTH);
    });

    it('calculates enter angle pointing toward slot center', () => {
      const paths = planForOrientation('portrait', 3);
      for (let i = 0; i < paths.length; i++) {
        const path = paths[i]!;
        const dx = path.slotCenterX - path.spawnX;
        const dy = path.slotCenterY - path.spawnY;
        const expectedAngle = Math.atan2(dy, dx);
        expect(path.enterAngle).toBeCloseTo(expectedAngle, 5);
      }
    });

    it('calculates exit angle opposite to enter angle', () => {
      const paths = planForOrientation('portrait', 3);
      for (const path of paths) {
        assertExitAngleReversesEnter(path);
      }
    });

    it('distributes top-edge spawns across jellyRect width', () => {
      const manyTopPaths = planForOrientation('portrait', 9);
      const topPaths = manyTopPaths.filter((p) => p.spawnY < 0);
      expect(topPaths.length).toBeGreaterThanOrEqual(3);
      const spawnXs = topPaths.map((p) => p.spawnX);
      const minX = Math.min(...spawnXs);
      const maxX = Math.max(...spawnXs);
      expect(minX).toBeGreaterThanOrEqual(JELLY_RECT.x);
      expect(maxX).toBeLessThanOrEqual(JELLY_RECT.x + JELLY_RECT.w);
    });
  });

  describe('landscape orientation', () => {
    it('produces a path for each slot', () => {
      const paths = planForOrientation('landscapeLeft', 4);
      expect(paths).toHaveLength(4);
    });

    it('spawns slots only from top, bottom, and right edges', () => {
      const paths = planForOrientation('landscapeLeft', 6);
      for (const path of paths) {
        const isTop = path.spawnY < 0;
        const isBottom = path.spawnY > SCREEN_HEIGHT;
        const isRight = path.spawnX > SCREEN_WIDTH;
        const onAllowedEdge = isTop || isBottom || isRight;
        expect(onAllowedEdge).toBe(true);
      }
    });

    it('never uses left edge in landscape', () => {
      const paths = planForOrientation('landscapeLeft', 10);
      for (const path of paths) {
        expect(path.spawnX).toBeGreaterThanOrEqual(0);
      }
    });

    it('assigns paths in round-robin order (top, bottom, right)', () => {
      const paths = planForOrientation('landscapeLeft', 3);
      expect(paths[0]!.spawnY).toBeLessThan(0);
      expect(paths[1]!.spawnY).toBeGreaterThan(SCREEN_HEIGHT);
      expect(paths[2]!.spawnX).toBeGreaterThan(SCREEN_WIDTH);
    });

    it('works identically for landscapeLeft and landscapeRight', () => {
      const leftPaths = planForOrientation('landscapeLeft', 6);
      const rightPaths = planForOrientation('landscapeRight', 6);
      expect(leftPaths).toHaveLength(rightPaths.length);
      for (let i = 0; i < leftPaths.length; i++) {
        expect(leftPaths[i]!.enterAngle).toBe(rightPaths[i]!.enterAngle);
      }
    });
  });

  describe('non-crossing assignment', () => {
    it('assigns spawn points in sentence order so paths fan inward', () => {
      const paths = planForOrientation('portrait', 6);
      const validDirections = paths.every((p) => {
        const angle = p.enterAngle;
        return !isNaN(angle) && isFinite(angle);
      });
      expect(validDirections).toBe(true);

      for (let i = 1; i < paths.length; i++) {
        const prev = paths[i - 1]!;
        const curr = paths[i]!;
        const prevDist = Math.hypot(
          curr.slotCenterX - prev.spawnX,
          curr.slotCenterY - prev.spawnY,
        );
        const currDist = Math.hypot(
          curr.slotCenterX - curr.spawnX,
          curr.slotCenterY - curr.spawnY,
        );
        expect(prevDist).toBeGreaterThan(0);
        expect(currDist).toBeGreaterThan(0);
      }
    });
  });

  describe('blank early-exit path', () => {
    it.each([1, 3, 5, 7])(
      'exit angle reverses enter angle for all %d slots',
      (totalSlots) => {
        const paths = planForOrientation('portrait', totalSlots);
        for (const path of paths) {
          assertExitAngleReversesEnter(path);
        }
      },
    );

    it('exit path for a single slot (blank-only row) has valid trajectory', () => {
      const paths = planForOrientation('portrait', 1);
      expect(paths).toHaveLength(1);
      assertExitAngleReversesEnter(paths[0]!);
    });
  });

  describe('single slot', () => {
    it('spawns a single slot centered on the first edge', () => {
      const paths = planForOrientation('portrait', 1);
      expect(paths).toHaveLength(1);
      expect(paths[0]!.spawnY).toBeLessThan(0);
      expect(paths[0]!.slotCenterX).toBe(paths[0]!.slotCenterX);
    });
  });
});
