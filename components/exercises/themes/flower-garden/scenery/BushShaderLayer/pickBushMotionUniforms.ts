import {
  MAX_LEAVES_PER_STEM,
  MAX_STEMS_PER_BUSH,
  type BushConfig,
  type BushUniforms,
} from './types';
import { roseBushUniformDefaults } from '../../shaders/roseBush.sksl';

const LEAF_SLOTS = MAX_STEMS_PER_BUSH * MAX_LEAVES_PER_STEM;

export type LayoutSnapshot = {
  x: readonly number[];
  y: readonly number[];
  scale: readonly number[];
};

function padArray(arr: readonly number[], target: number, fill = 0): number[] {
  'worklet';
  return [
    ...arr,
    ...Array(Math.max(0, target - arr.length)).fill(fill),
  ];
}

export function pickBushMotionUniforms(
  bush: BushConfig,
  layout: LayoutSnapshot,
  roseBellSizes: readonly number[],
): BushUniforms {
  'worklet';
  const stemBaseX: number[] = [];
  const stemBaseY: number[] = [];
  const stemControlX: number[] = [];
  const stemControlY: number[] = [];
  const stemBaseWidth: number[] = [];
  const stemTopWidth: number[] = [];
  const stemCalyxSize: number[] = [];
  const stemLeafCount: number[] = [];
  const restX: number[] = [];
  const restY: number[] = [];
  const layoutX: number[] = [];
  const layoutY: number[] = [];
  const layoutScale: number[] = [];
  const leafT: number[] = [];
  const leafSide: number[] = [];
  const leafTilt: number[] = [];
  const leafVariant: number[] = [];
  const leafSize: number[] = [];

  for (const stem of bush.stems) {
    const cellIndex = stem.roseIndex;
    const liveX = layout.x[cellIndex] ?? 0;
    const liveY = layout.y[cellIndex] ?? 0;
    const liveScale = layout.scale[cellIndex] ?? 1;
    const bellSize = roseBellSizes[cellIndex] ?? 0;
    const calyxBaseSize = bellSize * roseBushUniformDefaults.calyxSizeFraction;

    stemBaseX.push(stem.baseX);
    stemBaseY.push(stem.baseY);
    stemControlX.push(stem.controlX);
    stemControlY.push(stem.controlY);
    stemBaseWidth.push(stem.baseWidth);
    stemTopWidth.push(stem.topWidth);
    stemCalyxSize.push(calyxBaseSize);
    stemLeafCount.push(stem.leaves.length);
    restX.push(stem.topX);
    restY.push(stem.topY);
    layoutX.push(liveX);
    layoutY.push(liveY);
    layoutScale.push(liveScale);

    for (const leaf of stem.leaves) {
      leafT.push(leaf.t);
      leafSide.push(leaf.side);
      leafTilt.push(leaf.tilt);
      leafVariant.push(leaf.variant);
      leafSize.push(leaf.size);
    }
  }

  return {
    stemCount: bush.stems.length,
    stemBaseX: padArray(stemBaseX, MAX_STEMS_PER_BUSH),
    stemBaseY: padArray(stemBaseY, MAX_STEMS_PER_BUSH),
    stemControlX: padArray(stemControlX, MAX_STEMS_PER_BUSH),
    stemControlY: padArray(stemControlY, MAX_STEMS_PER_BUSH),
    stemBaseWidth: padArray(stemBaseWidth, MAX_STEMS_PER_BUSH),
    stemTopWidth: padArray(stemTopWidth, MAX_STEMS_PER_BUSH),
    stemCalyxSize: padArray(stemCalyxSize, MAX_STEMS_PER_BUSH),
    stemLeafCount: padArray(stemLeafCount, MAX_STEMS_PER_BUSH),
    restX: padArray(restX, MAX_STEMS_PER_BUSH),
    restY: padArray(restY, MAX_STEMS_PER_BUSH),
    layoutX: padArray(layoutX, MAX_STEMS_PER_BUSH),
    layoutY: padArray(layoutY, MAX_STEMS_PER_BUSH),
    layoutScale: padArray(layoutScale, MAX_STEMS_PER_BUSH),
    leafT: padArray(leafT, LEAF_SLOTS),
    leafSide: padArray(leafSide, LEAF_SLOTS),
    leafTilt: padArray(leafTilt, LEAF_SLOTS),
    leafVariant: padArray(leafVariant, LEAF_SLOTS),
    leafSize: padArray(leafSize, LEAF_SLOTS),
  };
}
