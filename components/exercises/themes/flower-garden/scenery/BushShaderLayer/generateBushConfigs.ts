import { leafSide, type Point2D } from './helpers/bezierMath';
import type { Rng } from './helpers/seededRandom';
import type {
  BushConfig,
  LeafConfig,
  LeafSide,
  StemConfig,
} from './types';
import { pickBushTints } from '../../carrier/FlowerGardenWordSpriteTableLayer/presets/roseTintPresets';
import type { ZoneRect } from '../../../../core';

export type { ZoneRect };

export type GenerateBushConfigsInput = {
  tableId: string;
  nRoses: number;
  roseIndices: readonly number[];
  roseGridPositions: readonly Point2D[];
  groundBand: ZoneRect;
  stemBaseSpreadRadius: number;
  stemBaseWidth: number;
  stemTopWidth: number;
  leavesPerStemRange: readonly [number, number];
  rng: Rng;
};

const LEAF_T_MIN = 0.05;
const LEAF_T_MAX = 0.95;
const LEAF_TILT_RANGE = Math.PI / 9;
const STEM_ARC_FRACTION = 0.4;
const DEFAULT_LEAF_SIZE = 24;
const ROSE_TINT_FALLBACK: [number, number, number] = [0.95, 0.18, 0.22];

function randomIntInRange(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

function randomInRange(rng: Rng, min: number, max: number): number {
  return min + (max - min) * rng();
}

function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = out[i]!;
    out[i] = out[j]!;
    out[j] = tmp;
  }
  return out;
}

function pointInRect(rng: Rng, rect: ZoneRect): Point2D {
  return {
    x: rect.x + rng() * rect.w,
    y: rect.y + rng() * rect.h,
  };
}

function pointInDisk(rng: Rng, center: Point2D, radius: number): Point2D {
  for (let attempt = 0; attempt < 16; attempt++) {
    const dx = (rng() * 2 - 1) * radius;
    const dy = (rng() * 2 - 1) * radius;
    if (dx * dx + dy * dy <= radius * radius) {
      return { x: center.x + dx, y: center.y + dy };
    }
  }
  return { x: center.x, y: center.y };
}

function buildLeaf(
  rng: Rng,
  base: Point2D,
  control: Point2D,
  top: Point2D,
  bushBase: Point2D,
): LeafConfig {
  const t = randomInRange(rng, LEAF_T_MIN, LEAF_T_MAX);
  const side: LeafSide = leafSide(t, base, control, top, bushBase);
  const tilt = randomInRange(rng, -LEAF_TILT_RANGE, LEAF_TILT_RANGE);
  const variant = randomIntInRange(rng, 0, 3) as 0 | 1 | 2 | 3;
  const size = DEFAULT_LEAF_SIZE * (1.2 + t);
  return { t, side, tilt, variant, size };
}

function buildStem(
  rng: Rng,
  roseIndex: number,
  roseRest: Point2D,
  bushBase: Point2D,
  stemBaseSpreadRadius: number,
  stemBaseWidth: number,
  stemTopWidth: number,
  leavesPerStem: number,
): StemConfig {
  const base = pointInDisk(rng, bushBase, stemBaseSpreadRadius);
  const top = roseRest;

  const baseToTopX = top.x - base.x;
  const baseToTopY = top.y - base.y;
  const len = Math.hypot(baseToTopX, baseToTopY);
  const perpX = len > 0 ? -baseToTopY / len : 0;
  const perpY = len > 0 ? baseToTopX / len : 0;

  const baseToBushX = bushBase.x - base.x;
  const baseToBushY = bushBase.y - base.y;
  const bushCross = baseToTopX * baseToBushY - baseToTopY * baseToBushX;
  const outerSign = bushCross >= 0 ? -1 : 1;

  const arcMagnitude = len * STEM_ARC_FRACTION;
  const control: Point2D = {
    x: base.x + baseToTopX * 0.5 + perpX * arcMagnitude * outerSign,
    y: base.y + baseToTopY * 0.5 + perpY * arcMagnitude * outerSign,
  };

  const leaves: LeafConfig[] = [];
  for (let i = 0; i < leavesPerStem; i++) {
    leaves.push(buildLeaf(rng, base, control, top, bushBase));
  }

  return {
    roseIndex,
    baseX: base.x,
    baseY: base.y,
    topX: top.x,
    topY: top.y,
    controlX: control.x,
    controlY: control.y,
    baseWidth: stemBaseWidth,
    topWidth: stemTopWidth,
    leaves,
  };
}

