import {
  MAX_FIELD_FLOWERS,
  MAX_LEAVES_PER_FLOWER,
  MAX_LEAF_SLOTS,
  type FieldFlowerConfig,
} from '../types';
import { createFieldFlowerBatchUniforms, chunkFieldFlowerConfigs, fillFieldFlowerBatchUniforms } from '../fieldFlowerBatch';

function buildConfig(overrides: Partial<FieldFlowerConfig> = {}): FieldFlowerConfig {
  return {
    flowerId: 0,
    flowerType: 'dandelion',
    headerX: 100,
    headerY: 200,
    offsetX: 0,
    offsetY: 0,
    offsetScale: 1,
    stemBaseX: 100,
    stemBaseY: 200,
    stemBaseWidth: 5,
    stemTopWidth: 12,
    stemVariant: 0,
    flowerVariant: 1,
    leafCount: 2,
    leafVariants: [0, 1],
    leafLengths: [30, 40],
    leafWidths: [25, 30],
    flowerSize: 50,
    ringRotation: 0.5,
    clusterShadowOffsetX: 0,
    clusterShadowOffsetY: -10,
    flowerTopShadowOffsetX: 0,
    flowerTopShadowOffsetY: -30,
    swingAmplitude: 2,
    swingSpeed: 2,
    swingPhase: 1,
    swingAngle: 0.3,
    occupant: null,
    ...overrides,
  };
}

describe('chunkFieldFlowerConfigs', () => {
  it('groups configs that share a flower type into one batch, preserving order', () => {
    const a = buildConfig({ flowerId: 0, flowerType: 'dandelion' });
    const b = buildConfig({ flowerId: 1, flowerType: 'chamomile' });
    const c = buildConfig({ flowerId: 2, flowerType: 'dandelion' });

    const batches = chunkFieldFlowerConfigs([a, b, c]);

    expect(batches).toHaveLength(2);
    expect(batches[0]).toEqual({ flowerType: 'dandelion', configs: [a, c] });
    expect(batches[1]).toEqual({ flowerType: 'chamomile', configs: [b] });
  });

  it('splits a single type into multiple batches once it exceeds MAX_FIELD_FLOWERS', () => {
    const configs = Array.from({ length: MAX_FIELD_FLOWERS + 3 }, (_, i) =>
      buildConfig({ flowerId: i, flowerType: 'poppy' }),
    );

    const batches = chunkFieldFlowerConfigs(configs);

    expect(batches).toHaveLength(2);
    expect(batches[0]!.configs).toHaveLength(MAX_FIELD_FLOWERS);
    expect(batches[1]!.configs).toHaveLength(3);
    expect(batches.every(b => b.flowerType === 'poppy')).toBe(true);
  });

  it('returns an empty array for no configs', () => {
    expect(chunkFieldFlowerConfigs([])).toEqual([]);
  });

  it('is deterministic for the same input', () => {
    const a = buildConfig({ flowerId: 0, flowerType: 'wild_violet' });
    const b = buildConfig({ flowerId: 1, flowerType: 'wild_violet' });
    expect(chunkFieldFlowerConfigs([a, b])).toEqual(chunkFieldFlowerConfigs([a, b]));
  });
});

