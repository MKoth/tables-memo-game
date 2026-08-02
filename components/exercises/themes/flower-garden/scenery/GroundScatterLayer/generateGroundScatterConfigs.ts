import type { Rng } from '../BushShaderLayer/helpers/seededRandom';
import type { GroundScatterConfig, GroundScatterKind, GroundScatterTint } from './types';

const MAX_PLACEMENT_ATTEMPTS = 300;

export type GroundScatterZoneRect = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type GenerateGroundScatterConfigsInput = {
  kind: GroundScatterKind;
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
  edgeWeights: readonly [number, number, number, number];
  edgeBandFalloff: number;
  maxEdgeDistance: number;
  clusterProbability: number;
  minClusterSize: number;
  maxClusterSize: number;
  clusterRadiusMin: number;
  clusterRadiusMax: number;
  zone: GroundScatterZoneRect | null;
  tints: readonly GroundScatterTint[];
  tintStrength: number;
  minBrightness: number;
  maxBrightness: number;
  minOpacity: number;
  maxOpacity: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
  shadowScale: number;
  shadowOpacity: number;
  shadowColor: GroundScatterTint;
};

export function validateGroundScatterConfigs(
  configs: GroundScatterConfig[],
  input: GenerateGroundScatterConfigsInput,
): void {
  if (configs.length !== input.count) {
    throw new Error(
      `validateGroundScatterConfigs: expected ${input.count} configs, got ${configs.length}`,
    );
  }
  for (const config of configs) {
    if (
      config.x < 0 ||
      config.x > input.screenWidth ||
      config.y < 0 ||
      config.y > input.screenHeight
    ) {
      throw new Error(
        `validateGroundScatterConfigs: sprite ${config.spriteId} at (${config.x}, ${config.y}) outside screen`,
      );
    }
    if (config.variant < 0 || config.variant >= input.variantCount) {
      throw new Error(
        `validateGroundScatterConfigs: sprite ${config.spriteId} has variant ${config.variant} out of range`,
      );
    }
    if (config.tint != null && input.tints.length === 0) {
      throw new Error(
        `validateGroundScatterConfigs: sprite ${config.spriteId} has tint but no tints provided`,
      );
    }
  }
  if (input.kind === 'edge') {
    for (const config of configs) {
      const edgeDist = Math.min(
        config.x,
        input.screenWidth - config.x,
        config.y,
        input.screenHeight - config.y,
      );
      const tolerance = input.maxEdgeDistance + input.clusterRadiusMax + input.margin;
      if (edgeDist > tolerance + 1e-6) {
        throw new Error(
          `validateGroundScatterConfigs: edge sprite ${config.spriteId} at distance ${edgeDist} exceeds ${tolerance}`,
        );
      }
    }
  }
  if (input.kind === 'band') {
    const zone = input.zone;
    if (zone != null) {
      for (const config of configs) {
        if (
          config.x < zone.x ||
          config.x > zone.x + zone.w ||
          config.y < zone.y ||
          config.y > zone.y + zone.h
        ) {
          throw new Error(
            `validateGroundScatterConfigs: band sprite ${config.spriteId} outside zone`,
          );
        }
      }
    }
  }
}

