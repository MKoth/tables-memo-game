/**
 * Screen-space jellyfish layout with strict grid order preservation.
 *
 * Column and row positions are computed as separate monotone axis arrays.
 * Gesture bias only changes gap sizes (wide near peak, tight at edges);
 * a jellyfish at gridCol 2 is always between cols 1 and 3 on screen.
 */

import type { LayoutBounds } from '../../../../core/layout/layoutBounds';
import { computeJellyfishFontScale } from '../../jellyfishVisualTokens';

export type { LayoutBounds } from '../../../../core/layout/layoutBounds';
export {
  LAYOUT_ZONE_HEIGHT_RATIO,
  LAYOUT_ZONE_TOP_RATIO,
} from '../../../../core/layout/zoneLayoutConstants';

export type LayoutParticle = {
  gridCol: number;
  gridRow: number;
  bellRadius: number;
};

/** Default fallbacks when sizing is not computed dynamically. */
export const SCALE_MIN = 0.8;
export const SCALE_MAX = 1.1;
export const EDGE_SQUEEZE = 0.30;
export const SPREAD_BOOST = 0.40;

/** Reference body bell size used for font scaling. */
export { REFERENCE_BODY_BELL_SIZE } from '../../jellyfishVisualTokens';

export type JellyfishSizing = {
  bodyBellSize: number;
  headerBellSize: number;
  scaleMin: number;
  scaleMax: number;
  edgeSqueeze: number;
  spreadBoost: number;
  fontScale: number;
};

export type JellyfishSizingInput = {
  zoneWidth: number;
  zoneHeight: number;
  nGridCols: number;
  nGridRows: number;
};

const BASE_DIAMETER_FRACTION = 1.1;
const HEADER_BELL_RATIO = 45 / 55;
const BODY_BELL_SIZE_MIN = 15;
const BODY_BELL_SIZE_MAX = 85;
const DENSITY_COUNT_MIN = 3;
const DENSITY_COUNT_MAX = 9;

function clamp(val: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, val));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Derive base bell sizes, gesture scale range, and packing density from
 * table grid dimensions and viewport. Uses the tighter axis pitch (most cells
 * in least space) as the constraining dimension.
 */
export function computeJellyfishSizing(input: JellyfishSizingInput): JellyfishSizing {
  const { zoneWidth, zoneHeight, nGridCols, nGridRows } = input;

  const pitchX = zoneWidth / nGridCols;
  const pitchY = zoneHeight / nGridRows;
  const pitch = Math.min(pitchX, pitchY);
  const dominantCount = pitchX <= pitchY ? nGridCols : nGridRows;

  const bodyBellSize = clamp(
    pitch * BASE_DIAMETER_FRACTION,
    BODY_BELL_SIZE_MIN,
    BODY_BELL_SIZE_MAX,
  );
  const headerBellSize = bodyBellSize * HEADER_BELL_RATIO;

  const d = clamp(
    (dominantCount - DENSITY_COUNT_MIN) / (DENSITY_COUNT_MAX - DENSITY_COUNT_MIN),
    0,
    1,
  );

  return {
    bodyBellSize,
    headerBellSize,
    scaleMin: lerp(0.85, 0.55, d),
    scaleMax: lerp(1.15, 1.35, d),
    edgeSqueeze: lerp(0.30, 0.45, d),
    spreadBoost: lerp(0.35, 0.45, d),
    fontScale: computeJellyfishFontScale(bodyBellSize),
  };
}

export function clampW(val: number, lo: number, hi: number): number {
  'worklet';
  return Math.max(lo, Math.min(hi, val));
}

/** Bias that centers the spacing peak on a grid slot (max scale for that axis). */
export function biasForGridSlot(slotIndex: number, slotCount: number): number {
  'worklet';
  if (slotCount <= 1) {
    return 0;
  }
  const t = slotIndex / (slotCount - 1);
  return clampW((t - 0.5) / 0.38, -1, 1);
}

function minNeighborGap(positions: number[], index: number): number {
  'worklet';
  const count = positions.length;
  if (count <= 1) {
    return positions[0] * 2;
  }
  let minGap = Infinity;
  if (index > 0) {
    minGap = positions[index] - positions[index - 1];
  }
  if (index < count - 1) {
    minGap = Math.min(minGap, positions[index + 1] - positions[index]);
  }
  return minGap;
}

function axisAdjacentGapExtents(
  positions: number[],
): { minGap: number; maxGap: number } {
  'worklet';
  const count = positions.length;
  if (count <= 1) {
    return { minGap: 1, maxGap: 1 };
  }
  let minGap = Infinity;
  let maxGap = 0;
  for (let i = 1; i < count; i++) {
    const g = positions[i] - positions[i - 1];
    if (g < minGap) {
      minGap = g;
    }
    if (g > maxGap) {
      maxGap = g;
    }
  }
  return { minGap, maxGap };
}

