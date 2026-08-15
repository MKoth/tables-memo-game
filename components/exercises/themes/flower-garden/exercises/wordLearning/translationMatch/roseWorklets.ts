import type { SharedValue } from 'react-native-reanimated';
import { TAP_HIT_RADIUS_PAD } from '../../../carrier/FlowerGardenWordSpriteTableLayer/config/flowerTableLayerConfig';
import { ROSE_FLASH_PRESETS } from '../../../carrier/FlowerGardenWordSpriteTableLayer/presets/roseFlashPresets';
import { triggerRoseTintFlash } from '../../../carrier/FlowerGardenWordSpriteTableLayer/worklets/roseTableWorklets';
import { OrbPhase, type OrbAnimState } from '../../../orb/orbAnimTypes';

/** Extra reach around the orb edge for release taps. */
export const ORB_TAP_HIT_PAD = 14;

export function findFlowerMatchRoseIndexAtTap(
  tapX: number,
  tapY: number,
  bellSizes: number[],
  xs: number[],
  ys: number[],
  scales: number[],
  matchedIndices: number[],
): number {
  'worklet';
  let bestIdx = -1;
  let bestDist = Infinity;
  for (let i = 0; i < bellSizes.length; i++) {
    let isMatched = false;
    for (let m = 0; m < matchedIndices.length; m++) {
      if (matchedIndices[m] === i) {
        isMatched = true;
        break;
      }
    }
    if (isMatched) {
      continue;
    }
    const cx = xs[i] ?? 0;
    const cy = ys[i] ?? 0;
    const scale = scales[i] ?? 1;
    const radius = (bellSizes[i] * scale * TAP_HIT_RADIUS_PAD) / 2;
    const dist = Math.hypot(tapX - cx, tapY - cy);
    if (dist <= radius && dist < bestDist) {
      bestDist = dist;
      bestIdx = i;
    }
  }
  return bestIdx;
}

export function triggerFlowerMatchRoseFlash(
  hitIdx: number,
  isCorrect: boolean,
  tintFlashPreset: SharedValue<number[]>,
  tintFlashUntil: SharedValue<number[]>,
  clock: SharedValue<number>,
): void {
  'worklet';
  triggerRoseTintFlash(
    hitIdx,
    isCorrect ? ROSE_FLASH_PRESETS.success : ROSE_FLASH_PRESETS.error,
    tintFlashPreset,
    tintFlashUntil,
    clock,
  );
}

export function triggerFlowerMatchRosePrimaryFlash(
  hitIdx: number,
  tintFlashPreset: SharedValue<number[]>,
  tintFlashUntil: SharedValue<number[]>,
  clock: SharedValue<number>,
): void {
  'worklet';
  triggerRoseTintFlash(
    hitIdx,
    ROSE_FLASH_PRESETS.primary,
    tintFlashPreset,
    tintFlashUntil,
    clock,
  );
}

export function isTapInsideFlowerOrb(
  tapX: number,
  tapY: number,
  phase: number,
  anim: OrbAnimState,
): boolean {
  'worklet';
  if (phase !== OrbPhase.Idle) {
    return false;
  }
  const radius = anim.targetDiameter * 0.5 + ORB_TAP_HIT_PAD;
  return Math.hypot(tapX - anim.centerX, tapY - anim.centerY) <= radius;
}
