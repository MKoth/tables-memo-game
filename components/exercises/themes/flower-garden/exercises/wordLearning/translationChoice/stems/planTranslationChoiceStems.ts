import { createRng, hashSeedString } from '../../../../scenery/BushShaderLayer/helpers/seededRandom';
import { MAX_LEAVES_PER_STEM, MIN_LEAVES_PER_STEM, type BushConfig, type StemConfig } from '../../../../scenery/BushShaderLayer/types';
import { pickBushTints } from '../../../../carrier/FlowerGardenWordSpriteTableLayer/presets/roseTintPresets';

export type PlanTranslationChoiceStemsInput = {
  roundPos: number;
  screenWidth: number;
  screenHeight: number;
  slotCenters: readonly { x: number; y: number }[];
};

export const STEM_ARC_FRACTION = 0.4;
export const STEM_ANCHOR_MARGIN = 30;
export const STEM_ANCHOR_PADDING = 0.08;
export const STEM_BASE_WIDTH = 16;
export const STEM_TOP_WIDTH = 3.5;
export const STEM_LEAF_SIZE = 27;

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
 * Per-round stem plan for the translation choice options: one bush per option
 * rose with a single stem anchored below the screen bottom, so the stem base
 * stays off-screen (rooted in the ground) while the attached rose floats above
 * it. Re-planned per round (respawn) with a deterministic seed.
 */
export function planTranslationChoiceStems(
  input: PlanTranslationChoiceStemsInput,
): BushConfig[] {
  const { roundPos, screenWidth, screenHeight, slotCenters } = input;
  if (slotCenters.length === 0) {
    return [];
  }

  const rng = createRng(
    hashSeedString(`translation-choice-stems:${roundPos}:${slotCenters.length}`),
  );

  const plans: BushConfig[] = [];
  for (let slot = 0; slot < slotCenters.length; slot++) {
    const rest = slotCenters[slot] ?? { x: screenWidth * 0.5, y: screenHeight * 0.5 };
    const baseX =
      (STEM_ANCHOR_PADDING +
        ((slot + 0.5 + (rng() - 0.5) * 0.6) / slotCenters.length) *
          (1 - 2 * STEM_ANCHOR_PADDING)) *
      screenWidth;
    const baseY = screenHeight + STEM_ANCHOR_MARGIN;

    const baseToTopX = rest.x - baseX;
    const baseToTopY = rest.y - baseY;
    const len = Math.hypot(baseToTopX, baseToTopY) || 1;
    const perpX = -baseToTopY / len;
    const perpY = baseToTopX / len;
    const outerSign = rng() < 0.5 ? -1 : 1;
    const arcMagnitude = len * STEM_ARC_FRACTION;
    const control: { x: number; y: number } = {
      x: baseX + baseToTopX * 0.5 + perpX * arcMagnitude * outerSign,
      y: baseY + baseToTopY * 0.5 + perpY * arcMagnitude * outerSign,
    };

    const leavesPerStem = randomIntInRange(
      rng,
      MIN_LEAVES_PER_STEM,
      MAX_LEAVES_PER_STEM,
    );
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
      bushId: slot,
      baseX,
      baseY,
      tint: pickBushTints(rng, 1)[0] ?? [1, 0.28, 0.2],
      stems: [
        {
          roseIndex: slot,
          baseX,
          baseY,
          topX: rest.x,
          topY: rest.y,
          controlX: control.x,
          controlY: control.y,
          baseWidth: STEM_BASE_WIDTH,
          topWidth: STEM_TOP_WIDTH,
          leaves,
        },
      ],
    });
  }

  return plans;
}