describe('createFieldFlowerBatchUniforms', () => {
  it('pre-pads every per-flower array to MAX_FIELD_FLOWERS', () => {
    const uniforms = createFieldFlowerBatchUniforms();

    const perFlowerArrays = [
      uniforms.headerX,
      uniforms.headerY,
      uniforms.offsetX,
      uniforms.offsetY,
      uniforms.offsetScale,
      uniforms.stemBaseX,
      uniforms.stemBaseY,
      uniforms.stemBaseWidth,
      uniforms.stemTopWidth,
      uniforms.stemVariant,
      uniforms.flowerVariant,
      uniforms.leafCount,
      uniforms.flowerSize,
      uniforms.ringRotation,
      uniforms.clusterShadowOffsetX,
      uniforms.clusterShadowOffsetY,
      uniforms.flowerTopShadowOffsetX,
      uniforms.flowerTopShadowOffsetY,
    ];
    for (const arr of perFlowerArrays) {
      expect(arr).toHaveLength(MAX_FIELD_FLOWERS);
    }
  });

  it('pre-pads every leaf array to MAX_LEAF_SLOTS', () => {
    const uniforms = createFieldFlowerBatchUniforms();

    expect(uniforms.leafVariant).toHaveLength(MAX_LEAF_SLOTS);
    expect(uniforms.perLeafLength).toHaveLength(MAX_LEAF_SLOTS);
    expect(uniforms.perLeafWidth).toHaveLength(MAX_LEAF_SLOTS);
  });

  it('starts zeroed with a zero count', () => {
    const uniforms = createFieldFlowerBatchUniforms();

    expect(uniforms.dandelionCount).toBe(0);
    for (const arr of [
      ...uniforms.headerX,
      ...uniforms.offsetY,
      ...uniforms.leafVariant,
      ...uniforms.perLeafLength,
      ...uniforms.perLeafWidth,
    ]) {
      expect(arr).toBe(0);
    }
  });
});

