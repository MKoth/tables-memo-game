import type { Rng } from '../BushShaderLayer/helpers/seededRandom';
import type { DandelionConfig, LeafVariant } from './types';

const MAX_PLACEMENT_ATTEMPTS = 300;

export type GenerateDandelionConfigsInput = {
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
};

const LEAF_VARIANT_COUNT = 4;

function randomIntInRange(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

export function validateDandelionConfigs(
  configs: DandelionConfig[],
  input: GenerateDandelionConfigsInput,
): void {
  if (configs.length !== input.count) {
    throw new Error(
      `validateDandelionConfigs: expected ${input.count} configs, got ${configs.length}`,
    );
  }

  const lowerYStart = input.screenHeight * (1 - input.lowerScreenFraction);
  for (const dc of configs) {
    if (dc.headerY < lowerYStart || dc.headerY > input.screenHeight) {
      throw new Error(
        `validateDandelionConfigs: dandelion ${dc.dandelionId} headerY ${dc.headerY} outside lower ${input.lowerScreenFraction} band`,
      );
    }
    if (dc.headerX < 0 || dc.headerX > input.screenWidth) {
      throw new Error(
        `validateDandelionConfigs: dandelion ${dc.dandelionId} headerX ${dc.headerX} outside screen`,
      );
    }
    if (dc.leafCount < input.minLeaves || dc.leafCount > input.maxLeaves) {
      throw new Error(
        `validateDandelionConfigs: dandelion ${dc.dandelionId} leafCount ${dc.leafCount} out of range [${input.minLeaves}, ${input.maxLeaves}]`,
      );
    }
    for (const v of dc.leafVariants) {
      if (v < 0 || v >= LEAF_VARIANT_COUNT) {
        throw new Error(
          `validateDandelionConfigs: dandelion ${dc.dandelionId} has leaf variant ${v} out of range`,
        );
      }
    }
    if (dc.stemVariant < 0 || dc.stemVariant >= LEAF_VARIANT_COUNT) {
      throw new Error(
        `validateDandelionConfigs: dandelion ${dc.dandelionId} has stemVariant ${dc.stemVariant} out of range`,
      );
    }
    if (dc.flowerVariant < 0 || dc.flowerVariant >= LEAF_VARIANT_COUNT) {
      throw new Error(
        `validateDandelionConfigs: dandelion ${dc.dandelionId} has flowerVariant ${dc.flowerVariant} out of range`,
      );
    }
  }
}

export function generateDandelionConfigs(
  input: GenerateDandelionConfigsInput,
): DandelionConfig[] {
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
  } = input;

  if (count <= 0) return [];

  const configs: DandelionConfig[] = [];
  const lowerYStart = screenHeight * (1 - lowerScreenFraction);
  const xMin = screenWidth * 0.1;
  const xRange = screenWidth * 0.8;
  const yMaxExtent = (screenHeight - lowerYStart) * 0.6;

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
      dandelionId: i,
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
    });
  }

  validateDandelionConfigs(configs, input);
  return configs;
}
