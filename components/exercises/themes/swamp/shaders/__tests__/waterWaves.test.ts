import {
  computeLoopedWaveRadius,
  computeWaveRadius,
  computeWaveUniforms,
  isWaveActive,
  singleWaveDefaults,
  waterWaveLayerMultiplier,
  type WaterWave,
} from '../waterWaves';

describe('waterWaves', () => {
  const wave: WaterWave = {
    x: 100,
    y: 200,
    birthTime: 1.0,
    duration: 4000,
    maxRadius: 300,
    strength: 4.0,
    width: 12.0,
  };

  describe('computeWaveRadius', () => {
    it('returns 0 before birth', () => {
      expect(computeWaveRadius(0.5, 1.0, 80)).toBe(0);
    });
    it('computes linear growth after birth', () => {
      expect(computeWaveRadius(2.0, 1.0, 80)).toBe(80);
      expect(computeWaveRadius(3.5, 1.0, 80)).toBe(200);
    });
    it('returns 0 at exact birth', () => {
      expect(computeWaveRadius(1.0, 1.0, 80)).toBe(0);
    });
  });

  describe('isWaveActive', () => {
    it('active when within radius and duration', () => {
      expect(isWaveActive(2.0, wave, 80)).toBe(true);
    });
    it('inactive when radius exceeds maxRadius', () => {
      expect(isWaveActive(6.0, wave, 80)).toBe(false);
    });
    it('inactive when age exceeds duration', () => {
      const shortWave = { ...wave, duration: 1000, maxRadius: 1000 };
      expect(isWaveActive(3.0, shortWave, 80)).toBe(false);
    });
    it('inactive before birth', () => {
      expect(isWaveActive(0.5, wave, 80)).toBe(false);
    });
  });

  describe('computeWaveUniforms', () => {
    it('returns center and radius and active=1 when alive', () => {
      const u = computeWaveUniforms(wave, 2.0, 80, 0.0015);
      expect(u.waveCenter).toEqual([100, 200]);
      expect(u.waveRadius).toBe(80);
      expect(u.waveActive).toBe(1);
      expect(u.waveStrength).toBe(4.0);
      expect(u.waveWidth).toBe(12.0);
      expect(u.waveDecay).toBe(0.0015);
    });
    it('returns active=0 when expired', () => {
      const u = computeWaveUniforms(wave, 10.0, 80, 0.0015);
      expect(u.waveActive).toBe(0);
    });
  });

  describe('computeLoopedWaveRadius', () => {
    it('loops every durationMs', () => {
      expect(computeLoopedWaveRadius(0, 0, 80, 4000)).toBe(0);
      expect(computeLoopedWaveRadius(2, 0, 80, 4000)).toBe(160);
      expect(computeLoopedWaveRadius(4, 0, 80, 4000)).toBe(0);
      expect(computeLoopedWaveRadius(5, 0, 80, 4000)).toBe(80);
    });
    it('respects birthTime offset', () => {
      expect(computeLoopedWaveRadius(3, 1, 80, 4000)).toBe(160);
    });
  });

  describe('defaults', () => {
    it('singleWaveDefaults match spec ranges (tweakable)', () => {
      expect(singleWaveDefaults.waveSpeed).toBe(80.0);
      expect(singleWaveDefaults.waveWidth).toBe(12.0);
      expect(singleWaveDefaults.waveStrength).toBeGreaterThanOrEqual(1);
      expect(singleWaveDefaults.waveStrength).toBeLessThanOrEqual(10);
      expect(singleWaveDefaults.waveDecay).toBeGreaterThan(0);
      expect(singleWaveDefaults.waveDecay).toBeLessThan(0.02);
      expect(singleWaveDefaults.waveMaxRadius).toBeGreaterThan(100);
      expect(singleWaveDefaults.waveMaxRadius).toBeLessThan(2000);
      expect(singleWaveDefaults.waveDuration).toBeGreaterThan(1000);
      expect(singleWaveDefaults.waveDuration).toBeLessThan(6000);
    });
    it('layer multipliers', () => {
      expect(waterWaveLayerMultiplier.floor).toBe(0.6);
      expect(waterWaveLayerMultiplier.stone).toBe(1.0);
      expect(waterWaveLayerMultiplier.algae).toBe(1.3);
    });
  });
});