function randomIntInRange(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

function randomFloatInRange(rng: Rng, min: number, max: number): number {
  return min + rng() * (max - min);
}

function pickEdge(rng: Rng, weights: readonly [number, number, number, number]): number {
  const total = weights[0] + weights[1] + weights[2] + weights[3];
  let roll = rng() * total;
  for (let i = 0; i < 4; i++) {
    roll -= weights[i]!;
    if (roll < 0) {
      return i;
    }
  }
  return 0;
}

function placeOnEdge(
  rng: Rng,
  edge: number,
  edgeDistance: number,
  screenWidth: number,
  screenHeight: number,
  margin: number,
): { x: number; y: number } {
  const innerX = screenWidth - margin;
  const innerY = screenHeight - margin;
  switch (edge) {
    case 0:
      return { x: margin + edgeDistance, y: randomFloatInRange(rng, margin, innerY) };
    case 1:
      return { x: innerX - edgeDistance, y: randomFloatInRange(rng, margin, innerY) };
    case 2:
      return { x: randomFloatInRange(rng, margin, innerX), y: margin + edgeDistance };
    default:
      return { x: randomFloatInRange(rng, margin, innerX), y: innerY - edgeDistance };
  }
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

function rejectSample(
  rng: Rng,
  existing: readonly { x: number; y: number }[],
  minDistance: number,
  sample: (rng: Rng) => { x: number; y: number },
): { x: number; y: number } {
  for (let attempt = 0; attempt < MAX_PLACEMENT_ATTEMPTS; attempt++) {
    const pos = sample(rng);
    if (!tooClose(pos.x, pos.y, existing, minDistance)) {
      return pos;
    }
  }
  let bestDist = -1;
  let bestX = 0;
  let bestY = 0;
  for (let s = 0; s < 50; s++) {
    const pos = sample(rng);
    let minD = Infinity;
    for (const other of existing) {
      const dx = other.x - pos.x;
      const dy = other.y - pos.y;
      const d = dx * dx + dy * dy;
      if (d < minD) {
        minD = d;
      }
    }
    if (minD > bestDist) {
      bestDist = minD;
      bestX = pos.x;
      bestY = pos.y;
    }
  }
  return { x: bestX, y: bestY };
}

function buildSprite(
  rng: Rng,
  spriteId: number,
  x: number,
  y: number,
  input: GenerateGroundScatterConfigsInput,
): GroundScatterConfig {
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

function sampleEven(rng: Rng, input: GenerateGroundScatterConfigsInput): { x: number; y: number } {
  return {
    x: randomFloatInRange(rng, input.margin, input.screenWidth - input.margin),
    y: randomFloatInRange(rng, input.margin, input.screenHeight - input.margin),
  };
}

function sampleBand(rng: Rng, input: GenerateGroundScatterConfigsInput): { x: number; y: number } {
  const zone = input.zone;
  if (zone == null) {
    return sampleEven(rng, input);
  }
  return {
    x: randomFloatInRange(rng, zone.x, zone.x + zone.w),
    y: randomFloatInRange(rng, zone.y, zone.y + zone.h),
  };
}

function sampleEdge(
  rng: Rng,
  input: GenerateGroundScatterConfigsInput,
): { x: number; y: number } {
  const edge = pickEdge(rng, input.edgeWeights);
  const edgeDistance = Math.min(
    -input.edgeBandFalloff * Math.log(1 - rng()),
    input.maxEdgeDistance,
  );
  return placeOnEdge(rng, edge, edgeDistance, input.screenWidth, input.screenHeight, input.margin);
}

function samplePointInDisk(
  rng: Rng,
  center: { x: number; y: number },
  radius: number,
): { x: number; y: number } {
  for (let attempt = 0; attempt < 16; attempt++) {
    const dx = (rng() * 2 - 1) * radius;
    const dy = (rng() * 2 - 1) * radius;
    if (dx * dx + dy * dy <= radius * radius) {
      return { x: center.x + dx, y: center.y + dy };
    }
  }
  return { x: center.x, y: center.y };
}

export function generateGroundScatterConfigs(
  input: GenerateGroundScatterConfigsInput,
): GroundScatterConfig[] {
  if (input.count <= 0) {
    return [];
  }

  const configs: GroundScatterConfig[] = [];
  const placed: { x: number; y: number }[] = [];
  const variantCount = Math.max(1, Math.min(input.variantCount, 6));

  function sampleForKind(rng: Rng): { x: number; y: number } {
    if (input.kind === 'even') {
      return sampleEven(rng, input);
    }
    if (input.kind === 'band') {
      return sampleBand(rng, input);
    }
    return sampleEdge(rng, input);
  }

  const clamped = {
    ...input,
    variantCount,
  };

  let i = 0;
  while (i < clamped.count) {
    const remaining = clamped.count - i;
    if (
      clamped.kind === 'edge' &&
      remaining >= clamped.minClusterSize &&
      clamped.minClusterSize <= clamped.maxClusterSize &&
      clamped.rng() < clamped.clusterProbability
    ) {
      const clusterSize =
        remaining <= clamped.maxClusterSize
          ? remaining
          : randomIntInRange(
              clamped.rng,
              clamped.minClusterSize,
              Math.min(clamped.maxClusterSize, remaining - clamped.minClusterSize),
            );
      const anchor = rejectSample(clamped.rng, placed, clamped.minDistance, sampleForKind);
      const radius = randomFloatInRange(
        clamped.rng,
        clamped.clusterRadiusMin,
        clamped.clusterRadiusMax,
      );
      const clusterMembers: { x: number; y: number }[] = [];
      for (let m = 0; m < clusterSize; m++) {
        let px: number;
        let py: number;
        if (m === 0) {
          px = anchor.x;
          py = anchor.y;
        } else {
          const member = rejectSample(
            clamped.rng,
            clusterMembers,
            Math.min(clamped.clusterRadiusMax * 0.35, clamped.clusterRadiusMax),
            () => samplePointInDisk(clamped.rng, anchor, radius),
          );
          px = member.x;
          py = member.y;
        }
        px = Math.min(Math.max(px, 0), clamped.screenWidth);
        py = Math.min(Math.max(py, 0), clamped.screenHeight);
        clusterMembers.push({ x: px, y: py });
        configs.push(buildSprite(clamped.rng, configs.length, px, py, clamped));
      }
      for (const member of clusterMembers) {
        placed.push(member);
      }
      i += clusterSize;
    } else {
      const pos = rejectSample(clamped.rng, placed, clamped.minDistance, sampleForKind);
      placed.push(pos);
      configs.push(buildSprite(clamped.rng, configs.length, pos.x, pos.y, clamped));
      i += 1;
    }
  }

  validateGroundScatterConfigs(configs, input);
  return configs;
}
