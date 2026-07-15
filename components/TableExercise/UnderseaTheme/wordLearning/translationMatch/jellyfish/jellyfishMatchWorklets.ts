import { TAP_HIT_RADIUS_PAD } from '../../../jellyfish/JellyfishTableLayer/config/jellyfishTableLayerConfig';
import type { SharedValue } from 'react-native-reanimated';
import {
  JELLYFISH_TINT_PRESET_INDEX,
} from '../../../jellyfish/JellyfishTableLayer/presets/jellyfishTintPresets';
import { triggerJellyfishTintFlash } from '../../../jellyfish/JellyfishTableLayer/worklets/jellyfishTableWorklets';

export function findMatchJellyfishIndexAtTap(
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

export function triggerMatchJellyfishFlash(
  hitIdx: number,
  isCorrect: boolean,
  tintFlashPreset: SharedValue<number[]>,
  tintFlashUntil: SharedValue<number[]>,
  clock: SharedValue<number>,
): void {
  'worklet';
  triggerJellyfishTintFlash(
    hitIdx,
    isCorrect
      ? JELLYFISH_TINT_PRESET_INDEX.success
      : JELLYFISH_TINT_PRESET_INDEX.error,
    tintFlashPreset,
    tintFlashUntil,
    clock,
  );
}

export function triggerMatchJellyfishPrimaryFlash(
  hitIdx: number,
  tintFlashPreset: SharedValue<number[]>,
  tintFlashUntil: SharedValue<number[]>,
  clock: SharedValue<number>,
): void {
  'worklet';
  triggerJellyfishTintFlash(
    hitIdx,
    JELLYFISH_TINT_PRESET_INDEX.primary,
    tintFlashPreset,
    tintFlashUntil,
    clock,
  );
}
