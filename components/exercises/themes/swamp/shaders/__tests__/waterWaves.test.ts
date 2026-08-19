import {
  computeLoopedWaveRadius,
  computeWaveRadius,
  computeWaveUniforms,
  getClosestWaves,
  isWaveActive,
  MAX_WAVES_PER_SPRITE,
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
    it('MAX_WAVES_PER_SPRITE is 2', () => {
      expect(MAX_WAVES_PER_SPRITE).toBe(2);
    });
  });

  describe('getClosestWaves', () => {
    const waves: WaterWave[] = [
      { x: 10, y: 10, birthTime: 1.0, duration: 4000, maxRadius: 300, strength: 4.0, width: 12.0 },
      { x: 500, y: 500, birthTime: 1.0, duration: 4000, maxRadius: 300, strength: 3.0, width: 10.0 },
      { x: 20, y: 20, birthTime: 1.0, duration: 4000, maxRadius: 300, strength: 5.0, width: 14.0 },
      { x: 800, y: 800, birthTime: 1.0, duration: 4000, maxRadius: 300, strength: 2.0, width: 8.0 },
    ];

    it('returns closest N waves sorted by distance', () => {
      const result = getClosestWaves(waves, 15, 15, 2, 2.0, 80, 0.0015);
      expect(result.waveCount).toBe(2);
      expect(result.waveCenters[0]).toBe(10);
      expect(result.waveCenters[1]).toBe(10);
      expect(result.waveCenters[2]).toBe(20);
      expect(result.waveCenters[3]).toBe(20);
    });

    it('pads output arrays to count', () => {
      const result = getClosestWaves(waves, 15, 15, 4, 2.0, 80, 0.0015);
      expect(result.waveCount).toBe(4);
      expect(result.waveRadii).toHaveLength(4);
      expect(result.waveStrengths).toHaveLength(4);
      expect(result.waveWidths).toHaveLength(4);
      expect(result.waveCenters).toHaveLength(8);
    });

    it('returns fewer waves when fewer exist', () => {
      const single = [waves[0]!];
      const result = getClosestWaves(single, 15, 15, 2, 2.0, 80, 0.0015);
      expect(result.waveCount).toBe(1);
    });

    it('passes through waveDecay', () => {
      const result = getClosestWaves(waves, 15, 15, 2, 2.0, 80, 0.005);
      expect(result.waveDecay).toBe(0.005);
    });
  });
});
