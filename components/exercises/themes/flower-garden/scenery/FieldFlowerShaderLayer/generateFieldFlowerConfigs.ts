import type { Rng } from '../BushShaderLayer/helpers/seededRandom';
import type { FieldFlowerConfig, FieldFlowerType, LeafVariant } from './types';

const MAX_PLACEMENT_ATTEMPTS = 300;
const FLOWER_TYPES: FieldFlowerType[] = [
  'dandelion',
  'chamomile',
  'poppy',
  'wild_violet',
];

export type GenerateFieldFlowerConfigsInput = {
  screenWidth: number;
  screenHeight: number;
  rng: Rng;
  count: number;
  minLeaves: number;
  maxLeaves: number;
  lowerScreenFraction: number;
  minFlowerSize: number;
  maxFlowerSize: number;
  minLeafLength: number;
  maxLeafLength: number;
  minLeafWidth: number;
  maxLeafWidth: number;
  stemBaseWidth: number;
  stemTopWidth: number;
  minDistance: number;
  offsetX: number;
  offsetY: number;
  offsetScale: number;
  clusterShadowOffsetX: number;
  clusterShadowOffsetY: number;
  flowerTopShadowOffsetX: number;
  flowerTopShadowOffsetY: number;
  bottomPadding: number;
};

const LEAF_VARIANT_COUNT = 4;

