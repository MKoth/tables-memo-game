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
  ovalWidth: number;
  ovalHeight: number;
  ovalInsideProbability: number;
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

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function randomFloatInRange(rng: Rng, min: number, max: number): number {
  return min + rng() * (max - min);
}

function randomIntInRange(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

function isInsideOval(
  x: number,
  y: number,
  centerX: number,
  centerY: number,
  semiAxisX: number,
  semiAxisY: number,
): boolean {
  const dx = (x - centerX) / semiAxisX;
  const dy = (y - centerY) / semiAxisY;
  return dx * dx + dy * dy <= 1;
}

function randomInsideOval(
  rng: Rng,
  centerX: number,
  centerY: number,
  semiAxisX: number,
  semiAxisY: number,
  margin: number,
  screenWidth: number,
  screenHeight: number,
): { x: number; y: number } {
  const left = Math.max(centerX - semiAxisX, margin);
  const right = Math.min(centerX + semiAxisX, screenWidth - margin);
  const top = Math.max(centerY - semiAxisY, margin);
  const bottom = Math.min(centerY + semiAxisY, screenHeight - margin);
  for (let i = 0; i < 300; i++) {
    const x = randomFloatInRange(rng, left, right);
    const y = randomFloatInRange(rng, top, bottom);
    if (isInsideOval(x, y, centerX, centerY, semiAxisX, semiAxisY)) {
      return { x, y };
    }
  }
  return { x: centerX, y: centerY };
}

function randomOutsideOval(
  rng: Rng,
  centerX: number,
  centerY: number,
  semiAxisX: number,
  semiAxisY: number,
  margin: number,
  screenWidth: number,
  screenHeight: number,
): { x: number; y: number } {
  for (let i = 0; i < 300; i++) {
    const x = randomFloatInRange(rng, margin, screenWidth - margin);
    const y = randomFloatInRange(rng, margin, screenHeight - margin);
    if (!isInsideOval(x, y, centerX, centerY, semiAxisX, semiAxisY)) {
      return { x, y };
    }
  }
  return { x: margin, y: margin };
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
  const ovalWidth = clamp(input.ovalWidth ?? 0, 0, 1);
  const ovalHeight = clamp(input.ovalHeight ?? 0, 0, 1);
  const ovalInsideProbability = clamp(input.ovalInsideProbability ?? 0.5, 0, 1);

  const hasOval = ovalWidth > 0 && ovalHeight > 0;
  const centerX = input.screenWidth / 2;
  const centerY = input.screenHeight / 2;
  const semiAxisX = (ovalWidth * input.screenWidth) / 2;
  const semiAxisY = (ovalHeight * input.screenHeight) / 2;

  for (let attempt = 0; attempt < MAX_PLACEMENT_ATTEMPTS; attempt++) {
    let x: number;
    let y: number;

    if (hasOval && rng() < ovalInsideProbability) {
      ({ x, y } = randomInsideOval(
        rng,
        centerX,
        centerY,
        semiAxisX,
        semiAxisY,
        input.margin,
        input.screenWidth,
        input.screenHeight,
      ));
    } else if (hasOval) {
      ({ x, y } = randomOutsideOval(
        rng,
        centerX,
        centerY,
        semiAxisX,
        semiAxisY,
        input.margin,
        input.screenWidth,
        input.screenHeight,
      ));
    } else {
      x = randomFloatInRange(rng, input.margin, input.screenWidth - input.margin);
      y = randomFloatInRange(rng, input.margin, input.screenHeight - input.margin);
    }

    if (!tooClose(x, y, existing, input.minDistance)) {
      return { x, y };
    }
  }

  let bestDist = -1;
  let bestX = input.screenWidth / 2;
  let bestY = input.screenHeight / 2;
  for (let s = 0; s < 50; s++) {
    let x: number;
    let y: number;

    if (hasOval && rng() < ovalInsideProbability) {
      ({ x, y } = randomInsideOval(
        rng,
        centerX,
        centerY,
        semiAxisX,
        semiAxisY,
        input.margin,
        input.screenWidth,
        input.screenHeight,
      ));
    } else if (hasOval) {
      ({ x, y } = randomOutsideOval(
        rng,
        centerX,
        centerY,
        semiAxisX,
        semiAxisY,
        input.margin,
        input.screenWidth,
        input.screenHeight,
      ));
    } else {
      x = randomFloatInRange(rng, input.margin, input.screenWidth - input.margin);
      y = randomFloatInRange(rng, input.margin, input.screenHeight - input.margin);
    }

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