export function validateBushConfigs(
  configs: BushConfig[],
  input: GenerateBushConfigsInput,
): void {
  const allStems = configs.flatMap(b => b.stems);
  const assigned = new Set(allStems.map(s => s.roseIndex));
  if (assigned.size !== input.nRoses) {
    throw new Error(
      `Bush config validation for ${input.tableId}: expected ${input.nRoses} unique roses, got ${assigned.size}`,
    );
  }
  for (let i = 0; i < input.nRoses; i++) {
    if (!assigned.has(i)) {
      throw new Error(
        `Bush config validation for ${input.tableId}: rose index ${i} was not assigned`,
      );
    }
  }

  for (const bush of configs) {
    if (
      bush.baseX < input.groundBand.x - 1e-6 ||
      bush.baseX > input.groundBand.x + input.groundBand.w + 1e-6 ||
      bush.baseY < input.groundBand.y - 1e-6 ||
      bush.baseY > input.groundBand.y + input.groundBand.h + 1e-6
    ) {
      throw new Error(
        `Bush config validation for ${input.tableId}: bush ${bush.bushId} base (${bush.baseX}, ${bush.baseY}) is outside groundBand`,
      );
    }
  }

  for (const stem of allStems) {
    for (const leaf of stem.leaves) {
      if (leaf.t < LEAF_T_MIN - 1e-6 || leaf.t > LEAF_T_MAX + 1e-6) {
        throw new Error(
          `Bush config validation for ${input.tableId}: leaf t ${leaf.t} out of range [${LEAF_T_MIN}, ${LEAF_T_MAX}]`,
        );
      }
      if (leaf.side !== -1 && leaf.side !== 1) {
        throw new Error(
          `Bush config validation for ${input.tableId}: leaf side ${leaf.side} not in {-1, 1}`,
        );
      }
    }
  }
}

export function generateBushConfigs(
  input: GenerateBushConfigsInput,
): BushConfig[] {
  const {
    nRoses,
    roseIndices,
    roseGridPositions,
    groundBand,
    stemBaseSpreadRadius,
    stemBaseWidth,
    stemTopWidth,
    leavesPerStemRange,
    rng,
  } = input;

  if (nRoses <= 0) {
    return [];
  }

  const minBushes = Math.max(1, Math.ceil(nRoses / 6));
  const maxBushes = Math.max(1, Math.ceil(nRoses / 4));
  const bushCount = minBushes + Math.floor(rng() * (maxBushes - minBushes + 1));

  const shuffled = shuffle(roseIndices, rng);
  const bushes: BushConfig[] = [];

  for (let b = 0; b < bushCount; b++) {
    const sliceStart = Math.floor((b * shuffled.length) / bushCount);
    const sliceEnd = Math.floor(((b + 1) * shuffled.length) / bushCount);
    const slice = shuffled.slice(sliceStart, sliceEnd);
    if (slice.length === 0) continue;

    const bushBase = pointInRect(rng, groundBand);
    const stems: StemConfig[] = [];

    for (const roseIndex of slice) {
      const roseRest = roseGridPositions[roseIndex];
      if (roseRest == null) {
        throw new Error(
          `generateBushConfigs: no roseGridPosition for rose index ${roseIndex}`,
        );
      }
      const leavesPerStem = randomIntInRange(
        rng,
        leavesPerStemRange[0],
        leavesPerStemRange[1],
      );
      stems.push(
        buildStem(
          rng,
          roseIndex,
          roseRest,
          bushBase,
          stemBaseSpreadRadius,
          stemBaseWidth,
          stemTopWidth,
          leavesPerStem,
        ),
      );
    }

    bushes.push({
      bushId: bushes.length,
      baseX: bushBase.x,
      baseY: bushBase.y,
      tint: ROSE_TINT_FALLBACK,
      stems,
    });
  }

  const tints = pickBushTints(rng, bushes.length);
  bushes.forEach((bush, i) => {
    bush.tint = tints[i] ?? ROSE_TINT_FALLBACK;
  });

  validateBushConfigs(bushes, input);
  return bushes;
}
