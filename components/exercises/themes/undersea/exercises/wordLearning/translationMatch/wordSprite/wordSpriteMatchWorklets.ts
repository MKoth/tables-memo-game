import { TAP_HIT_RADIUS_PAD } from '../../../../carrier/WordSpriteTableLayer/config/wordSpriteTableLayerConfig';
import type { SharedValue } from 'react-native-reanimated';
import {
  WORD_SPRITE_TINT_PRESET_INDEX,
} from '../../../../carrier/WordSpriteTableLayer/presets/wordSpriteTintPresets';
import { triggerWordSpriteTintFlash } from '../../../../carrier/WordSpriteTableLayer/worklets/wordSpriteTableWorklets';

export function findMatchWordSpriteIndexAtTap(
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

export function triggerMatchWordSpriteFlash(
  hitIdx: number,
  isCorrect: boolean,
  tintFlashPreset: SharedValue<number[]>,
  tintFlashUntil: SharedValue<number[]>,
  clock: SharedValue<number>,
): void {
  'worklet';
  triggerWordSpriteTintFlash(
    hitIdx,
    isCorrect
      ? WORD_SPRITE_TINT_PRESET_INDEX.success
      : WORD_SPRITE_TINT_PRESET_INDEX.error,
    tintFlashPreset,
    tintFlashUntil,
    clock,
  );
}

export function triggerMatchWordSpritePrimaryFlash(
  hitIdx: number,
  tintFlashPreset: SharedValue<number[]>,
  tintFlashUntil: SharedValue<number[]>,
  clock: SharedValue<number>,
): void {
  'worklet';
  triggerWordSpriteTintFlash(
    hitIdx,
    WORD_SPRITE_TINT_PRESET_INDEX.primary,
    tintFlashPreset,
    tintFlashUntil,
    clock,
  );
}
