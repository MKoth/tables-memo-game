import { createRng, hashSeedString } from '../../../../scenery/BushShaderLayer/helpers/seededRandom';

export type FlowerGardenMatchRoseSide = 'top' | 'bottom';

export type FlowerGardenMatchRosePlan = {
  /** Static center of each rose (index-aligned with the words prop). */
  roseCenters: { x: number; y: number; side: FlowerGardenMatchRoseSide }[];
  /** Rose bud size per index. */
  bellSizes: number[];
};

export type PlanFlowerGardenMatchRoseLayoutInput = {
  count: number;
  screenWidth: number;
  screenHeight: number;
  orbCenterX: number;
  orbCenterY: number;
  orbRadius: number;
  /** Deterministic seed; default varies with nothing (stable per screen). */
  seedKey?: string;
};

export const MATCH_ROSE_SIZE_MIN = 55;
export const MATCH_ROSE_SIZE_MAX = 90;
/** Row depth of the top roses inside the top half. */
export const MATCH_ROSE_TOP_ROW_Y_RATIO = 0.2;
/** Row depth of the bottom roses inside the bottom half. */
export const MATCH_ROSE_BOTTOM_ROW_Y_RATIO = 0.8;
/** Horizontal inset of the rose row spread. */
export const MATCH_ROSE_X_PAD_RATIO = 0.08;
/** Peak vertical offset of each rose from its row (fraction of screen height). */
export const MATCH_ROSE_ROW_JITTER_RATIO = 0.07;
/** Extra clearance between a rose's edge and the orb keep-out disk. */
export const MATCH_ROSE_KEEP_OUT_PAD = 12;
/** Minimum distance a rose center can sit from a screen edge. */
export const MATCH_ROSE_EDGE_MARGIN = 10;

/**
 * Static layout for the translation match roses: the word tokens never move,
 * so positions are planned once per layout. The first half of the roses hangs
 * from the top of the screen, the second half grows from the bottom. Each rose
 * is jittered off its row so the tokens don't line up, and every rose stays
 * clear of the center keep-out disk (the capture orb), with a deterministic
 * outward push when the screen is short enough for overlap.
 */
export function planFlowerGardenMatchRoseLayout(
  input: PlanFlowerGardenMatchRoseLayoutInput,
): FlowerGardenMatchRosePlan {
  const { count, screenWidth: w, screenHeight: h } = input;
  const cx = input.orbCenterX;
  const cy = input.orbCenterY;
  const orbRadius = input.orbRadius;

  const rng = createRng(hashSeedString(input.seedKey ?? 'flower-garden-match-roses'));
  const topCount = Math.ceil(count / 2);
  const bottomCount = count - topCount;
  const xPad = w * MATCH_ROSE_X_PAD_RATIO;

  const roseCenters: { x: number; y: number; side: FlowerGardenMatchRoseSide }[] = [];
  const bellSizes: number[] = [];

  const placeRow = (
    startIndex: number,
    n: number,
    side: FlowerGardenMatchRoseSide,
    rowY: number,
  ) => {
    for (let i = 0; i < n; i++) {
      const index = startIndex + i;
      const spread = (i + 0.5 + (rng() - 0.5) * 0.6) / n;
      const x = xPad + spread * (w - xPad * 2);
      const jitter = (rng() - 0.5) * 2 * MATCH_ROSE_ROW_JITTER_RATIO * h;
      roseCenters[index] = { x, y: rowY + jitter, side };
      bellSizes[index] = MATCH_ROSE_SIZE_MIN + rng() * (MATCH_ROSE_SIZE_MAX - MATCH_ROSE_SIZE_MIN);
    }
  };

  placeRow(0, topCount, 'top', h * MATCH_ROSE_TOP_ROW_Y_RATIO);
  placeRow(topCount, bottomCount, 'bottom', h * MATCH_ROSE_BOTTOM_ROW_Y_RATIO);

  for (let index = 0; index < count; index++) {
    const rose = roseCenters[index]!;
    const roseRadius = bellSizes[index]! / 2;
    const minDist = orbRadius + roseRadius + MATCH_ROSE_KEEP_OUT_PAD;
    const dx = rose.x - cx;
    const dy = rose.y - cy;
    const dist = Math.hypot(dx, dy);
    if (dist >= minDist) {
      continue;
    }

    const minY = roseRadius + MATCH_ROSE_EDGE_MARGIN;
    const maxY = h - roseRadius - MATCH_ROSE_EDGE_MARGIN;
    const pushSign = rose.side === 'top' ? -1 : 1;

    const verticalPushY = cy + pushSign * Math.sqrt(Math.max(0, minDist * minDist - dx * dx));
    const pushedY = Math.min(maxY, Math.max(minY, verticalPushY));
    if (Math.hypot(dx, pushedY - cy) >= minDist) {
      rose.y = pushedY;
      continue;
    }

    const sign = dx >= 0 ? 1 : -1;
    const horizontalPushX = cx + sign * Math.sqrt(Math.max(0, minDist * minDist - dy * dy));
    rose.x = Math.min(w - roseRadius, Math.max(roseRadius, horizontalPushX));
  }

  return { roseCenters, bellSizes };
}
