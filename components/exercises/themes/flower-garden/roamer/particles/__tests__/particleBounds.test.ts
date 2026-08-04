import {
  anyLiveDustRect,
  computeDustRectHalfExtent,
  DUST_RECT_MARGIN,
  DUST_RECT_SPEED_SMOOTHING,
  smoothDustRectSpeed,
} from '../particleBounds';
import type { SpeciesParticleConfig } from '../particleConfig';

function makeSpeciesConfig(
  overrides?: Partial<SpeciesParticleConfig>,
): SpeciesParticleConfig {
  return {
    emitIntervalMs: 10,
    ttlMin: 500,
    ttlMax: 1000,
    startDiameterMin: 4,
    startDiameterMax: 8,
    endDiameterMin: 1,
    endDiameterMax: 2,
    fadeInFraction: 0.5,
    fadeOutFraction: 0.3,
    colors: [[1.0, 0.894, 0.71]],
    colorChangeIntervalMs: 0,
    driftSpeed: 10,
    deviationRad: 1,
    ...overrides,
  };
}

describe('particleBounds', () => {
  describe('computeDustRectHalfExtent', () => {
    it('covers trail reach, drift reach, max radius, and margin', () => {
      const cfg = makeSpeciesConfig({ driftSpeed: 50, ttlMax: 2000, startDiameterMax: 10 });
      const margin = 6;
      const expected = 100 * 2 + 50 * 2 + 10 / 2 + margin;
      expect(computeDustRectHalfExtent(cfg, 100, margin)).toBeCloseTo(expected, 6);
    });

    it('covers only the base reach when the roamer is stationary', () => {
      const cfg = makeSpeciesConfig({ driftSpeed: 50, ttlMax: 2000, startDiameterMax: 10 });
      expect(computeDustRectHalfExtent(cfg, 0)).toBeCloseTo(
        50 * 2 + 10 / 2 + DUST_RECT_MARGIN,
        6,
      );
    });

    it('grows with roamer speed so the dust trail stays inside the rect', () => {
      const cfg = makeSpeciesConfig({ driftSpeed: 50, ttlMax: 2000, startDiameterMax: 10 });
      const slow = computeDustRectHalfExtent(cfg, 50);
      const fast = computeDustRectHalfExtent(cfg, 200);
      expect(fast).toBeGreaterThan(slow);
      expect(fast - slow).toBeCloseTo(150 * 2, 6);
    });

    it('is at least the margin when there is no motion and no radius', () => {
      const cfg = makeSpeciesConfig({ driftSpeed: 0, ttlMax: 0, startDiameterMax: 0 });
      expect(computeDustRectHalfExtent(cfg, 0, DUST_RECT_MARGIN)).toBe(DUST_RECT_MARGIN);
    });

    it('uses the default margin when omitted', () => {
      const cfg = makeSpeciesConfig({ driftSpeed: 0, ttlMax: 0, startDiameterMax: 0 });
      expect(computeDustRectHalfExtent(cfg, 0)).toBe(DUST_RECT_MARGIN);
    });
  });

  describe('smoothDustRectSpeed', () => {
    it('interpolates toward the current speed', () => {
      expect(smoothDustRectSpeed(0, 100, 0.25)).toBeCloseTo(25, 6);
      expect(smoothDustRectSpeed(25, 100, 0.25)).toBeCloseTo(43.75, 6);
    });

    it('stays bounded by the current speed when accelerating', () => {
      const speed = smoothDustRectSpeed(0, 100, DUST_RECT_SPEED_SMOOTHING);
      expect(speed).toBeGreaterThan(0);
      expect(speed).toBeLessThanOrEqual(100);
    });

    it('decays toward zero after landing', () => {
      const first = smoothDustRectSpeed(200, 0, DUST_RECT_SPEED_SMOOTHING);
      expect(first).toBeLessThan(200);
      expect(first).toBeGreaterThan(0);
      const second = smoothDustRectSpeed(first, 0, DUST_RECT_SPEED_SMOOTHING);
      expect(second).toBeLessThan(first);
    });
  });

  describe('anyLiveDustRect', () => {
    it('is false for an empty or all-dead flag list', () => {
      expect(anyLiveDustRect([])).toBe(false);
      expect(anyLiveDustRect([0, 0, 0])).toBe(false);
    });

    it('is true when any rect is live', () => {
      expect(anyLiveDustRect([0, 1, 0])).toBe(true);
    });
  });
});
