import { createRng, hashSeedString } from '../../../../scenery/BushShaderLayer/helpers/seededRandom';
import { MAX_LEAVES_PER_STEM, MIN_LEAVES_PER_STEM, type BushConfig, type StemConfig } from '../../../../scenery/BushShaderLayer/types';
import { pickBushTints } from '../../../../carrier/FlowerGardenWordSpriteTableLayer/presets/roseTintPresets';
import type { FlowerGardenMatchRoseSide } from './planFlowerGardenMatchRoseLayout';

export type FlowerGardenMatchStemRose = {
  index: number;
  x: number;
  y: number;
  side: FlowerGardenMatchRoseSide;
};

export type PlanFlowerGardenMatchStemsInput = {
  seedKey: string;
  screenWidth: number;
  screenHeight: number;
  roses: readonly FlowerGardenMatchStemRose[];
};

export const STEM_ARC_FRACTION = 0.4;
export const STEM_ANCHOR_MARGIN = 30;
export const STEM_LEAF_SIZE = 27;
/** Stem width at the ground anchor for bottom roses. */
export const STEM_GROUND_BASE_WIDTH = 16;
/** Stem width at the rose for top-hanging roses. */
export const STEM_HANG_BASE_WIDTH = 3.5;

const LEAF_T_MIN = 0.05;
const LEAF_T_MAX = 0.95;
const LEAF_TILT_RANGE = Math.PI / 9;

function randomIntInRange(rng: () => number, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

function randomInRange(rng: () => number, min: number, max: number): number {
  return min + (max - min) * rng();
}

/**
 * Per-layout stem plan for the translation match roses: one bush per rose with
 * a single stem anchored off-screen — above the screen top for the top-hanging
 * roses, below the screen bottom for the bottom-growing roses. Deterministic
 * per seed so the layout is stable for the whole session.
 */
export function planFlowerGardenMatchStems(
  input: PlanFlowerGardenMatchStemsInput,
): BushConfig[] {
  const { seedKey, screenHeight, roses } = input;
  if (roses.length === 0) {
    return [];
  }

  const rng = createRng(hashSeedString(seedKey));

  const plans: BushConfig[] = [];
  for (const rose of roses) {
    const anchoredTop = rose.side === 'top';
    const baseX = rose.x + (rng() - 0.5) * 20;
    const baseY = anchoredTop ? -STEM_ANCHOR_MARGIN : screenHeight + STEM_ANCHOR_MARGIN;

    const baseToTopX = rose.x - baseX;
    const baseToTopY = rose.y - baseY;
    const len = Math.hypot(baseToTopX, baseToTopY) || 1;
    const perpX = -baseToTopY / len;
    const perpY = baseToTopX / len;
    const outerSign = rng() < 0.5 ? -1 : 1;
    const arcMagnitude = len * STEM_ARC_FRACTION;
    const control: { x: number; y: number } = {
      x: baseX + baseToTopX * 0.5 + perpX * arcMagnitude * outerSign,
      y: baseY + baseToTopY * 0.5 + perpY * arcMagnitude * outerSign,
    };

    const leavesPerStem = randomIntInRange(rng, MIN_LEAVES_PER_STEM, MAX_LEAVES_PER_STEM);
    const leaves: StemConfig['leaves'] = [];
    for (let i = 0; i < leavesPerStem; i++) {
      const t = randomInRange(rng, LEAF_T_MIN, LEAF_T_MAX);
      leaves.push({
        t,
        side: rng() < 0.5 ? -1 : 1,
        tilt: randomInRange(rng, -LEAF_TILT_RANGE, LEAF_TILT_RANGE),
        variant: randomIntInRange(rng, 0, 3) as 0 | 1 | 2 | 3,
        size: STEM_LEAF_SIZE * (1.2 + t),
      });
    }

    plans.push({
      bushId: rose.index,
      baseX,
      baseY,
      tint: pickBushTints(rng, 1)[0] ?? [1, 0.28, 0.2],
      stems: [
        {
          roseIndex: rose.index,
          baseX,
          baseY,
          topX: rose.x,
          topY: rose.y,
          controlX: control.x,
          controlY: control.y,
          baseWidth: anchoredTop ? STEM_HANG_BASE_WIDTH : STEM_GROUND_BASE_WIDTH,
          topWidth: anchoredTop ? STEM_GROUND_BASE_WIDTH : STEM_HANG_BASE_WIDTH,
          leaves,
        },
      ],
    });
  }

  return plans;
}
