import { createRng } from '../../BushShaderLayer/helpers/seededRandom';
import {
  generateFieldFlowerConfigs,
  validateFieldFlowerConfigs,
  type GenerateFieldFlowerConfigsInput,
} from '../generateFieldFlowerConfigs';
import type { FieldFlowerType } from '../types';

const SCREEN_W = 400;
const SCREEN_H = 800;
const LOWER_FRACTION = 0.5;

function buildInput(
  overrides: Partial<GenerateFieldFlowerConfigsInput> = {},
): GenerateFieldFlowerConfigsInput {
  return {
    screenWidth: overrides.screenWidth ?? SCREEN_W,
    screenHeight: overrides.screenHeight ?? SCREEN_H,
    rng: overrides.rng ?? createRng(0xc0ffee),
    count: overrides.count ?? 3,
    minLeaves: overrides.minLeaves ?? 5,
    maxLeaves: overrides.maxLeaves ?? 7,
    lowerScreenFraction: overrides.lowerScreenFraction ?? LOWER_FRACTION,
    minDistance: overrides.minDistance ?? 150,
    offsetX: overrides.offsetX ?? 0,
    offsetY: overrides.offsetY ?? 0,
    offsetScale: overrides.offsetScale ?? 1,
    minFlowerSize: overrides.minFlowerSize ?? 100,
    maxFlowerSize: overrides.maxFlowerSize ?? 140,
    minLeafLength: overrides.minLeafLength ?? 80,
    maxLeafLength: overrides.maxLeafLength ?? 120,
    minLeafWidth: overrides.minLeafWidth ?? 25,
    maxLeafWidth: overrides.maxLeafWidth ?? 45,
    stemBaseWidth: overrides.stemBaseWidth ?? 10,
    stemTopWidth: overrides.stemTopWidth ?? 40,
    clusterShadowOffsetX: overrides.clusterShadowOffsetX ?? 0,
    clusterShadowOffsetY: overrides.clusterShadowOffsetY ?? 0,
    flowerTopShadowOffsetX: overrides.flowerTopShadowOffsetX ?? 0,
    flowerTopShadowOffsetY: overrides.flowerTopShadowOffsetY ?? 0,
    bottomPadding: overrides.bottomPadding ?? 0,
  };
}