function randomIntInRange(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

function distributeFlowerTypes(count: number, rng: Rng): FieldFlowerType[] {
  const perType = Math.floor(count / FLOWER_TYPES.length);
  const remainder = count - perType * FLOWER_TYPES.length;
  const types: FieldFlowerType[] = [];

  for (const t of FLOWER_TYPES) {
    for (let i = 0; i < perType; i++) {
      types.push(t);
    }
  }

  const shuffled: FieldFlowerType[] = [];
  const pool = [...FLOWER_TYPES];
  while (pool.length > 0) {
    const idx = Math.floor(rng() * pool.length);
    shuffled.push(pool[idx]!);
    pool.splice(idx, 1);
  }

  for (let i = 0; i < remainder; i++) {
    types.push(shuffled[i % shuffled.length]!);
  }

  for (let i = types.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [types[i], types[j]] = [types[j]!, types[i]!];
  }

  return types;
}

export function validateFieldFlowerConfigs(
  configs: FieldFlowerConfig[],
  input: GenerateFieldFlowerConfigsInput,
): void {
  if (configs.length !== input.count) {
    throw new Error(
      `validateFieldFlowerConfigs: expected ${input.count} configs, got ${configs.length}`,
    );
  }

  const lowerYStart = input.screenHeight * (1 - input.lowerScreenFraction);
  const upperYEnd = input.screenHeight - input.bottomPadding;
  for (const fc of configs) {
    if (fc.headerY < lowerYStart || fc.headerY > upperYEnd) {
      throw new Error(
        `validateFieldFlowerConfigs: flower ${fc.flowerId} headerY ${fc.headerY} outside lower ${input.lowerScreenFraction} band`,
      );
    }
    if (fc.headerX < 0 || fc.headerX > input.screenWidth) {
      throw new Error(
        `validateFieldFlowerConfigs: flower ${fc.flowerId} headerX ${fc.headerX} outside screen`,
      );
    }
    if (fc.leafCount < input.minLeaves || fc.leafCount > input.maxLeaves) {
      throw new Error(
        `validateFieldFlowerConfigs: flower ${fc.flowerId} leafCount ${fc.leafCount} out of range [${input.minLeaves}, ${input.maxLeaves}]`,
      );
    }
    for (const v of fc.leafVariants) {
      if (v < 0 || v >= LEAF_VARIANT_COUNT) {
        throw new Error(
          `validateFieldFlowerConfigs: flower ${fc.flowerId} has leaf variant ${v} out of range`,
        );
      }
    }
    if (fc.stemVariant < 0 || fc.stemVariant >= LEAF_VARIANT_COUNT) {
      throw new Error(
        `validateFieldFlowerConfigs: flower ${fc.flowerId} has stemVariant ${fc.stemVariant} out of range`,
      );
    }
    if (fc.flowerVariant < 0 || fc.flowerVariant >= LEAF_VARIANT_COUNT) {
      throw new Error(
        `validateFieldFlowerConfigs: flower ${fc.flowerId} has flowerVariant ${fc.flowerVariant} out of range`,
      );
    }
  }
}

export function generateFieldFlowerConfigs(
  input: GenerateFieldFlowerConfigsInput,
): FieldFlowerConfig[] {
  const {
    screenWidth,
    screenHeight,
    rng,
    count,
    minLeaves,
    maxLeaves,
    lowerScreenFraction,
    minFlowerSize,
    maxFlowerSize,
    minLeafLength,
    maxLeafLength,
    minLeafWidth,
    maxLeafWidth,
    stemBaseWidth,
    stemTopWidth,
    minDistance,
    offsetX,
    offsetY,
    offsetScale,
    clusterShadowOffsetX,
    clusterShadowOffsetY,
    flowerTopShadowOffsetX,
    flowerTopShadowOffsetY,
    bottomPadding,
  } = input;

  if (count <= 0) return [];

  const flowerTypes = distributeFlowerTypes(count, rng);

  const configs: FieldFlowerConfig[] = [];
  const lowerYStart = screenHeight * (1 - lowerScreenFraction);
  const xMin = screenWidth * 0.1;
  const xRange = screenWidth * 0.8;
  const yMaxExtent = screenHeight - lowerYStart - bottomPadding;

  function randomPosition(): { x: number; y: number } {
    return {
      x: xMin + rng() * xRange,
      y: lowerYStart + rng() * yMaxExtent,
    };
  }

  function tooClose(x: number, y: number): boolean {
    for (const existing of configs) {
      const dx = existing.headerX - x;
      const dy = existing.headerY - y;
      if (dx * dx + dy * dy < minDistance * minDistance) return true;
    }
    return false;
  }

  function randomFloatInRange(rng: Rng, min: number, max: number): number {
    return min + rng() * (max - min);
  }

  for (let i = 0; i < count; i++) {
    const leafCount = randomIntInRange(rng, minLeaves, maxLeaves);
    const leafVariants: (0 | 1 | 2 | 3)[] = [];
    const leafLengths: number[] = [];
    const leafWidths: number[] = [];
    for (let j = 0; j < leafCount; j++) {
      leafVariants.push(randomIntInRange(rng, 0, 3) as 0 | 1 | 2 | 3);
      leafLengths.push(randomFloatInRange(rng, minLeafLength, maxLeafLength));
      leafWidths.push(randomFloatInRange(rng, minLeafWidth, maxLeafWidth));
    }

    let hx = 0;
    let hy = 0;
    let placed = false;
    for (let attempt = 0; attempt < MAX_PLACEMENT_ATTEMPTS; attempt++) {
      const pos = randomPosition();
      if (!tooClose(pos.x, pos.y)) {
        hx = pos.x;
        hy = pos.y;
        placed = true;
        break;
      }
    }
    if (!placed) {
      let bestDist = -1;
      let bestX = 0;
      let bestY = 0;
      for (let s = 0; s < 50; s++) {
        const pos = randomPosition();
        let minD = Infinity;
        for (const existing of configs) {
          const dx = existing.headerX - pos.x;
          const dy = existing.headerY - pos.y;
          const d = dx * dx + dy * dy;
          if (d < minD) minD = d;
        }
        if (minD > bestDist) {
          bestDist = minD;
          bestX = pos.x;
          bestY = pos.y;
        }
      }
      hx = bestX;
      hy = bestY;
    }

    configs.push({
      flowerId: i,
      flowerType: flowerTypes[i]!,
      headerX: hx,
      headerY: hy,
      offsetX,
      offsetY,
      offsetScale,
      stemBaseX: hx,
      stemBaseY: hy,
      stemBaseWidth,
      stemTopWidth,
      stemVariant: randomIntInRange(rng, 0, 3) as LeafVariant,
      flowerVariant: randomIntInRange(rng, 0, 3) as LeafVariant,
      leafCount,
      leafVariants,
      leafLengths,
      leafWidths,
      flowerSize: randomFloatInRange(rng, minFlowerSize, maxFlowerSize),
      ringRotation: rng() * 6.2831853,
      clusterShadowOffsetX,
      clusterShadowOffsetY,
      flowerTopShadowOffsetX,
      flowerTopShadowOffsetY,
      occupant: null,
    });
  }

  validateFieldFlowerConfigs(configs, input);
  return configs;
}
