import type { FieldFlowerConfig, FieldFlowerType, FieldFlowerUniforms } from './types';
import { MAX_FIELD_FLOWERS, MAX_LEAF_SLOTS, MAX_LEAVES_PER_FLOWER } from './types';

export type FieldFlowerBatch = {
  flowerType: FieldFlowerType;
  configs: FieldFlowerConfig[];
};

export type FieldFlowerSwingFrame = {
  iTime: number;
  boosts: readonly number[] | undefined;
};

export function createFieldFlowerBatchUniforms(): FieldFlowerUniforms {
  const zeroFlowerArray = (): number[] => new Array(MAX_FIELD_FLOWERS).fill(0);
  const zeroLeafArray = (): number[] => new Array(MAX_LEAF_SLOTS).fill(0);
  return {
    dandelionCount: 0,
    headerX: zeroFlowerArray(),
    headerY: zeroFlowerArray(),
    offsetX: zeroFlowerArray(),
    offsetY: zeroFlowerArray(),
    offsetScale: zeroFlowerArray(),
    stemBaseX: zeroFlowerArray(),
    stemBaseY: zeroFlowerArray(),
    stemBaseWidth: zeroFlowerArray(),
    stemTopWidth: zeroFlowerArray(),
    stemVariant: zeroFlowerArray(),
    flowerVariant: zeroFlowerArray(),
    leafCount: zeroFlowerArray(),
    leafVariant: zeroLeafArray(),
    perLeafLength: zeroLeafArray(),
    perLeafWidth: zeroLeafArray(),
    flowerSize: zeroFlowerArray(),
    ringRotation: zeroFlowerArray(),
    clusterShadowOffsetX: zeroFlowerArray(),
    clusterShadowOffsetY: zeroFlowerArray(),
    flowerTopShadowOffsetX: zeroFlowerArray(),
    flowerTopShadowOffsetY: zeroFlowerArray(),
  };
}

export function fillFieldFlowerBatchUniforms(
  uniforms: FieldFlowerUniforms,
  configs: readonly FieldFlowerConfig[],
  frame: FieldFlowerSwingFrame,
): void {
  'worklet';
  const count = Math.min(configs.length, MAX_FIELD_FLOWERS);
  uniforms.dandelionCount = count;
  for (let i = 0; i < count; i++) {
    const config = configs[i]!;
    const boost = frame.boosts?.[config.flowerId] ?? 0;
    const effectiveAmp = config.swingAmplitude + boost;
    const swing =
      Math.sin(frame.iTime * config.swingSpeed + config.swingPhase) * effectiveAmp;
    const cosA = Math.cos(config.swingAngle);
    const sinA = Math.sin(config.swingAngle);
    const swingX = swing * cosA;
    const swingY = swing * sinA;
    const leafSwingX = swingX * 0.4;
    const leafSwingY = swingY * 0.4;

    uniforms.headerX[i] = config.headerX;
    uniforms.headerY[i] = config.headerY;
    uniforms.offsetX[i] = config.offsetX + swingX;
    uniforms.offsetY[i] = config.offsetY + swingY;
    uniforms.offsetScale[i] = config.offsetScale;
    uniforms.stemBaseX[i] = config.stemBaseX;
    uniforms.stemBaseY[i] = config.stemBaseY;
    uniforms.stemBaseWidth[i] = config.stemBaseWidth;
    uniforms.stemTopWidth[i] = config.stemTopWidth;
    uniforms.stemVariant[i] = config.stemVariant;
    uniforms.flowerVariant[i] = config.flowerVariant;
    uniforms.leafCount[i] = config.leafCount;
    uniforms.flowerSize[i] = config.flowerSize;
    uniforms.ringRotation[i] = config.ringRotation;
    uniforms.clusterShadowOffsetX[i] = config.clusterShadowOffsetX + leafSwingX;
    uniforms.clusterShadowOffsetY[i] = config.clusterShadowOffsetY + leafSwingY;
    uniforms.flowerTopShadowOffsetX[i] = config.flowerTopShadowOffsetX;
    uniforms.flowerTopShadowOffsetY[i] = config.flowerTopShadowOffsetY;

    const slot = i * MAX_LEAVES_PER_FLOWER;
    for (let j = 0; j < config.leafCount; j++) {
      uniforms.leafVariant[slot + j] = config.leafVariants[j] ?? 0;
      uniforms.perLeafLength[slot + j] = config.leafLengths[j] ?? 0;
      uniforms.perLeafWidth[slot + j] = config.leafWidths[j] ?? 0;
    }
  }
}

export function chunkFieldFlowerConfigs(
  configs: readonly FieldFlowerConfig[],
): FieldFlowerBatch[] {
  const byType = new Map<FieldFlowerType, FieldFlowerConfig[]>();
  for (const config of configs) {
    const list = byType.get(config.flowerType);
    if (list != null) {
      list.push(config);
    } else {
      byType.set(config.flowerType, [config]);
    }
  }

  const batches: FieldFlowerBatch[] = [];
  for (const [flowerType, list] of byType) {
    for (let i = 0; i < list.length; i += MAX_FIELD_FLOWERS) {
      batches.push({ flowerType, configs: list.slice(i, i + MAX_FIELD_FLOWERS) });
    }
  }
  return batches;
}
