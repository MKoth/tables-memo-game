/**
 * Screen-space jellyfish layout with strict grid order preservation.
 *
 * Column and row positions are computed as separate monotone axis arrays.
 * Gesture bias only changes gap sizes (wide near peak, tight at edges);
 * a jellyfish at gridCol 2 is always between cols 1 and 3 on screen.
 */

export type LayoutParticle = {
  gridCol: number;
  gridRow: number;
  bellRadius: number;
};

/** Jellyfish occupy the top 40% — leaves room for camera/notch; koi use bottom half. */
export const LAYOUT_ZONE_TOP_RATIO = 0.05;
export const LAYOUT_ZONE_HEIGHT_RATIO = 0.45;

export type LayoutBounds = {
  width: number;
  height: number;
  nGridCols: number;
  nGridRows: number;
  /** Top edge of the layout zone in px. */
  zoneTop: number;
  /** Height of the layout zone in px. */
  zoneHeight: number;
};

/** Jellyfish/tentacle scale when packed tight (overlap). */
export const SCALE_MIN = 0.8;
/** Jellyfish/tentacle scale when spread apart. */
export const SCALE_MAX = 1.1;
/** How strongly edges compress toward overlap (0 = uniform, 1 = max squeeze at edges). */
export const EDGE_SQUEEZE = 0.30;
/** Extra spread multiplier at the spacing peak (center + bias). */
export const SPREAD_BOOST = 0.40;

function clampW(val: number, lo: number, hi: number): number {
  'worklet';
  return Math.max(lo, Math.min(hi, val));
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
): number {
  'worklet';
  const span = maxGap - minGap;
  if (span <= 1e-4) {
    return (SCALE_MIN + SCALE_MAX) * 0.5;
  }
  const t = clampW((gap - minGap) / span, 0, 1);
  const eased = Math.pow(t, 0.85);
  return SCALE_MIN + eased * (SCALE_MAX - SCALE_MIN);
}

/** Relative gap weight at normalized position t; largest near peak. */
function gapWeightAt(t: number, peak: number): number {
  'worklet';
  const distFromPeak = Math.abs(t - peak);
  const maxDist = Math.max(peak, 1 - peak);
  const edgeFactor = maxDist > 0 ? Math.min(1, distFromPeak / maxDist) : 0;
  const compression = Math.pow(edgeFactor, 1.35);
  const minW = 1 - EDGE_SQUEEZE * 0.85;
  const maxW = 1 + SPREAD_BOOST;
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
    const w = gapWeightAt(midT, peak);
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
  const { width, zoneTop, zoneHeight, nGridCols, nGridRows } = bounds;

  let maxR = 0;
  for (let i = 0; i < particles.length; i++) {
    const rad = particles[i].bellRadius;
    if (rad > maxR) {
      maxR = rad;
    }
  }

  const xMin = maxR;
  const xSpan = width - 2 * maxR;
  const yMin = zoneTop + maxR;
  const ySpan = zoneHeight - 2 * maxR;

  const colX = computeAxisPositions(nGridCols, xMin, xSpan, biasX);
  const rowY = computeAxisPositions(nGridRows, yMin, ySpan, biasY);

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
    const scaleX = gapToScaleRelative(gapX, colGaps.minGap, colGaps.maxGap);
    const scaleY = gapToScaleRelative(gapY, rowGaps.minGap, rowGaps.maxGap);
    scales.push((scaleX + scaleY) * 0.5);
  }

  return { xs, ys, scales };
}