function gapToScaleRelative(
  gap: number,
  minGap: number,
  maxGap: number,
  scaleMin: number,
  scaleMax: number,
): number {
  'worklet';
  const span = maxGap - minGap;
  if (span <= 1e-4) {
    return (scaleMin + scaleMax) * 0.5;
  }
  const t = clampW((gap - minGap) / span, 0, 1);
  const eased = Math.pow(t, 0.85);
  return scaleMin + eased * (scaleMax - scaleMin);
}

/** Relative gap weight at normalized position t; largest near peak. */
function gapWeightAt(
  t: number,
  peak: number,
  edgeSqueeze: number,
  spreadBoost: number,
): number {
  'worklet';
  const distFromPeak = Math.abs(t - peak);
  const maxDist = Math.max(peak, 1 - peak);
  const edgeFactor = maxDist > 0 ? Math.min(1, distFromPeak / maxDist) : 0;
  const compression = Math.pow(edgeFactor, 1.35);
  const minW = 1 - edgeSqueeze * 0.85;
  const maxW = 1 + spreadBoost;
  return minW + (1 - compression) * (maxW - minW);
}

/**
 * Build strictly increasing axis positions for `count` grid slots.
 * Gaps between adjacent slots are wider near `peak` (0.5 + bias) and
 * narrower at the far edges (bells may overlap there).
 */
export function computeAxisPositions(
  count: number,
  spanMin: number,
  span: number,
  bias: number,
  edgeSqueeze: number,
  spreadBoost: number,
): number[] {
  'worklet';
  if (count <= 1) {
    return [spanMin + span * 0.5];
  }

  const peak = clampW(0.5 + bias * 0.38, 0.08, 0.92);
  const gapCount = count - 1;
  let totalWeight = 0;
  const gaps: number[] = [];

  for (let i = 0; i < gapCount; i++) {
    const midT = (i + 0.5) / gapCount;
    const w = gapWeightAt(midT, peak, edgeSqueeze, spreadBoost);
    gaps.push(w);
    totalWeight += w;
  }

  const positions: number[] = [spanMin];
  let acc = 0;

  for (let i = 1; i < count; i++) {
    acc += (gaps[i - 1] / totalWeight) * span;
    positions.push(spanMin + acc);
  }

  return positions;
}

export function computeLayoutPositions(
  particles: LayoutParticle[],
  bounds: LayoutBounds,
  biasX: number,
  biasY: number,
): { xs: number[]; ys: number[]; scales: number[] } {
  'worklet';
  const {
    width,
    zoneLeft,
    zoneTop,
    zoneHeight,
    nGridCols,
    nGridRows,
    scaleMin,
    scaleMax,
    edgeSqueeze,
    spreadBoost,
  } = bounds;

  let maxR = 0;
  for (let i = 0; i < particles.length; i++) {
    const rad = particles[i].bellRadius;
    if (rad > maxR) {
      maxR = rad;
    }
  }

  const xMin = zoneLeft + maxR;
  const xSpan = width - 2 * maxR;
  const yMin = zoneTop + maxR;
  const ySpan = zoneHeight - 2 * maxR;

  const colX = computeAxisPositions(
    nGridCols,
    xMin,
    xSpan,
    biasX,
    edgeSqueeze,
    spreadBoost,
  );
  const rowY = computeAxisPositions(
    nGridRows,
    yMin,
    ySpan,
    biasY,
    edgeSqueeze,
    spreadBoost,
  );

  const colGaps = axisAdjacentGapExtents(colX);
  const rowGaps = axisAdjacentGapExtents(rowY);

  const xs: number[] = [];
  const ys: number[] = [];
  const scales: number[] = [];

  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    const gc = p.gridCol;
    const gr = p.gridRow;

    xs.push(colX[gc]);
    ys.push(rowY[gr]);

    const gapX = minNeighborGap(colX, gc);
    const gapY = minNeighborGap(rowY, gr);
    const scaleX = gapToScaleRelative(
      gapX,
      colGaps.minGap,
      colGaps.maxGap,
      scaleMin,
      scaleMax,
    );
    const scaleY = gapToScaleRelative(
      gapY,
      rowGaps.minGap,
      rowGaps.maxGap,
      scaleMin,
      scaleMax,
    );
    scales.push((scaleX + scaleY) * 0.5);
  }

  return { xs, ys, scales };
}