describe('fillFieldFlowerBatchUniforms', () => {
  it('sets the count uniform to the batched config count', () => {
    const uniforms = createFieldFlowerBatchUniforms();
    const configs = [buildConfig(), buildConfig({ flowerId: 1, flowerType: 'chamomile' })];

    fillFieldFlowerBatchUniforms(uniforms, configs, { iTime: 0, boosts: undefined });

    expect(uniforms.dandelionCount).toBe(2);
  });

  it('clamps the count to MAX_FIELD_FLOWERS', () => {
    const uniforms = createFieldFlowerBatchUniforms();
    const configs = Array.from({ length: MAX_FIELD_FLOWERS + 1 }, (_, i) =>
      buildConfig({ flowerId: i, headerX: i }),
    );

    fillFieldFlowerBatchUniforms(uniforms, configs, { iTime: 0, boosts: undefined });

    expect(uniforms.dandelionCount).toBe(MAX_FIELD_FLOWERS);
    expect(uniforms.headerX).toHaveLength(MAX_FIELD_FLOWERS);
    expect(uniforms.headerX[MAX_FIELD_FLOWERS - 1]).toBe(MAX_FIELD_FLOWERS - 1);
  });

  it('fills per-flower uniforms at the config index', () => {
    const uniforms = createFieldFlowerBatchUniforms();
    const configs = [
      buildConfig({ flowerId: 0, headerX: 10, headerY: 20, flowerSize: 50, leafCount: 2 }),
      buildConfig({ flowerId: 1, headerX: 30, headerY: 40, flowerSize: 60, leafCount: 0 }),
    ];

    fillFieldFlowerBatchUniforms(uniforms, configs, { iTime: 0, boosts: undefined });

    expect(uniforms.headerX[0]).toBe(10);
    expect(uniforms.headerY[0]).toBe(20);
    expect(uniforms.flowerSize[0]).toBe(50);
    expect(uniforms.headerX[1]).toBe(30);
    expect(uniforms.headerY[1]).toBe(40);
    expect(uniforms.flowerSize[1]).toBe(60);
  });

  it('fills leaf uniforms in slot order i * MAX_LEAVES_PER_FLOWER + j and zero-pads the rest', () => {
    const uniforms = createFieldFlowerBatchUniforms();
    const configs = [
      buildConfig({
        flowerId: 0,
        leafCount: 2,
        leafVariants: [0, 3],
        leafLengths: [30, 45],
        leafWidths: [25, 31],
      }),
      buildConfig({
        flowerId: 1,
        leafCount: 1,
        leafVariants: [1],
        leafLengths: [35],
        leafWidths: [27],
      }),
    ];

    fillFieldFlowerBatchUniforms(uniforms, configs, { iTime: 0, boosts: undefined });

    const slot0 = 0 * MAX_LEAVES_PER_FLOWER;
    const slot1 = 1 * MAX_LEAVES_PER_FLOWER;
    expect(uniforms.leafVariant[slot0]).toBe(0);
    expect(uniforms.leafVariant[slot0 + 1]).toBe(3);
    expect(uniforms.perLeafLength[slot0]).toBe(30);
    expect(uniforms.perLeafLength[slot0 + 1]).toBe(45);
    expect(uniforms.perLeafWidth[slot0 + 1]).toBe(31);
    expect(uniforms.leafVariant[slot1]).toBe(1);
    expect(uniforms.perLeafLength[slot1]).toBe(35);
    expect(uniforms.perLeafWidth[slot1]).toBe(27);
    expect(uniforms.leafVariant[slot1 + 1]).toBe(0);
    expect(uniforms.perLeafLength[slot1 + 1]).toBe(0);
    expect(uniforms.leafVariant[MAX_LEAF_SLOTS - 1]).toBe(0);
  });

  it('applies the swing to offset and cluster shadow offsets', () => {
    const uniforms = createFieldFlowerBatchUniforms();
    const configs = [
      buildConfig({
        flowerId: 0,
        offsetX: 4,
        offsetY: 5,
        clusterShadowOffsetX: 2,
        clusterShadowOffsetY: -10,
        swingAmplitude: 2,
        swingSpeed: 2,
        swingPhase: 1,
        swingAngle: 0.3,
      }),
    ];

    fillFieldFlowerBatchUniforms(uniforms, configs, { iTime: 0, boosts: undefined });

    expect(uniforms.offsetX[0]).toBeCloseTo(4 + 1.6077758726548839, 12);
    expect(uniforms.offsetY[0]).toBeCloseTo(5 + 0.497343358659901, 12);
    expect(uniforms.clusterShadowOffsetX[0]).toBeCloseTo(2 + 0.6431103490619536, 12);
    expect(uniforms.clusterShadowOffsetY[0]).toBeCloseTo(-10 + 0.19893734346396041, 12);
  });

  it('adds the flowerSwingBoost for the config flowerId', () => {
    const uniforms = createFieldFlowerBatchUniforms();
    const configs = [
      buildConfig({ flowerId: 3, offsetX: 0, offsetY: 0 }),
    ];

    fillFieldFlowerBatchUniforms(uniforms, configs, {
      iTime: 0,
      boosts: [0, 0, 0, 10],
    });

    const swingX = 1.6077758726548839 * 6;
    const swingY = 0.497343358659901 * 6;
    expect(uniforms.offsetX[0]).toBeCloseTo(swingX, 12);
    expect(uniforms.offsetY[0]).toBeCloseTo(swingY, 12);
  });

  it('mutates the same pre-padded arrays in place across fills', () => {
    const uniforms = createFieldFlowerBatchUniforms();
    const originalArrays = [
      uniforms.headerX,
      uniforms.offsetY,
      uniforms.leafVariant,
      uniforms.perLeafLength,
      uniforms.perLeafWidth,
    ];
    const configs = [buildConfig({ flowerId: 0 })];

    fillFieldFlowerBatchUniforms(uniforms, configs, { iTime: 0, boosts: undefined });
    fillFieldFlowerBatchUniforms(uniforms, configs, { iTime: 1, boosts: undefined });

    expect(uniforms.headerX).toBe(originalArrays[0]);
    expect(uniforms.offsetY).toBe(originalArrays[1]);
    expect(uniforms.leafVariant).toBe(originalArrays[2]);
    expect(uniforms.perLeafLength).toBe(originalArrays[3]);
    expect(uniforms.perLeafWidth).toBe(originalArrays[4]);
  });
});
