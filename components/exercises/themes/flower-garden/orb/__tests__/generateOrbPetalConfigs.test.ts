import { createRng } from '../../scenery/BushShaderLayer/helpers/seededRandom';
import {
  ORB_BURST_SPEED_MAX,
  ORB_BURST_SPEED_MIN,
  ORB_PETAL_BROWNIAN_STEP_MAX,
  ORB_PETAL_BROWNIAN_STEP_MIN,
  ORB_PETAL_COUNT,
  ORB_PETAL_PHASE_SPEED_MAX,
  ORB_PETAL_PHASE_SPEED_MIN,
  ORB_RING_CONFIGS,
  ORB_RING_PETAL_COUNTS,
} from '../orbAnimPresets';
import { generateOrbPetalConfigs } from '../generateOrbPetalConfigs';

const RING_CENTERS = ORB_RING_CONFIGS.map(r => r.centerRadius);
const RING_THICKNESSES = ORB_RING_CONFIGS.map(r => r.thickness);

describe('generateOrbPetalConfigs', () => {
  it('produces 78 petals total (18 + 24 + 36)', () => {
    const petals = generateOrbPetalConfigs({ rng: createRng(1) });
    expect(petals.length).toBe(
      ORB_RING_PETAL_COUNTS.reduce((a, b) => a + b, 0),
    );
  });

  it('each petal has imageIndex in [0, 20]', () => {
    const petals = generateOrbPetalConfigs({ rng: createRng(2) });
    for (const p of petals) {
      expect(p.imageIndex).toBeGreaterThanOrEqual(0);
      expect(p.imageIndex).toBeLessThan(ORB_PETAL_COUNT);
      expect(Number.isInteger(p.imageIndex)).toBe(true);
    }
  });

  it('each petal has ringIndex in [0, 2] matching the count distribution', () => {
    const petals = generateOrbPetalConfigs({ rng: createRng(3) });
    const counts = [0, 0, 0];
    for (const p of petals) {
      expect(p.ringIndex).toBeGreaterThanOrEqual(0);
      expect(p.ringIndex).toBeLessThan(3);
      expect(Number.isInteger(p.ringIndex)).toBe(true);
      counts[p.ringIndex]! += 1;
    }
    expect(counts).toEqual(ORB_RING_PETAL_COUNTS);
  });

  it('per-ring initial angles are evenly spaced within tolerance', () => {
    const petals = generateOrbPetalConfigs({ rng: createRng(4) });
    const ringBuckets: number[][] = [[], [], []];
    for (const p of petals) {
      ringBuckets[p.ringIndex]!.push(p.initialAngle);
    }
    for (let r = 0; r < 3; r++) {
      const angles = ringBuckets[r]!;
      const count = angles.length;
      const expectedStep = (Math.PI * 2) / count;
      angles.sort((a, b) => a - b);
      for (let i = 0; i < count; i++) {
        const next = (i + 1) % count;
        let diff = angles[next]! - angles[i]!;
        if (next === 0) {
          diff += Math.PI * 2;
        }
        expect(diff).toBeCloseTo(expectedStep, 3);
      }
    }
  });

  it('phaseSpeed values are within configured range', () => {
    const petals = generateOrbPetalConfigs({ rng: createRng(5) });
    for (const p of petals) {
      expect(p.phaseSpeed).toBeGreaterThanOrEqual(ORB_PETAL_PHASE_SPEED_MIN);
      expect(p.phaseSpeed).toBeLessThanOrEqual(ORB_PETAL_PHASE_SPEED_MAX);
    }
  });

  it('brownianStep values are within configured range', () => {
    const petals = generateOrbPetalConfigs({ rng: createRng(6) });
    for (const p of petals) {
      expect(p.brownianStep).toBeGreaterThanOrEqual(ORB_PETAL_BROWNIAN_STEP_MIN);
      expect(p.brownianStep).toBeLessThanOrEqual(ORB_PETAL_BROWNIAN_STEP_MAX);
    }
  });

  it('produces identical output for the same seed', () => {
    const a = generateOrbPetalConfigs({ rng: createRng(7) });
    const b = generateOrbPetalConfigs({ rng: createRng(7) });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('produces a different but still valid output for a different seed', () => {
    const a = generateOrbPetalConfigs({ rng: createRng(7) });
    const b = generateOrbPetalConfigs({ rng: createRng(8) });
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b));
    expect(b.length).toBe(a.length);
    for (const p of b) {
      expect(p.imageIndex).toBeGreaterThanOrEqual(0);
      expect(p.imageIndex).toBeLessThan(ORB_PETAL_COUNT);
    }
  });

  it('startRadius is within the ring band of the petal ring', () => {
    const petals = generateOrbPetalConfigs({ rng: createRng(9) });
    for (const p of petals) {
      const ring = p.ringIndex;
      const center = RING_CENTERS[ring]!;
      const thickness = RING_THICKNESSES[ring]!;
      const min = center - thickness * 0.5;
      const max = center + thickness * 0.5;
      expect(p.startRadius).toBeGreaterThanOrEqual(min - 1e-9);
      expect(p.startRadius).toBeLessThanOrEqual(max + 1e-9);
    }
  });

  it('burstAngle values are in [-1, 1] (scaled by cone at use site)', () => {
    const petals = generateOrbPetalConfigs({ rng: createRng(10) });
    for (const p of petals) {
      expect(p.burstAngle).toBeGreaterThanOrEqual(-1);
      expect(p.burstAngle).toBeLessThanOrEqual(1);
    }
  });

  it('burstSpeed values are within configured range', () => {
    const petals = generateOrbPetalConfigs({ rng: createRng(11) });
    for (const p of petals) {
      expect(p.burstSpeed).toBeGreaterThanOrEqual(ORB_BURST_SPEED_MIN);
      expect(p.burstSpeed).toBeLessThanOrEqual(ORB_BURST_SPEED_MAX);
    }
  });
});
