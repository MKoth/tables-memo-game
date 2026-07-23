import { createRng } from '../../BushShaderLayer/helpers/seededRandom';
import {
  generateDandelionConfigs,
  validateDandelionConfigs,
  type GenerateDandelionConfigsInput,
} from '../generateDandelionConfigs';

const SCREEN_W = 400;
const SCREEN_H = 800;
const LOWER_FRACTION = 0.5;

function buildInput(
  overrides: Partial<GenerateDandelionConfigsInput> = {},
): GenerateDandelionConfigsInput {
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
  };
}

describe('generateDandelionConfigs', () => {
  it('produces the requested count of dandelions', () => {
    const configs = generateDandelionConfigs(buildInput({ count: 3 }));
    expect(configs).toHaveLength(3);
  });

  it('enforces minDistance between dandelion headers', () => {
    const minDist = 100;
    const configs = generateDandelionConfigs(buildInput({ count: 5, minDistance: minDist }));
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
    const configs = generateDandelionConfigs(buildInput({ count: 0 }));
    expect(configs).toHaveLength(0);
  });

  it('places every header inside the lower band of the screen', () => {
    const input = buildInput({ count: 5 });
    const configs = generateDandelionConfigs(input);
    const lowerYStart = SCREEN_H * (1 - LOWER_FRACTION);
    for (const dc of configs) {
      expect(dc.headerY).toBeGreaterThanOrEqual(lowerYStart);
      expect(dc.headerY).toBeLessThanOrEqual(SCREEN_H);
      expect(dc.headerX).toBeGreaterThanOrEqual(0);
      expect(dc.headerX).toBeLessThanOrEqual(SCREEN_W);
    }
  });

  it('gives every dandelion a leafCount in [5, 7]', () => {
    const configs = generateDandelionConfigs(buildInput({ count: 8 }));
    for (const dc of configs) {
      expect(dc.leafCount).toBeGreaterThanOrEqual(5);
      expect(dc.leafCount).toBeLessThanOrEqual(7);
    }
  });

  it('gives every leaf a variant in [0, 3]', () => {
    const configs = generateDandelionConfigs(buildInput({ count: 8 }));
    for (const dc of configs) {
      for (const v of dc.leafVariants) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(3);
      }
    }
  });

  it('matches leafVariants length to leafCount', () => {
    const configs = generateDandelionConfigs(buildInput({ count: 5 }));
    for (const dc of configs) {
      expect(dc.leafVariants).toHaveLength(dc.leafCount);
    }
  });

  it('gives every dandelion offsetX/offsetY=0 and offsetScale=1', () => {
    const configs = generateDandelionConfigs(buildInput({ count: 4 }));
    for (const dc of configs) {
      expect(dc.offsetX).toBe(0);
      expect(dc.offsetY).toBe(0);
      expect(dc.offsetScale).toBe(1);
    }
  });

  it('places stemBaseX == headerX (same point, zero-length stem)', () => {
    const configs = generateDandelionConfigs(buildInput({ count: 5 }));
    for (const dc of configs) {
      expect(dc.stemBaseX).toBe(dc.headerX);
      expect(dc.stemBaseY).toBe(dc.headerY);
    }
  });

  it('is deterministic with the same seed', () => {
    const seed = 0xabc;
    const rng1 = createRng(seed);
    const rng2 = createRng(seed);
    const a = generateDandelionConfigs(buildInput({ rng: rng1 }));
    const b = generateDandelionConfigs(buildInput({ rng: rng2 }));
    expect(a).toEqual(b);
  });

  it('produces different configs with a different seed', () => {
    const a = generateDandelionConfigs(buildInput({ rng: createRng(1) }));
    const b = generateDandelionConfigs(buildInput({ rng: createRng(2) }));
    expect(a).not.toEqual(b);
  });

  it('sets a ringRotation for every dandelion', () => {
    const configs = generateDandelionConfigs(buildInput({ count: 6 }));
    for (const dc of configs) {
      expect(dc.ringRotation).toBeGreaterThanOrEqual(0);
      expect(dc.ringRotation).toBeLessThanOrEqual(6.2832);
    }
  });
});

describe('validateDandelionConfigs', () => {
  it('passes for valid configs', () => {
    const configs = generateDandelionConfigs(buildInput({ count: 3 }));
    expect(() => validateDandelionConfigs(configs, buildInput({ count: 3 }))).not.toThrow();
  });

  it('throws when count does not match', () => {
    const configs = generateDandelionConfigs(buildInput({ count: 2 }));
    expect(() => validateDandelionConfigs(configs, buildInput({ count: 3 }))).toThrow();
  });

  it('throws when a headerY is outside the lower band', () => {
    const input = buildInput({ count: 1 });
    const configs = generateDandelionConfigs(input);
    configs[0]!.headerY = 0;
    expect(() => validateDandelionConfigs(configs, input)).toThrow();
  });

  it('throws when a leafCount is out of range', () => {
    const input = buildInput({ count: 1 });
    const configs = generateDandelionConfigs(input);
    configs[0]!.leafCount = 10;
    expect(() => validateDandelionConfigs(configs, input)).toThrow();
  });

  it('throws when a leaf variant is out of range', () => {
    const input = buildInput({ count: 1 });
    const configs = generateDandelionConfigs(input);
    configs[0]!.leafVariants = [0, 1, 2, 5] as unknown as (0 | 1 | 2 | 3)[];
    expect(() => validateDandelionConfigs(configs, input)).toThrow();
  });
});
