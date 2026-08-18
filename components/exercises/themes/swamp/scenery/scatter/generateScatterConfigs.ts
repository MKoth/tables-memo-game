import type { Rng } from './seededRandom';
import { MAX_SCATTER_VARIANTS, type ScatterConfig, type ScatterTint } from './types';

const MAX_PLACEMENT_ATTEMPTS = 300;

export type GenerateScatterInput = {
  screenWidth: number;
  screenHeight: number;
  rng: Rng;
  count: number;
  variantCount: number;
  minSize: number;
  maxSize: number;
  minRotation: number;
  maxRotation: number;
  margin: number;
  minDistance: number;
  tints: readonly ScatterTint[];
  tintStrength: number;
  minBrightness: number;
  maxBrightness: number;
  minOpacity: number;
  maxOpacity: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
  shadowScale: number;
  shadowOpacity: number;
  shadowColor: ScatterTint;
};

function randomFloatInRange(rng: Rng, min: number, max: number): number {
  return min + rng() * (max - min);
}

function randomIntInRange(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

function tooClose(
  x: number,
  y: number,
  existing: readonly { x: number; y: number }[],
  minDistance: number,
): boolean {
  for (const other of existing) {
    const dx = other.x - x;
    const dy = other.y - y;
    if (dx * dx + dy * dy < minDistance * minDistance) {
      return true;
    }
  }
  return false;
}

function buildSprite(
  rng: Rng,
  spriteId: number,
  x: number,
  y: number,
  input: GenerateScatterInput,
): ScatterConfig {
  const tint =
    input.tints.length > 0
      ? input.tints[randomIntInRange(rng, 0, input.tints.length - 1)] ?? null
      : null;
  return {
    spriteId,
    x,
    y,
    size: randomFloatInRange(rng, input.minSize, input.maxSize),
    rotation: randomFloatInRange(rng, input.minRotation, input.maxRotation),
    variant: randomIntInRange(rng, 0, input.variantCount - 1),
    opacity: randomFloatInRange(rng, input.minOpacity, input.maxOpacity),
    brightness: randomFloatInRange(rng, input.minBrightness, input.maxBrightness),
    tint,
    tintStrength: input.tintStrength,
    shadowOffsetX: input.shadowOffsetX,
    shadowOffsetY: input.shadowOffsetY,
    shadowScale: input.shadowScale,
    shadowOpacity: input.shadowOpacity,
    shadowColor: input.shadowColor,
  };
}

export function generateScatterConfigs(
  input: GenerateScatterInput,
): ScatterConfig[] {
  if (input.count <= 0) {
    return [];
  }

  const configs: ScatterConfig[] = [];
  const placed: { x: number; y: number }[] = [];
  const variantCount = Math.max(1, Math.min(input.variantCount, MAX_SCATTER_VARIANTS));

  const clamped = { ...input, variantCount };

  for (let i = 0; i < clamped.count; i++) {
    const pos = rejectSample(clamped.rng, placed, clamped);
    placed.push({ x: pos.x, y: pos.y });
    configs.push(buildSprite(clamped.rng, configs.length, pos.x, pos.y, clamped));
  }

  return configs;
}

function rejectSample(
  rng: Rng,
  existing: readonly { x: number; y: number }[],
  input: GenerateScatterInput,
): { x: number; y: number } {
  for (let attempt = 0; attempt < MAX_PLACEMENT_ATTEMPTS; attempt++) {
    const x = randomFloatInRange(rng, input.margin, input.screenWidth - input.margin);
    const y = randomFloatInRange(rng, input.margin, input.screenHeight - input.margin);
    if (!tooClose(x, y, existing, input.minDistance)) {
      return { x, y };
    }
  }

  let bestDist = -1;
  let bestX = input.screenWidth / 2;
  let bestY = input.screenHeight / 2;
  for (let s = 0; s < 50; s++) {
    const x = randomFloatInRange(rng, input.margin, input.screenWidth - input.margin);
    const y = randomFloatInRange(rng, input.margin, input.screenHeight - input.margin);
    let minD = Infinity;
    for (const other of existing) {
      const dx = other.x - x;
      const dy = other.y - y;
      const d = dx * dx + dy * dy;
      if (d < minD) {
        minD = d;
      }
    }
    if (minD > bestDist) {
      bestDist = minD;
      bestX = x;
      bestY = y;
    }
  }
  return { x: bestX, y: bestY };
}