describe('generateFieldFlowerConfigs', () => {
  it('produces the requested count of field flowers', () => {
    const configs = generateFieldFlowerConfigs(buildInput({ count: 3 }));
    expect(configs).toHaveLength(3);
  });

  it('enforces minDistance between flower headers', () => {
    const minDist = 100;
    const configs = generateFieldFlowerConfigs(buildInput({ count: 5, minDistance: minDist }));
    for (let i = 0; i < configs.length; i++) {
      for (let j = i + 1; j < configs.length; j++) {
        const dx = configs[i]!.headerX - configs[j]!.headerX;
        const dy = configs[i]!.headerY - configs[j]!.headerY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        expect(dist).toBeGreaterThanOrEqual(minDist - 0.5);
      }
    }
  });

  it('returns empty array for count=0', () => {
    const configs = generateFieldFlowerConfigs(buildInput({ count: 0 }));
    expect(configs).toHaveLength(0);
  });

  it('places every header inside the lower band of the screen', () => {
    const input = buildInput({ count: 5 });
    const configs = generateFieldFlowerConfigs(input);
    const lowerYStart = SCREEN_H * (1 - LOWER_FRACTION);
    for (const fc of configs) {
      expect(fc.headerY).toBeGreaterThanOrEqual(lowerYStart);
      expect(fc.headerY).toBeLessThanOrEqual(SCREEN_H);
      expect(fc.headerX).toBeGreaterThanOrEqual(0);
      expect(fc.headerX).toBeLessThanOrEqual(SCREEN_W);
    }
  });

  it('gives every flower a leafCount in [5, 7]', () => {
    const configs = generateFieldFlowerConfigs(buildInput({ count: 8 }));
    for (const fc of configs) {
      expect(fc.leafCount).toBeGreaterThanOrEqual(5);
      expect(fc.leafCount).toBeLessThanOrEqual(7);
    }
  });

  it('gives every leaf a variant in [0, 3]', () => {
    const configs = generateFieldFlowerConfigs(buildInput({ count: 8 }));
    for (const fc of configs) {
      for (const v of fc.leafVariants) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(3);
      }
    }
  });

  it('matches leafVariants length to leafCount', () => {
    const configs = generateFieldFlowerConfigs(buildInput({ count: 5 }));
    for (const fc of configs) {
      expect(fc.leafVariants).toHaveLength(fc.leafCount);
    }
  });

  it('gives every flower offsetX/offsetY=0 and offsetScale=1', () => {
    const configs = generateFieldFlowerConfigs(buildInput({ count: 4 }));
    for (const fc of configs) {
      expect(fc.offsetX).toBe(0);
      expect(fc.offsetY).toBe(0);
      expect(fc.offsetScale).toBe(1);
    }
  });

  it('places stemBaseX == headerX (same point, zero-length stem)', () => {
    const configs = generateFieldFlowerConfigs(buildInput({ count: 5 }));
    for (const fc of configs) {
      expect(fc.stemBaseX).toBe(fc.headerX);
      expect(fc.stemBaseY).toBe(fc.headerY);
    }
  });

  it('is deterministic with the same seed', () => {
    const seed = 0xabc;
    const rng1 = createRng(seed);
    const rng2 = createRng(seed);
    const a = generateFieldFlowerConfigs(buildInput({ rng: rng1 }));
    const b = generateFieldFlowerConfigs(buildInput({ rng: rng2 }));
    expect(a).toEqual(b);
  });

  it('produces different configs with a different seed', () => {
    const a = generateFieldFlowerConfigs(buildInput({ rng: createRng(1) }));
    const b = generateFieldFlowerConfigs(buildInput({ rng: createRng(2) }));
    expect(a).not.toEqual(b);
  });

  it('sets a ringRotation for every flower', () => {
    const configs = generateFieldFlowerConfigs(buildInput({ count: 6 }));
    for (const fc of configs) {
      expect(fc.ringRotation).toBeGreaterThanOrEqual(0);
      expect(fc.ringRotation).toBeLessThanOrEqual(6.2832);
    }
  });

  it('assigns a flowerType to every config', () => {
    const configs = generateFieldFlowerConfigs(buildInput({ count: 8 }));
    const validTypes: FieldFlowerType[] = ['dandelion', 'chamomile', 'poppy', 'wild_violet'];
    for (const fc of configs) {
      expect(validTypes).toContain(fc.flowerType);
    }
  });

  it('defaults occupant to null for every config', () => {
    const configs = generateFieldFlowerConfigs(buildInput({ count: 5 }));
    for (const fc of configs) {
      expect(fc.occupant).toBeNull();
    }
  });

  it('distributes flower types roughly evenly for a large count', () => {
    const configs = generateFieldFlowerConfigs(buildInput({ count: 200 }));
    const counts: Record<string, number> = {};
    for (const fc of configs) {
      counts[fc.flowerType] = (counts[fc.flowerType] ?? 0) + 1;
    }
    expect(counts['dandelion']).toBeGreaterThan(30);
    expect(counts['chamomile']).toBeGreaterThan(30);
    expect(counts['poppy']).toBeGreaterThan(30);
    expect(counts['wild_violet']).toBeGreaterThan(30);
  });
});

describe('validateFieldFlowerConfigs', () => {
  it('passes for valid configs', () => {
    const configs = generateFieldFlowerConfigs(buildInput({ count: 3 }));
    expect(() => validateFieldFlowerConfigs(configs, buildInput({ count: 3 }))).not.toThrow();
  });

  it('throws when count does not match', () => {
    const configs = generateFieldFlowerConfigs(buildInput({ count: 2 }));
    expect(() => validateFieldFlowerConfigs(configs, buildInput({ count: 3 }))).toThrow();
  });

  it('throws when a headerY is outside the lower band', () => {
    const input = buildInput({ count: 1 });
    const configs = generateFieldFlowerConfigs(input);
    configs[0]!.headerY = 0;
    expect(() => validateFieldFlowerConfigs(configs, input)).toThrow();
  });

  it('throws when a leafCount is out of range', () => {
    const input = buildInput({ count: 1 });
    const configs = generateFieldFlowerConfigs(input);
    configs[0]!.leafCount = 10;
    expect(() => validateFieldFlowerConfigs(configs, input)).toThrow();
  });

  it('throws when a leaf variant is out of range', () => {
    const input = buildInput({ count: 1 });
    const configs = generateFieldFlowerConfigs(input);
    configs[0]!.leafVariants = [0, 1, 2, 5] as unknown as (0 | 1 | 2 | 3)[];
    expect(() => validateFieldFlowerConfigs(configs, input)).toThrow();
  });
});
